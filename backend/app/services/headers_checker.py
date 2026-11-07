import httpx
from urllib.parse import urlparse
from typing import List
from backend.app.schemas.scan import HeadersAnalysis
from backend.app.utils.security import is_ip_blocked

RECOMMENDED_SECURITY_HEADERS = [
    ("strict-transport-security", "Strict-Transport-Security (HSTS)"),
    ("content-security-policy", "Content-Security-Policy (CSP)"),
    ("x-frame-options", "X-Frame-Options (Clickjacking defense)"),
    ("x-content-type-options", "X-Content-Type-Options (MIME sniffing defense)"),
    ("referrer-policy", "Referrer-Policy"),
    ("permissions-policy", "Permissions-Policy"),
]


async def inspect_headers(canonical_url: str, initial_hostname: str) -> HeadersAnalysis:
    """Safe, non-invasive inspection of HTTP response headers and redirect chains with SSRF guardrails."""
    redirect_chain: List[str] = [canonical_url]
    current_url = canonical_url
    missing_headers: List[str] = []
    suspicious_redirect = False
    is_http_to_https = False

    custom_headers = {
        "User-Agent": "CyberTrust360-Bot/1.0 (Web Threat & Trust Intelligence Scanner; +https://technixpro.dev/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        # Use an AsyncClient without auto-following redirects so we can validate each hop for SSRF
        async with httpx.AsyncClient(
            verify=False,  # We inspect cert separately; here we want headers even on self-signed/expired
            timeout=5.0,
            headers=custom_headers,
        ) as client:
            hops = 0
            max_hops = 6
            final_response = None

            while hops < max_hops:
                hops += 1

                # SSRF check on target host of each hop
                parsed_hop = urlparse(current_url)
                hop_host = parsed_hop.hostname
                if not hop_host or is_ip_blocked(hop_host):
                    suspicious_redirect = True
                    return HeadersAnalysis(
                        redirect_count=len(redirect_chain) - 1,
                        redirect_chain=redirect_chain,
                        suspicious_redirect=True,
                        error_message=f"Redirect chain attempted access to blocked/internal host '{hop_host}'.",
                    )

                try:
                    response = await client.get(current_url, follow_redirects=False)
                    final_response = response
                except httpx.RequestError as req_err:
                    return HeadersAnalysis(
                        redirect_count=len(redirect_chain) - 1,
                        redirect_chain=redirect_chain,
                        error_message=f"HTTP connection failed: {str(req_err)}",
                    )

                # Check if it's a redirect status code (301, 302, 303, 307, 308)
                if response.status_code in (301, 302, 303, 307, 308) and "location" in response.headers:
                    location = response.headers["location"]
                    # Resolve relative redirect URLs
                    if location.startswith("/"):
                        location = f"{parsed_hop.scheme}://{parsed_hop.netloc}{location}"

                    redirect_chain.append(location)

                    # Check HTTP to HTTPS upgrade
                    if canonical_url.startswith("http://") and location.startswith("https://"):
                        is_http_to_https = True

                    # Check off-domain redirects
                    target_host = urlparse(location).hostname or ""
                    if target_host and initial_hostname not in target_host and target_host not in initial_hostname:
                        suspicious_redirect = True

                    current_url = location
                else:
                    # Final destination reached
                    break

            if final_response is None:
                return HeadersAnalysis(error_message="No response received from target host.")

            headers_lower = {k.lower(): v for k, v in final_response.headers.items()}

            hsts = "strict-transport-security" in headers_lower
            csp = "content-security-policy" in headers_lower
            x_frame = headers_lower.get("x-frame-options")
            x_content_type = headers_lower.get("x-content-type-options")
            referrer = headers_lower.get("referrer-policy")
            permissions = headers_lower.get("permissions-policy")
            server = headers_lower.get("server")

            for header_key, friendly_name in RECOMMENDED_SECURITY_HEADERS:
                if header_key not in headers_lower:
                    missing_headers.append(friendly_name)

            if hops >= max_hops:
                suspicious_redirect = True

            return HeadersAnalysis(
                status_code=final_response.status_code,
                hsts_present=hsts,
                csp_present=csp,
                x_frame_options=x_frame,
                x_content_type_options=x_content_type,
                referrer_policy=referrer,
                permissions_policy=permissions,
                server=server,
                redirect_count=len(redirect_chain) - 1,
                redirect_chain=redirect_chain,
                is_http_to_https_redirect=is_http_to_https,
                suspicious_redirect=suspicious_redirect,
                missing_headers=missing_headers,
                error_message=None,
            )

    except Exception as exc:
        return HeadersAnalysis(
            redirect_count=len(redirect_chain) - 1,
            redirect_chain=redirect_chain,
            error_message=f"HTTP header inspection error: {str(exc)}",
        )
