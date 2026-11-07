import re
import ipaddress
import difflib
from typing import List, Dict, Any
from urllib.parse import urlparse
import tldextract
from backend.app.schemas.scan import URLAnalysis, TyposquatMatch

# High-value targets frequently spoofed in phishing/typosquatting attacks
TARGET_BRANDS = [
    "google", "paypal", "microsoft", "apple", "amazon", "facebook",
    "netflix", "chase", "wellsfargo", "bankofamerica", "binance",
    "coinbase", "dropbox", "github", "twitter", "linkedin", "instagram",
    "whatsapp", "telegram", "outlook", "office365", "adobe", "citibank"
]

# Known URL shortener domains
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly",
    "cutt.ly", "goo.gl", "rebrand.ly", "shorturl.at", "tiny.cc", "rb.gy"
}


def analyze_url(raw_url: str) -> URLAnalysis:
    """Analyzes a URL for structural anomalies, typosquatting, shorteners, and deceptive patterns."""
    raw_url = raw_url.strip()
    if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
        processed_url = f"https://{raw_url}"
    else:
        processed_url = raw_url

    parsed = urlparse(processed_url)
    hostname = (parsed.hostname or "").lower().strip(".")
    scheme = parsed.scheme.lower()
    canonical_url = f"{scheme}://{hostname}{parsed.path or '/'}"
    if parsed.query:
        canonical_url += f"?{parsed.query}"

    # Extract domain tokens
    extracted = tldextract.extract(hostname)
    reg_domain = getattr(extracted, "top_domain_under_public_suffix", None) or extracted.registered_domain or hostname
    registered_domain = reg_domain
    subdomain = extracted.subdomain
    domain_name = extracted.domain
    suffix = extracted.suffix

    # 1. IP-address-based URL detection
    is_ip = False
    try:
        ipaddress.ip_address(hostname)
        is_ip = True
    except ValueError:
        is_ip = False

    # 2. Suspicious URL Patterns
    suspicious_patterns: List[str] = []

    if is_ip:
        suspicious_patterns.append("Host is an explicit raw IP address rather than a registered domain name.")

    # Embedded credentials / @ symbol in URL
    if "@" in raw_url:
        suspicious_patterns.append("URL contains an '@' delimiter, which can deceive users about the true destination host.")

    # Excessive subdomains (phishing depth trick)
    subdomain_parts = [p for p in subdomain.split(".") if p]
    if len(subdomain_parts) >= 3:
        suspicious_patterns.append(f"Unusually high subdomain depth ({len(subdomain_parts)} levels: '{subdomain}').")

    # Excessive hyphens in domain name
    if domain_name.count("-") >= 3:
        suspicious_patterns.append(f"Domain name contains multiple hyphens ({domain_name.count('-')}), common in deceptive phishing URLs.")

    # Brand keyword placed inside subdomain (e.g., paypal.com.verify-login.xyz)
    for brand in TARGET_BRANDS:
        if brand in subdomain_parts:
            suspicious_patterns.append(
                f"Legitimate brand name '{brand}' detected in subdomain while registered domain is '{registered_domain}'."
            )

    # Unusual port numbers
    if parsed.port and parsed.port not in (80, 443, 8080, 8443):
        suspicious_patterns.append(f"Non-standard web port specified ({parsed.port}).")

    # Hexadecimal or high entropy obfuscation in hostname
    if re.search(r"0x[0-9a-fA-F]+", hostname):
        suspicious_patterns.append("Hostname contains hexadecimal encoding notation.")

    # 3. URL Shortener Detection
    is_shortener = registered_domain.lower() in SHORTENER_DOMAINS

    # 4. Typosquatting / Homoglyph Detection
    typosquat_matches: List[TyposquatMatch] = []
    clean_domain = domain_name.lower()
    # Check both full domain and hyphenated tokens (e.g. 'paypa1-verify.com')
    tokens_to_check = [clean_domain] + [t for t in clean_domain.split("-") if len(t) >= 3]

    for token in tokens_to_check:
        for target in TARGET_BRANDS:
            if token == target:
                continue

            # Compute string similarity ratio
            matcher = difflib.SequenceMatcher(None, token, target)
            ratio = matcher.ratio()

            # Check leet-speak / character replacements (e.g., '0' for 'o', '1' for 'l')
            leetspeak_target = target.replace("o", "0").replace("l", "1").replace("e", "3").replace("i", "1")
            leetspeak_match = difflib.SequenceMatcher(None, token, leetspeak_target).ratio()
            max_sim = max(ratio, leetspeak_match)

            if max_sim >= 0.80:
                match_entry = TyposquatMatch(
                    brand=target,
                    similarity=round(max_sim, 2),
                    reason=f"Domain segment '{token}' closely resembles major brand '{target}' ({int(max_sim * 100)}% match)."
                )
                if not any(m.brand == target for m in typosquat_matches):
                    typosquat_matches.append(match_entry)

    return URLAnalysis(
        original_url=raw_url,
        canonical_url=canonical_url,
        hostname=hostname,
        registered_domain=registered_domain,
        subdomain=subdomain,
        tld=suffix,
        scheme=scheme,
        is_ip_address=is_ip,
        is_url_shortener=is_shortener,
        suspicious_patterns=suspicious_patterns,
        typosquatting_matches=typosquat_matches,
    )
