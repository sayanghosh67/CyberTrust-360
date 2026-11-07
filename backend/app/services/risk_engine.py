from typing import List, Tuple
from backend.app.schemas.scan import (
    URLAnalysis,
    DNSAnalysis,
    SSLAnalysis,
    HeadersAnalysis,
    ThreatIntelSource,
    DetectedIndicator,
)


def evaluate_risk(
    url_data: URLAnalysis,
    dns_data: DNSAnalysis,
    ssl_data: SSLAnalysis,
    headers_data: HeadersAnalysis,
    threat_intel: List[ThreatIntelSource],
    failed_checks: List[str],
) -> Tuple[str, int, str, str, List[DetectedIndicator], List[str]]:
    """
    Transparent, explainable risk scoring system.
    Evaluates multi-vector forensic indicators and assigns a classification, 0-100 score,
    confidence level, and tailored actionable recommendations.
    """
    indicators: List[DetectedIndicator] = []
    accumulated_score = 0
    confirmed_malicious = False

    # 1. Evaluate Threat Intelligence Sources
    for source in threat_intel:
        if source.status == "malicious":
            confirmed_malicious = True
            accumulated_score += 90
            indicators.append(
                DetectedIndicator(
                    name="Known Threat Intelligence Match",
                    category="threat_intel",
                    severity="critical",
                    description=f"Verified malicious classification by {source.provider}.",
                    technical_evidence=source.details or "Flagged in threat intelligence feed.",
                )
            )

    # 2. Evaluate URL and Deceptive Structuring
    if url_data.is_ip_address:
        accumulated_score += 10
        indicators.append(
            DetectedIndicator(
                name="IP Address Based Host",
                category="url",
                severity="medium",
                description="The URL uses a numeric IP address directly instead of a registered domain.",
                technical_evidence=f"Target Host: {url_data.hostname}",
            )
        )

    for pattern in url_data.suspicious_patterns:
        if "brand name" in pattern:
            accumulated_score += 40
            indicators.append(
                DetectedIndicator(
                    name="Brand Impersonation in Subdomain",
                    category="url",
                    severity="high",
                    description="A legitimate enterprise brand name appears in a subdomain structure.",
                    technical_evidence=pattern,
                )
            )
        elif "@" in pattern:
            accumulated_score += 25
            indicators.append(
                DetectedIndicator(
                    name="Deceptive '@' Character in URL",
                    category="url",
                    severity="high",
                    description="The URL includes an '@' symbol, a common obfuscation tactic to hide true destination.",
                    technical_evidence=pattern,
                )
            )
        elif "Unusually high subdomain depth" in pattern:
            accumulated_score += 15
            indicators.append(
                DetectedIndicator(
                    name="Excessive Subdomain Nesting",
                    category="url",
                    severity="medium",
                    description="Multiple nested subdomains often mimic legitimate authentication paths.",
                    technical_evidence=pattern,
                )
            )
        elif "hyphens" in pattern:
            accumulated_score += 10
            indicators.append(
                DetectedIndicator(
                    name="Multiple Hyphenated Domain Segments",
                    category="url",
                    severity="low",
                    description="Excessive hyphenation is characteristic of disposable phishing domains.",
                    technical_evidence=pattern,
                )
            )

    for match in url_data.typosquatting_matches:
        accumulated_score += 35
        indicators.append(
            DetectedIndicator(
                name=f"Potential Typosquat of {match.brand.title()}",
                category="url",
                severity="high",
                description=f"The domain closely mimics the spelling of '{match.brand}'.",
                technical_evidence=f"Similarity: {int(match.similarity * 100)}% | {match.reason}",
            )
        )

    if url_data.is_url_shortener:
        accumulated_score += 10
        indicators.append(
            DetectedIndicator(
                name="URL Shortening Service",
                category="url",
                severity="low",
                description="Shortened links mask the ultimate destination and require destination resolution.",
                technical_evidence=f"Service Domain: {url_data.registered_domain}",
            )
        )

    # 3. Evaluate DNS Infrastructure
    if dns_data.status == "failed":
        indicators.append(
            DetectedIndicator(
                name="DNS Resolution Failure",
                category="dns",
                severity="medium",
                description="The target domain does not resolve to active authoritative IP records.",
                technical_evidence=dns_data.error_message or "No A/AAAA records returned.",
            )
        )

    # 4. Evaluate SSL/TLS Configuration
    # 4. Evaluate SSL/TLS Configuration
    if dns_data.status != "resolved":
        # Network-level checks cannot be performed when DNS does not resolve
        if ssl_data.error_message:
            indicators.append(
                DetectedIndicator(
                    name="TLS Inspection Unavailable",
                    category="ssl",
                    severity="info",
                    description="TLS certificate could not be inspected because the host does not resolve.",
                    technical_evidence=ssl_data.error_message,
                )
            )
    elif not ssl_data.https_available:
        err_msg_lower = (ssl_data.error_message or "").lower()
        if "refused" in err_msg_lower:
            accumulated_score += 20
            indicators.append(
                DetectedIndicator(
                    name="Unencrypted HTTP / Port 443 Refused",
                    category="ssl",
                    severity="medium",
                    description="The server explicitly refused HTTPS connections on port 443.",
                    technical_evidence=ssl_data.error_message or "Connection refused on port 443.",
                )
            )
        else:
            # Check was unavailable / timed out, NOT confirmed missing encryption
            indicators.append(
                DetectedIndicator(
                    name="TLS Check Unavailable",
                    category="ssl",
                    severity="info",
                    description="Could not complete TLS inspection due to connection timeout or network filtering.",
                    technical_evidence=ssl_data.error_message or "TLS session could not be established.",
                )
            )
    else:
        if ssl_data.expired:
            accumulated_score += 35
            indicators.append(
                DetectedIndicator(
                    name="Expired SSL Certificate",
                    category="ssl",
                    severity="high",
                    description="The presented TLS certificate has expired, rendering traffic insecure.",
                    technical_evidence=f"Days Remaining: {ssl_data.days_remaining}",
                )
            )
        if ssl_data.hostname_mismatch:
            accumulated_score += 30
            indicators.append(
                DetectedIndicator(
                    name="SSL Certificate Hostname Mismatch",
                    category="ssl",
                    severity="high",
                    description="The SSL certificate was issued for a different domain, indicating spoofing or misconfiguration.",
                    technical_evidence=f"Issued for: {ssl_data.subject.get('common_name') or 'other'}",
                )
            )
        if ssl_data.valid and ssl_data.days_remaining is not None and ssl_data.days_remaining <= 14:
            accumulated_score += 10
            indicators.append(
                DetectedIndicator(
                    name="SSL Certificate Imminent Expiry",
                    category="ssl",
                    severity="low",
                    description=f"The SSL certificate expires within {ssl_data.days_remaining} days.",
                    technical_evidence=f"Days remaining: {ssl_data.days_remaining}",
                )
            )

    # 5. Evaluate HTTP Security Headers & Redirects
    if headers_data.suspicious_redirect:
        accumulated_score += 25
        indicators.append(
            DetectedIndicator(
                name="Redirect Security Warning",
                category="headers",
                severity="medium",
                description="A redirect was blocked, downgraded HTTPS, or led to a destination with a deceptive URL pattern.",
                technical_evidence="; ".join(headers_data.redirect_notes) or f"Hops: {headers_data.redirect_count} | Chain: {' -> '.join(headers_data.redirect_chain[:3])}",
            )
        )

    elif headers_data.cross_domain_redirect:
        indicators.append(DetectedIndicator(
            name="Cross-Domain Redirect Observed", category="headers", severity="info",
            description="The destination uses a different registrable domain. Common for redirects and sign-in services; no risk points added solely for this change.",
            technical_evidence=f"Chain: {' -> '.join(headers_data.redirect_chain[:6])}"))

    # Missing critical security headers (only if the server actually returned an HTTP response)
    if headers_data.status_code and not headers_data.hsts_present:
        accumulated_score += 5
        indicators.append(
            DetectedIndicator(
                name="Missing Strict-Transport-Security (HSTS)",
                category="headers",
                severity="info",
                description="No HSTS header was observed in this response. This is a configuration observation, not evidence of phishing.",
                technical_evidence="HSTS header absent in response.",
            )
        )

    # Cap score at 100
    risk_score = min(accumulated_score, 100)

    # Determine Classification
    if confirmed_malicious or risk_score >= 80:
        classification = "Confirmed Malicious" if confirmed_malicious else "High Risk"
        confidence = "High"
        summary = (
            f"Critical threat indicators identified for '{url_data.hostname}'. "
            "Evidence indicates deceptive infrastructure, typosquatting, or malicious intelligence listing."
        )
    elif risk_score >= 50:
        classification = "High Risk"
        confidence = "High" if len(indicators) >= 2 else "Medium"
        if dns_data.status == "failed":
            summary = (
                f"High-risk deceptive domain structure identified for '{url_data.hostname}', "
                "though the domain does not currently resolve to active authoritative nameservers."
            )
        else:
            summary = (
                f"High risk posture detected on '{url_data.hostname}'. "
                "Significant security irregularities observed across URL structure, TLS, or redirection paths."
            )
    elif risk_score >= 25:
        classification = "Suspicious"
        confidence = "Medium"
        if dns_data.status == "failed":
            summary = (
                f"Suspicious structural patterns identified on '{url_data.hostname}', "
                "though the domain does not currently resolve to active DNS records."
            )
        else:
            summary = (
                f"Suspicious signals identified on '{url_data.hostname}'. "
                "While not definitively confirmed malicious, several defensive abnormalities warrant caution."
            )
    elif dns_data.status != "resolved" or not ssl_data.valid or not headers_data.status_code or headers_data.error_message or failed_checks:
        classification = "Inconclusive"
        confidence = "Medium"
        summary = (
            "Unable to complete live security inspection: DNS, TLS or HTTP checks were incomplete. Available evidence is insufficient for a low-risk verdict."
        )
    else:
        classification = "Low Risk"
        confidence = "High" if ssl_data.valid and headers_data.status_code == 200 else "Medium"
        summary = (
            f"No critical anomalies or threat flags observed on '{url_data.hostname}'. "
            "Target presents standard technical indicators and valid certificates."
        )

    # Generate Tailored Actionable Recommendations
    recommended_actions: List[str] = []
    if classification in ("Confirmed Malicious", "High Risk"):
        recommended_actions.append("Do NOT submit credentials, passwords, or personal details on this website.")
        recommended_actions.append("Avoid downloading or executing any files from this domain.")
        recommended_actions.append("Report this URL to corporate IT security or web protection authorities.")
    elif classification == "Suspicious":
        recommended_actions.append("Exercise extreme caution before entering financial or private information.")
        recommended_actions.append("Verify the URL spelling carefully against official corporate communications.")
        recommended_actions.append("Inspect the SSL certificate padlock details directly in your browser.")
    elif classification == "Inconclusive":
        recommended_actions.append("Verify whether the target domain has been registered and configured correctly.")
        recommended_actions.append("Re-scan the URL once authoritative DNS nameservers have propagated.")
    else:
        recommended_actions.append("Standard browsing vigilance applies. Low risk does not guarantee complete safety.")
        recommended_actions.append("Ensure your browser and operating system security definitions remain up to date.")

    return classification, risk_score, confidence, summary, indicators, recommended_actions
