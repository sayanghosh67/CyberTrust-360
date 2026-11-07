import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import get_db, get_active_engine
from backend.app.models.scan import ScanRecord
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.models.blockchain import BlockchainRegistrationRecord
from backend.app.services.canonical_hasher import (
    extract_url_scan_protected_fields,
    extract_scam_report_protected_fields,
    canonicalize_to_json,
    compute_sha256_hex,
    compute_report_id_hash,
    generate_report_fingerprint,
)

client = TestClient(app)


# ==============================================================================
# 1. Deterministic Hashing & Tamper Sensitivity
# ==============================================================================

def test_deterministic_hashing_identical_records():
    """Confirms that two identical reports produce exactly the same canonical hash."""
    scan_id = str(uuid.uuid4())
    scan_data = {
        "url": "https://secure-bank-login.xyz/auth",
        "registered_domain": "secure-bank-login.xyz",
        "risk_classification": "Confirmed Malicious",
        "risk_score": 92,
        "confidence": "High",
        "summary": "Verified phishing credential harvester lookalike.",
        "report_data": '{"findings": [{"category": "phishing", "description": "Fake login"}], "security_headers": {"hsts": {"present": false}}}',
    }

    class MockRecord:
        id = scan_id
        url = scan_data["url"]
        registered_domain = scan_data["registered_domain"]
        risk_classification = scan_data["risk_classification"]
        risk_score = scan_data["risk_score"]
        confidence = scan_data["confidence"]
        summary = scan_data["summary"]
        report_data = scan_data["report_data"]

    c1, id_hash1, h1 = generate_report_fingerprint(MockRecord(), "url_scan")
    c2, id_hash2, h2 = generate_report_fingerprint(MockRecord(), "url_scan")

    assert h1 == h2, "Canonical hash must be deterministic across identical invocations"
    assert id_hash1 == id_hash2, "Report ID hash must be identical"
    assert h1.startswith("0x") and len(h1) == 66, "Content hash must be 0x-prefixed 32 bytes hex"
    assert id_hash1.startswith("0x") and len(id_hash1) == 66


def test_hash_changes_when_protected_fields_modified():
    """Confirms that modifying any protected security assessment field triggers an immediate hash mismatch."""
    scan_id = str(uuid.uuid4())

    class OriginalScan:
        id = scan_id
        url = "https://phish-site.org/portal"
        registered_domain = "phish-site.org"
        risk_classification = "Confirmed Malicious"
        risk_score = 95
        confidence = "High"
        summary = "Credential harvester"
        report_data = '{"findings": []}'

    class TamperedScan:
        id = scan_id
        url = "https://phish-site.org/portal"
        registered_domain = "phish-site.org"
        risk_classification = "Safe"  # Tampered
        risk_score = 5               # Tampered
        confidence = "High"
        summary = "Credential harvester"
        report_data = '{"findings": []}'

    _, _, orig_hash = generate_report_fingerprint(OriginalScan(), "url_scan")
    _, _, tampered_hash = generate_report_fingerprint(TamperedScan(), "url_scan")

    assert orig_hash != tampered_hash, "Tampered report must generate a distinctly different hash"


# ==============================================================================
# 2. Blockchain Status Probe
# ==============================================================================

def test_blockchain_status_endpoint():
    """Tests GET /api/v1/blockchain/status returns valid EVM telemetry and attestation disclaimer."""
    response = client.get("/api/v1/blockchain/status")
    assert response.status_code == 200
    data = response.json()

    assert "connected" in data
    assert "chain_id" in data
    assert data["chain_id"] == 31337
    assert "contract_address" in data
    assert data["contract_address"].startswith("0x")
    assert "disclaimer" in data
    assert "does not independently prove that the original threat classification is correct" in data["disclaimer"]


# ==============================================================================
# 3. Unregistered Report Verification (Scenario C)
# ==============================================================================

def test_unregistered_report_verification():
    """Tests that querying verification on an unregistered report returns NOT_REGISTERED cleanly."""
    unregistered_uuid = str(uuid.uuid4())
    response = client.get(f"/api/v1/blockchain/verify/{unregistered_uuid}")
    assert response.status_code == 200
    data = response.json()

    assert data["verification_status"] == "NOT_REGISTERED"
    assert data["is_match"] is False
    assert data["recorded_content_hash"] is None


# ==============================================================================
# 4. End-to-End URL Report Registration and Verification Lifecycle (Scenario A)
# ==============================================================================

def test_url_scan_blockchain_registration_and_verification():
    """
    Submits a live URL scan, registers its fingerprint on the deployed smart contract,
    verifies it on-chain, and confirms transaction receipt details.
    """
    # 1. Create a real URL scan in database
    unique_domain = f"attest-{uuid.uuid4().hex[:8]}-threat.org"
    scan_resp = client.post("/api/v1/scans", json={"url": f"https://{unique_domain}/login"})
    assert scan_resp.status_code in (200, 201)
    scan_id = scan_resp.json()["id"]

    # 2. Register report on blockchain
    reg_resp = client.post(f"/api/v1/blockchain/register/{scan_id}")
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()

    assert reg_data["report_id"] == scan_id
    assert reg_data["report_type"] == "url_scan"
    assert reg_data["registration_status"] == "confirmed"
    assert reg_data["block_number"] >= 1
    assert reg_data["transaction_hash"].startswith("0x")
    assert reg_data["content_hash"].startswith("0x")
    assert reg_data["report_id_hash"].startswith("0x")

    # 3. Verify report on blockchain (Scenario A — Unchanged)
    verify_resp = client.get(f"/api/v1/blockchain/verify/{scan_id}")
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()

    assert v_data["verification_status"] == "VERIFIED"
    assert v_data["status_label"] == "VERIFIED — REPORT UNCHANGED"
    assert v_data["is_match"] is True
    assert v_data["tamper_detected"] is False
    assert v_data["computed_content_hash"] == v_data["recorded_content_hash"]
    assert v_data["transaction_hash"] == reg_data["transaction_hash"]


# ==============================================================================
# 5. End-to-End Scam DNA Registration and Verification
# ==============================================================================

def test_scam_report_blockchain_registration_and_verification():
    """
    Submits a live Scam DNA analysis, registers on-chain, and verifies hash attestation.
    """
    # 1. Analyze a scam message
    scam_resp = client.post(
        "/api/v1/scam/analyze",
        json={
            "message": "Urgent alert: Electricity power cut at 9:30 PM due to unpaid bill. Call 9876543210 immediately.",
            "context": "sms",
        },
    )
    assert scam_resp.status_code in (200, 201)
    scam_id = scam_resp.json()["id"]

    # 2. Register scam report on-chain
    reg_resp = client.post(f"/api/v1/blockchain/register/{scam_id}")
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()

    assert reg_data["report_id"] == scam_id
    assert reg_data["report_type"] == "scam_report"
    assert reg_data["registration_status"] == "confirmed"
    assert reg_data["block_number"] >= 1

    # 3. Verify on-chain
    verify_resp = client.get(f"/api/v1/blockchain/verify/{scam_id}")
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()

    assert v_data["verification_status"] == "VERIFIED"
    assert v_data["is_match"] is True
    assert v_data["computed_content_hash"] == reg_data["content_hash"]


# ==============================================================================
# 6. Tamper Detection Demonstration (Scenario B)
# ==============================================================================

def test_tamper_detection_demonstration():
    """
    Executes Scenario B tamper demonstration on a registered report and asserts that
    an immediate MISMATCH status and security alert is triggered.
    """
    # 1. Create and register scan
    scan_resp = client.post("/api/v1/scans", json={"url": f"https://tamper-test-{uuid.uuid4().hex[:6]}.com"})
    scan_id = scan_resp.json()["id"]
    client.post(f"/api/v1/blockchain/register/{scan_id}")

    # 2. Call demonstration tamper endpoint
    tamper_resp = client.post(f"/api/v1/blockchain/demo/tamper/{scan_id}")
    assert tamper_resp.status_code == 200
    t_data = tamper_resp.json()

    assert t_data["verification_status"] == "MISMATCH"
    assert t_data["status_label"] == "MISMATCH — REPORT MODIFIED"
    assert t_data["is_match"] is False
    assert t_data["tamper_detected"] is True
    assert t_data["computed_content_hash"] != t_data["recorded_content_hash"]
    assert "SECURITY ALERT" in t_data["explanation"]


# ==============================================================================
# 7. Registrations History & Lookup
# ==============================================================================

def test_blockchain_registrations_history_and_lookup():
    """Tests GET /api/v1/blockchain/registrations and lookup by report_id."""
    # List registrations
    list_resp = client.get("/api/v1/blockchain/registrations?limit=10")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert "registrations" in data
    assert data["total_count"] >= 1

    first_item = data["registrations"][0]
    report_id = first_item["report_id"]

    # Lookup single registration
    single_resp = client.get(f"/api/v1/blockchain/registrations/{report_id}")
    assert single_resp.status_code == 200
    single_data = single_resp.json()
    assert single_data["report_id"] == report_id
    assert single_data["transaction_hash"] == first_item["transaction_hash"]
