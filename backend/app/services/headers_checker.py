"""Header-only investigation with pinned sockets, bounded headers and validated redirects."""
import asyncio
import http.client
import socket
import ssl
import threading
import time
import tldextract
from urllib.parse import urlsplit, urljoin
from backend.app.schemas.scan import HeadersAnalysis
from backend.app.utils.security import connect_public, normalize_and_validate_target, SecurityValidationError

from backend.app.services.url_analyzer import analyze_url

# Private suffixes keep independent hosting tenants (e.g. *.github.io) separate.
_site_extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None, include_psl_private_domains=True)

def site_identity(hostname):
    host = hostname.lower().rstrip(".")
    return _site_extract(host).top_domain_under_public_suffix or host

def assess_redirect(source, destination):
    old, new = urlsplit(source), urlsplit(destination)
    external = site_identity(old.hostname) != site_identity(new.hostname)
    downgrade = old.scheme == "https" and new.scheme == "http"
    notes = []
    deceptive = False
    if external:
        notes.append("Redirect crosses a registrable-domain boundary; this alone is not evidence of a threat.")
        analysis = analyze_url(destination)
        deceptive = bool(analysis.typosquatting_matches) or any("brand name" in item for item in analysis.suspicious_patterns)
        if deceptive: notes.append("The destination URL has a brand-lookalike or impersonation pattern; investigate it separately.")
    elif old.hostname != new.hostname:
        notes.append("Hostname changes within the same registrable site; no redirect risk points added.")
    if downgrade: notes.append("HTTPS redirects to unencrypted HTTP.")
    return external, downgrade, deceptive, notes

RECOMMENDED_SECURITY_HEADERS = [
    ('strict-transport-security', 'Strict-Transport-Security (HSTS)'),
    ('content-security-policy', 'Content-Security-Policy (CSP)'),
    ('x-frame-options', 'X-Frame-Options (Clickjacking defense)'),
    ('x-content-type-options', 'X-Content-Type-Options (MIME sniffing defense)'),
    ('referrer-policy', 'Referrer-Policy'), ('permissions-policy', 'Permissions-Policy'),
]

class PinnedConnection(http.client.HTTPConnection):
    def __init__(self, host, port, secure, timeout):
        super().__init__(host, port, timeout=timeout)
        self.secure = secure
        self.deadline = time.monotonic() + timeout
    def connect(self):
        sock = connect_public(self.host, self.port, self.timeout)
        try:
            remaining = self.deadline - time.monotonic()
            if remaining <= 0: raise TimeoutError("HTTP connection deadline")
            sock.settimeout(remaining)
            self.sock = ssl.create_default_context().wrap_socket(sock, server_hostname=self.host) if self.secure else sock
        except BaseException:
            sock.close()
            raise


def _request_headers(url, timeout=4.0, method='HEAD'):
    p = urlsplit(url)
    conn = PinnedConnection(p.hostname, p.port or (443 if p.scheme == 'https' else 80), p.scheme == 'https', timeout)
    def abort():
        if conn.sock:
            try:
                conn.sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            conn.close()
    timer = threading.Timer(timeout, abort)
    timer.daemon = True
    timer.start()
    try:
        conn.request(method, (p.path or '/') + ('?' + p.query if p.query else ''), headers={'User-Agent': 'CyberTrust360/2.0', 'Accept-Encoding': 'identity', 'Connection': 'close'})
        response = conn.getresponse()
        # HTTPResponse bounds header lines/count; impose a stricter aggregate budget.
        headers = response.getheaders()
        if sum(len(k) + len(v) for k, v in headers) > 32768:
            raise ValueError('Response headers exceed 32 KiB')
        return response.status, {k.lower(): v for k, v in headers}
        # Never call response.read(): HEAD and GET fallback both consume zero body bytes.
    finally:
        timer.cancel()
        conn.close()


def _inspect(canonical_url, initial_hostname):
    chain = [canonical_url]
    current = canonical_url
    deadline = time.monotonic() + 12
    suspicious = False
    external = False
    downgrade = False
    notes = []
    try:
        for hop in range(6):
            if time.monotonic() >= deadline:
                raise TimeoutError()
            target = normalize_and_validate_target(current)
            current = target['canonical_url']
            status, headers = _request_headers(current, min(4, max(.1, deadline-time.monotonic())))
            if status in (405, 501):
                status, headers = _request_headers(current, min(4, max(.1, deadline-time.monotonic())), method='GET')
            if status in (301, 302, 303, 307, 308) and 'location' in headers:
                if hop == 5:
                    raise ValueError('Redirect limit exceeded')
                next_url = urljoin(current, headers['location'])
                next_target = normalize_and_validate_target(next_url)
                changed_site, less_secure, deceptive, hop_notes = assess_redirect(current, next_target['canonical_url'])
                external |= changed_site
                downgrade |= less_secure
                suspicious |= less_secure or deceptive
                notes.extend(note for note in hop_notes if note not in notes)
                current = next_target['canonical_url']
                chain.append(current)
                continue
            return HeadersAnalysis(status_code=status, hsts_present='strict-transport-security' in headers,
                csp_present='content-security-policy' in headers, x_frame_options=headers.get('x-frame-options'),
                x_content_type_options=headers.get('x-content-type-options'), referrer_policy=headers.get('referrer-policy'),
                permissions_policy=headers.get('permissions-policy'), server=headers.get('server'),
                redirect_count=len(chain)-1, redirect_chain=chain, suspicious_redirect=suspicious, cross_domain_redirect=external, https_downgrade=downgrade, redirect_notes=notes,
                is_http_to_https_redirect=canonical_url.startswith('http:') and current.startswith('https:'),
                missing_headers=[label for name,label in RECOMMENDED_SECURITY_HEADERS if name not in headers])
    except SecurityValidationError:
        return HeadersAnalysis(redirect_chain=chain, redirect_count=len(chain)-1, suspicious_redirect=True, blocked_redirect=True, cross_domain_redirect=external, https_downgrade=downgrade, redirect_notes=notes + ['Redirect destination blocked by network safety policy.'], error_message='Destination blocked by network safety policy.')
    except Exception as exc:
        return HeadersAnalysis(redirect_chain=chain, redirect_count=len(chain)-1, suspicious_redirect=suspicious, cross_domain_redirect=external, https_downgrade=downgrade, redirect_notes=notes, error_message=f'HTTP inspection unavailable ({type(exc).__name__}).')

async def inspect_headers(canonical_url: str, initial_hostname: str) -> HeadersAnalysis:
    try:
        return await asyncio.wait_for(asyncio.to_thread(_inspect, canonical_url, initial_hostname), timeout=13)
    except TimeoutError:
        return HeadersAnalysis(error_message='HTTP inspection deadline exceeded.')
