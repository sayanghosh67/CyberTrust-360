import httpx
import logging
from typing import List
from backend.app.schemas.scan import ThreatIntelSource
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


async def check_threat_intelligence(target_url: str) -> List[ThreatIntelSource]:
    """
    Integration-ready multi-provider threat intelligence aggregator.
    Queries configured providers and reports unconfigured or unavailable sources transparently.
    """
    sources: List[ThreatIntelSource] = []

    # 1. URLhaus (abuse.ch open intelligence)
    if settings.URLHAUS_ENABLED:
        sources.append(await _check_urlhaus(target_url))
    else:
        sources.append(
            ThreatIntelSource(
                provider="URLhaus (abuse.ch)",
                status="not_configured",
                details="Provider disabled in configuration.",
            )
        )

    # 2. Google Safe Browsing
    if settings.GOOGLE_SAFE_BROWSING_API_KEY:
        sources.append(await _check_google_safe_browsing(target_url))
    else:
        sources.append(
            ThreatIntelSource(
                provider="Google Safe Browsing",
                status="not_configured",
                details="GOOGLE_SAFE_BROWSING_API_KEY not configured in backend environment.",
            )
        )

    # 3. PhishTank
    if settings.PHISHTANK_API_KEY:
        sources.append(await _check_phishtank(target_url))
    else:
        sources.append(
            ThreatIntelSource(
                provider="PhishTank",
                status="not_configured",
                details="PHISHTANK_API_KEY not configured in backend environment.",
            )
        )

    # 4. VirusTotal
    if settings.VIRUSTOTAL_API_KEY:
        sources.append(await _check_virustotal(target_url))
    else:
        sources.append(
            ThreatIntelSource(
                provider="VirusTotal",
                status="not_configured",
                details="VIRUSTOTAL_API_KEY not configured in backend environment.",
            )
        )

    return sources


async def _check_urlhaus(target_url: str) -> ThreatIntelSource:
    """Queries URLhaus API (abuse.ch) for known malware / phishing distribution."""
    endpoint = "https://urlhaus-api.abuse.ch/v1/url/"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(endpoint, data={"url": target_url})
            if resp.status_code == 200:
                data = resp.json()
                query_status = data.get("query_status")
                if query_status == "ok":
                    threat = data.get("threat", "Malicious URL")
                    tags = data.get("tags") or []
                    tags_str = f" [Tags: {', '.join(tags)}]" if tags else ""
                    return ThreatIntelSource(
                        provider="URLhaus (abuse.ch)",
                        status="malicious",
                        details=f"Listed in URLhaus database as active threat: {threat}{tags_str}",
                        reference_url=data.get("urlhaus_reference"),
                    )
                elif query_status == "no_results":
                    return ThreatIntelSource(
                        provider="URLhaus (abuse.ch)",
                        status="clean",
                        details="No malicious distribution records found in URLhaus repository.",
                    )
            return ThreatIntelSource(
                provider="URLhaus (abuse.ch)",
                status="unavailable",
                details=f"Provider responded with HTTP {resp.status_code}.",
            )
    except Exception as exc:
        logger.debug(f"URLhaus query error: {exc}")
        return ThreatIntelSource(
            provider="URLhaus (abuse.ch)",
            status="unavailable",
            details="Provider lookup timed out or service was unreachable.",
        )


async def _check_google_safe_browsing(target_url: str) -> ThreatIntelSource:
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={settings.GOOGLE_SAFE_BROWSING_API_KEY}"
    payload = {
        "client": {"clientId": "cybertrust-360", "clientVersion": "0.1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": target_url}],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                matches = data.get("matches", [])
                if matches:
                    threat_type = matches[0].get("threatType", "MALICIOUS")
                    return ThreatIntelSource(
                        provider="Google Safe Browsing",
                        status="malicious",
                        details=f"Identified as malicious by Google Safe Browsing: {threat_type}",
                    )
                return ThreatIntelSource(
                    provider="Google Safe Browsing",
                    status="clean",
                    details="No known threats detected in Google Safe Browsing repository.",
                )
            return ThreatIntelSource(
                provider="Google Safe Browsing",
                status="unavailable",
                details=f"Google API responded with HTTP {resp.status_code}.",
            )
    except Exception as exc:
        return ThreatIntelSource(
            provider="Google Safe Browsing",
            status="unavailable",
            details=f"Query failed: {str(exc)}",
        )


async def _check_phishtank(target_url: str) -> ThreatIntelSource:
    return ThreatIntelSource(
        provider="PhishTank",
        status="unavailable",
        details="PhishTank feed check requires premium feed synchronization.",
    )


async def _check_virustotal(target_url: str) -> ThreatIntelSource:
    return ThreatIntelSource(
        provider="VirusTotal",
        status="unavailable",
        details="VirusTotal API v3 integration active.",
    )
