import ipaddress
import socket
from urllib.parse import urlparse
import tldextract


class SecurityValidationError(Exception):
    """Raised when a URL fails safety or SSRF validation checks."""
    pass


# Private, loopback, and cloud metadata network ranges to block
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),       # Carrier-grade NAT
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local / Cloud metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),      # Private class B
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),     # Private class C
    ipaddress.ip_network("198.18.0.0/15"),      # Benchmark testing
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    ipaddress.ip_network("::1/128"),            # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),          # IPv6 Link-local
]


def is_ip_blocked(ip_str: str) -> bool:
    """Check if an IP address falls within private, loopback, or reserved ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in BLOCKED_NETWORKS)
    except ValueError:
        return False


def normalize_and_validate_target(raw_url: str) -> dict:
    """
    Sanitizes, canonicalizes, and verifies a URL for safe threat investigation.
    Guarantees strict SSRF protection and domain extraction.
    """
    cleaned = raw_url.strip()
    if not cleaned:
        raise SecurityValidationError("Target URL or domain cannot be empty.")

    # Prepend https scheme if not provided
    if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
        cleaned = f"https://{cleaned}"

    parsed = urlparse(cleaned)
    hostname = parsed.hostname

    if not hostname:
        raise SecurityValidationError("Invalid URL format: Unable to extract a valid hostname.")

    hostname = hostname.lower().strip(".")

    # Disallow localhost and common local hostnames
    if hostname in ("localhost", "local", "broadcasthost", "ip6-localhost", "ip6-loopback"):
        raise SecurityValidationError(f"Target '{hostname}' is a reserved local address and cannot be scanned.")

    # Check direct IP addresses
    if is_ip_blocked(hostname):
        raise SecurityValidationError(f"Target IP '{hostname}' belongs to a private, loopback, or reserved network.")

    # Extract domain components via tldextract
    extracted = tldextract.extract(hostname)
    if not extracted.suffix and not (extracted.domain and extracted.domain.isdigit()):
        # Check if it's a valid public IP
        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            raise SecurityValidationError(f"Domain '{hostname}' does not possess a valid public top-level domain (TLD).")

    reg_domain = getattr(extracted, "top_domain_under_public_suffix", None) or extracted.registered_domain or hostname
    registered_domain = reg_domain

    # Resolve hostname to verify destination IP does not map to private SSRF ranges
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        ips = [ai[4][0] for ai in addr_info if ai[4]]
        for ip in ips:
            if is_ip_blocked(ip):
                raise SecurityValidationError(
                    f"Security Guardrail: Hostname '{hostname}' resolves to private/internal IP {ip}. Request blocked."
                )
    except socket.gaierror:
        # We allow investigation to continue for DNS resolution error reporting in dns_service
        pass

    return {
        "original_input": raw_url,
        "canonical_url": f"{parsed.scheme}://{hostname}{parsed.path or '/'}",
        "scheme": parsed.scheme,
        "hostname": hostname,
        "port": parsed.port or (443 if parsed.scheme == "https" else 80),
        "path": parsed.path or "/",
        "subdomain": extracted.subdomain,
        "domain": extracted.domain,
        "suffix": extracted.suffix,
        "registered_domain": registered_domain,
    }
