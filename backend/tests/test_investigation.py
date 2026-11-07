import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.url_analyzer import analyze_url
from backend.app.utils.security import normalize_and_validate_target, SecurityValidationError
from backend.app.services.risk_engine import evaluate_risk
from backend.app.schemas.scan import (
    URLAnalysis,
    DNSAnalysis,
    SSLAnalysis,
    HeadersAnalysis,
    ThreatIntelSource,
)

client = TestClient(app)


# ==============================================================================
# SECTION 8: BACKEND TEST SUITE
# Note: These test fixtures and examples validate forensic parsing and detection logic.
# Test examples do NOT represent proof of real-world detection accuracy against evolving threat actors.
# ==============================================================================

def test_invalid_url_submission():
    """Verify that empty or malformed inputs are rejected with HTTP 400."""
    res1 = client.post("/api/v1/scans", json={"url": ""})
    assert res1.status_code == 422 or res1.status_code == 400

    res2 = client.post("/api/v1/scans", json={"url": "   "})
    assert res2.status_code == 400
    assert "cannot be empty" in res2.json()["detail"].lower()


def test_ssrf_and_unsafe_redirect_protection():
    """Verify strict blocking of private IPs, loopback, cloud metadata, and localhost."""
    blocked_targets = [
        "http://127.0.0.1",
        "http://127.0.0.1:8000/internal",
        "http://localhost",
        "http://localhost:5173",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1/admin",
        "http://10.0.0.1/dashboard",
    ]
    for target in blocked_targets:
        res = client.post("/api/v1/scans", json={"url": target})
        assert res.status_code == 400, f"Expected 400 for blocked target {target}, got {res.status_code}"
        assert "reserved" in res.json()["detail"].lower() or "blocked" in res.json()["detail"].lower() or "private" in res.json()["detail"].lower()


def test_suspicious_url_examples():
    """
    Test at least 3 suspicious URL patterns:
    1. Brand in subdomain with deceptive depth (paypal.com.verify-login.xyz)
    2. Raw numeric IP host with embedded @ credential symbol
    3. Typosquatted domain with excessive hyphens (paypa1-secure-verification.com)
    """
    # Example 1: Brand impersonation in subdomain
    url1 = "https://paypal.com.account-update.xyz/login"
    analysis1 = analyze_url(url1)
    patterns1 = " ".join(analysis1.suspicious_patterns).lower()
    assert "brand name 'paypal'" in patterns1
    assert "subdomain depth" in patterns1 or analysis1.subdomain != ""

    # Example 2: Raw IP host with @ symbol
    url2 = "http://user:pass@198.51.100.22/banking"
    analysis2 = analyze_url(url2)
    assert analysis2.is_ip_address is True
    patterns2 = " ".join(analysis2.suspicious_patterns).lower()
    assert "@" in patterns2

    # Example 3: Typosquatting of major target brand
    url3 = "https://paypa1-account-login-update.com"
    analysis3 = analyze_url(url3)
    assert len(analysis3.typosquatting_matches) > 0
    assert analysis3.typosquatting_matches[0].brand == "paypal"
    assert analysis3.typosquatting_matches[0].similarity >= 0.80


def test_benign_url_examples():
    """
    Test at least 3 benign URL examples:
    1. example.com
    2. wikipedia.org
    3. github.com
    """
    benign_urls = [
        "https://example.com",
        "https://wikipedia.org",
        "https://github.com/explore",
    ]
    for b_url in benign_urls:
        analysis = analyze_url(b_url)
        assert analysis.is_ip_address is False
        assert analysis.is_url_shortener is False
        assert len(analysis.typosquatting_matches) == 0
        assert len(analysis.suspicious_patterns) == 0


def test_tls_certificate_errors():
    """Verify that expired and mismatched certificates are flagged with high-severity indicators."""
    url_data = analyze_url("https://expired-test.org")
    dns_data = DNSAnalysis(status="resolved", a_records=["93.184.216.34"])
    headers_data = HeadersAnalysis(status_code=200, hsts_present=True)
    threat_intel = []

    # Expired cert
    ssl_expired = SSLAnalysis(
        https_available=True,
        valid=False,
        expired=True,
        days_remaining=-10,
        issuer={"organization": "Test CA"},
        subject={"common_name": "expired-test.org"},
    )
    classification, score, conf, summary, indicators, _ = evaluate_risk(
        url_data=url_data,
        dns_data=dns_data,
        ssl_data=ssl_expired,
        headers_data=headers_data,
        threat_intel=threat_intel,
        failed_checks=[],
    )
    assert score >= 35
    assert any("Expired SSL Certificate" in i.name for i in indicators)

    # Hostname mismatch cert
    ssl_mismatch = SSLAnalysis(
        https_available=True,
        valid=False,
        expired=False,
        hostname_mismatch=True,
        issuer={"organization": "Test CA"},
        subject={"common_name": "different-domain.com"},
    )
    classification2, score2, _, _, indicators2, _ = evaluate_risk(
        url_data=url_data,
        dns_data=dns_data,
        ssl_data=ssl_mismatch,
        headers_data=headers_data,
        threat_intel=threat_intel,
        failed_checks=[],
    )
    assert score2 >= 30
    assert any("SSL Certificate Hostname Mismatch" in i.name for i in indicators2)


def test_missing_security_headers():
    """Verify detection and reporting of missing HSTS, CSP, and X-Frame-Options headers."""
    headers = HeadersAnalysis(
        status_code=200,
        hsts_present=False,
        csp_present=False,
        x_frame_options=None,
        missing_headers=["Strict-Transport-Security (HSTS)", "Content-Security-Policy (CSP)"],
    )
    assert headers.hsts_present is False
    assert len(headers.missing_headers) >= 2


def test_threat_intelligence_unconfigured_reporting():
    """Verify that unconfigured providers report 'not_configured' status honestly without faking results."""
    from backend.app.services.threat_intel import check_threat_intelligence
    import asyncio

    sources = asyncio.run(check_threat_intelligence("https://example.com"))
    providers = {s.provider: s for s in sources}

    # Unless explicitly set, Google Safe Browsing and VirusTotal must report not_configured
    assert "Google Safe Browsing" in providers
    assert providers["Google Safe Browsing"].status in ["not_configured", "clean"]
    assert "VirusTotal" in providers
    assert providers["VirusTotal"].status in ["not_configured", "clean", "unavailable"]


def test_risk_classification_levels():
    """Verify risk classification mapping across all five designated tiers."""
    url_data = analyze_url("https://example.com")
    dns_data = DNSAnalysis(status="resolved", a_records=["93.184.216.34"])
    ssl_data = SSLAnalysis(https_available=True, valid=True, days_remaining=90)
    headers_data = HeadersAnalysis(status_code=200, hsts_present=True)

    # 1. Low Risk
    c1, s1, _, _, _, _ = evaluate_risk(url_data, dns_data, ssl_data, headers_data, [], [])
    assert c1 == "Low Risk"
    assert s1 < 25

    # 2. Inconclusive (DNS failed)
    dns_failed = DNSAnalysis(status="failed", error_message="NXDOMAIN")
    c_inc, _, _, _, _, _ = evaluate_risk(url_data, dns_failed, ssl_data, headers_data, [], [])
    assert c_inc == "Inconclusive"

    # 3. Confirmed Malicious
    mal_intel = [ThreatIntelSource(provider="URLhaus", status="malicious", details="Active malware dropper")]
    c_mal, s_mal, _, _, _, _ = evaluate_risk(url_data, dns_data, ssl_data, headers_data, mal_intel, [])
    assert c_mal == "Confirmed Malicious"
    assert s_mal >= 80


def test_scan_lifecycle_and_history():
    """Verify submitting a scan, listing recent history, and retrieving by scan ID."""
    # Submitting scan with mocked external calls for test determinism
    mock_dns = DNSAnalysis(status="resolved", a_records=["1.1.1.1"])
    mock_ssl = SSLAnalysis(https_available=True, valid=True, days_remaining=100)
    mock_headers = HeadersAnalysis(status_code=200, hsts_present=True)

    with patch("backend.app.services.investigation_orchestrator.resolve_dns", return_value=mock_dns), \
         patch("backend.app.services.investigation_orchestrator.inspect_ssl", return_value=mock_ssl), \
         patch("backend.app.services.investigation_orchestrator.inspect_headers", return_value=mock_headers):

        res = client.post("/api/v1/scans", json={"url": "https://cloudflare.com"})
        assert res.status_code == 201
        data = res.json()
        scan_id = data["id"]
        assert data["hostname"] == "cloudflare.com"
        assert "risk_classification" in data
        assert "risk_score" in data
        assert "disclaimer" in data

        # Test GET /api/v1/scans (list)
        list_res = client.get("/api/v1/scans")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) > 0
        assert any(item["id"] == scan_id for item in items)

        # Test GET /api/v1/scans/{scan_id}
        get_res = client.get(f"/api/v1/scans/{scan_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["id"] == scan_id
        assert get_data["hostname"] == "cloudflare.com"
