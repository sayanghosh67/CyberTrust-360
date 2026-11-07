import ssl
import socket
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.app.schemas.scan import SSLAnalysis
from backend.app.utils.security import connect_public


async def inspect_ssl(hostname: str, port: int = 443) -> SSLAnalysis:
    """Non-blocking inspection of SSL/TLS certificate configuration and cipher suite."""
    try:
        return await asyncio.wait_for(asyncio.to_thread(_sync_inspect_ssl, hostname, port), timeout=6.0)
    except TimeoutError:
        return SSLAnalysis(error_message="TLS inspection deadline exceeded.")


def _sync_inspect_ssl(hostname: str, port: int = 443) -> SSLAnalysis:
    context = ssl.create_default_context()
    context.timeout = 4.0

    try:
        with connect_public(hostname, port, timeout=4.0) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                protocol = ssock.version()
                cipher = ssock.cipher()
                cipher_str = cipher[0] if cipher else None

                if not cert:
                    return SSLAnalysis(
                        https_available=True,
                        valid=False,
                        error_message="Peer provided no SSL certificate.",
                    )

                # Parse Expiry
                not_after_str = cert.get("notAfter")
                days_remaining = None
                expired = False
                if not_after_str:
                    # Format: 'May 10 12:00:00 2026 GMT'
                    expiry_date = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    now_utc = datetime.now(timezone.utc)
                    delta = expiry_date - now_utc
                    days_remaining = delta.days
                    expired = days_remaining < 0

                # Parse Issuer
                issuer_dict: Dict[str, str] = {}
                for rdn in cert.get("issuer", ()):
                    for key, val in rdn:
                        if key == "organizationName":
                            issuer_dict["organization"] = val
                        elif key == "commonName":
                            issuer_dict["common_name"] = val
                        elif key == "countryName":
                            issuer_dict["country"] = val

                # Parse Subject & Alternative Names
                subject_dict: Dict[str, Any] = {}
                for rdn in cert.get("subject", ()):
                    for key, val in rdn:
                        if key == "commonName":
                            subject_dict["common_name"] = val

                alt_names: List[str] = [val for typ, val in cert.get("subjectAltName", ()) if typ == "DNS"]
                subject_dict["alt_names"] = alt_names

                # default_context already validates SAN/IP identity and certificate trust.
                hostname_mismatch = False

                valid = not expired and not hostname_mismatch

                return SSLAnalysis(
                    https_available=True,
                    valid=valid,
                    expired=expired,
                    days_remaining=days_remaining,
                    issuer=issuer_dict,
                    subject=subject_dict,
                    protocol=protocol,
                    cipher=cipher_str,
                    hostname_mismatch=hostname_mismatch,
                    error_message=None if valid else ("Certificate expired" if expired else "Hostname mismatch"),
                )

    except ssl.SSLCertVerificationError as err:
        return SSLAnalysis(
            https_available=True,
            valid=False,
            expired=False,
            error_message=f"TLS Certificate Verification Error: {err.verify_message}",
        )
    except ssl.SSLError as err:
        return SSLAnalysis(
            https_available=True,
            valid=False,
            error_message="TLS handshake failed",
        )
    except socket.gaierror as err:
        return SSLAnalysis(
            https_available=False,
            valid=False,
            error_message="Host unreachable (DNS resolution failed for target host).",
        )
    except (socket.timeout, TimeoutError):
        return SSLAnalysis(
            https_available=False,
            valid=False,
            error_message="HTTPS connection timed out on the target port (host unreachable or filtered).",
        )
    except ConnectionRefusedError:
        return SSLAnalysis(
            https_available=False,
            valid=False,
            error_message="Target port refused connection. Host does not accept HTTPS connections.",
        )
    except Exception as exc:
        return SSLAnalysis(
            https_available=False,
            valid=False,
            error_message="TLS session unavailable or blocked by network policy",
        )
