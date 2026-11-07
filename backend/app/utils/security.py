"""Target validation and pinned outbound sockets. Never resolve again at connect time."""
import ipaddress
import socket
import concurrent.futures
import threading
from urllib.parse import urlsplit, urlunsplit
import tldextract

_extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)

_dns_pool = concurrent.futures.ThreadPoolExecutor(max_workers=8, thread_name_prefix="ct360-dns")
_dns_slots = threading.BoundedSemaphore(8)

class SecurityValidationError(ValueError):
    pass


def is_ip_blocked(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value.split('%')[0])
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if isinstance(ip, ipaddress.IPv6Address) and any(ip in ipaddress.ip_network(net) for net in ("64:ff9b::/96", "64:ff9b:1::/48", "2002::/16", "2001::/32")):
            return True
        return not ip.is_global or ip.is_multicast or ip.is_unspecified
    except ValueError:
        return False  # Domain names are checked by resolve_public_addresses.


def resolve_public_addresses(hostname: str, port: int):
    if hostname.lower().rstrip('.') in {'localhost', 'local', 'broadcasthost', 'ip6-localhost', 'ip6-loopback'} or '%' in hostname:
        raise SecurityValidationError('Reserved local address is blocked.')
    if is_ip_blocked(hostname):
        raise SecurityValidationError('Private, loopback or reserved address is blocked.')
    if not _dns_slots.acquire(blocking=False):
        raise socket.gaierror('DNS resolver capacity reached')
    future = _dns_pool.submit(socket.getaddrinfo, hostname, port, type=socket.SOCK_STREAM)
    future.add_done_callback(lambda done: _dns_slots.release())
    try:
        addresses = future.result(timeout=3)
    except concurrent.futures.TimeoutError:
        raise socket.gaierror('DNS resolution deadline exceeded') from None
    if not addresses:
        raise socket.gaierror('No public addresses resolved')
    if any(is_ip_blocked(item[4][0]) for item in addresses):
        raise SecurityValidationError('DNS returned a private or reserved destination; request blocked.')
    return addresses


def connect_public(hostname: str, port: int, timeout: float = 4.0):
    """Connect to a numeric sockaddr already validated; preserve hostname separately for SNI."""
    addresses = resolve_public_addresses(hostname, port)
    family, socktype, proto, _, sockaddr = addresses[0]
    sock = socket.socket(family, socktype, proto)
    try:
        sock.settimeout(timeout)
        sock.connect(sockaddr)
        peer = sock.getpeername()[0]
        if is_ip_blocked(peer) or ipaddress.ip_address(peer) != ipaddress.ip_address(sockaddr[0]):
            raise SecurityValidationError('Connected peer does not match validated public address.')
        return sock
    except BaseException:
        sock.close()
        raise


def is_target_host_blocked(hostname: str) -> bool:
    try:
        resolve_public_addresses(hostname, 443)
        return False
    except SecurityValidationError:
        return True
    except socket.gaierror:
        return False  # DNS failure is unknown, never a successful connection.


def normalize_and_validate_target(raw_url: str) -> dict:
    cleaned = raw_url.strip()
    if not cleaned:
        raise SecurityValidationError('Target URL or domain cannot be empty.')
    if any(ord(c) < 32 or ord(c) == 127 for c in cleaned) or '\\' in cleaned:
        raise SecurityValidationError('Control characters and backslashes are not permitted.')
    if '://' not in cleaned:
        cleaned = 'https://' + cleaned
    try:
        parsed = urlsplit(cleaned)
        if parsed.scheme.lower() not in {'http', 'https'} or not parsed.hostname:
            raise ValueError('Unsupported scheme or missing host')
        if parsed.username is not None or parsed.password is not None:
            raise ValueError('Embedded credentials are not permitted')
        hostname = parsed.hostname.rstrip('.').encode('idna').decode('ascii').lower()
        port = parsed.port if parsed.port is not None else (443 if parsed.scheme.lower() == 'https' else 80)
        if not 1 <= port <= 65535 or '%' in hostname:
            raise ValueError('Invalid port or scoped address')
    except (ValueError, UnicodeError) as exc:
        raise SecurityValidationError('Invalid HTTP(S) URL, credentials, host or port.') from exc
    if is_ip_blocked(hostname) or hostname in {"localhost", "local", "broadcasthost", "ip6-localhost", "ip6-loopback"}:
        raise SecurityValidationError("Private or reserved local destination is blocked.")
    extracted = _extract(hostname)
    if not extracted.suffix:
        try:
            ipaddress.ip_address(hostname)
        except ValueError as exc:
            raise SecurityValidationError('Domain must have a public top-level domain.') from exc
    try:
        resolve_public_addresses(hostname, port)
    except socket.gaierror:
        pass  # The inspection will report DNS unavailable; transport fails closed.
    authority = f'[{hostname}]' if ':' in hostname else hostname
    if parsed.port is not None:
        authority += f':{port}'
    return dict(original_input=raw_url, canonical_url=urlunsplit((parsed.scheme.lower(), authority, parsed.path or '/', parsed.query, '')),
                scheme=parsed.scheme.lower(), hostname=hostname, port=port, path=parsed.path or '/',
                subdomain=extracted.subdomain, domain=extracted.domain, suffix=extracted.suffix,
                registered_domain=extracted.top_domain_under_public_suffix or hostname)
