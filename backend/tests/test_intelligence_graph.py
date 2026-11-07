import json
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import get_sessionmaker
from backend.app.models.scan import ScanRecord
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.services.relationship_engine import (
    normalize_url,
    normalize_domain,
    normalize_phone,
    normalize_upi,
    normalize_brand,
    build_threat_graph,
    get_report_relationships,
    get_top_recurring_indicators,
)

client = TestClient(app)


def test_normalization_utilities():
    """Verify URL, domain, phone, UPI, and brand normalization."""
    # URLs
    assert normalize_url("HTTP://Example.com:80/path/") == "http://example.com/path"
    assert normalize_url("https://sub.bank.com:443/verify?token=123") == "https://sub.bank.com/verify?token=123"

    # Domains
    assert normalize_domain("www.sbi-yono-update.xyz") == "sbi-yono-update.xyz"
    assert normalize_domain("https://subdomain.phish-target.co.in/login") == "phish-target.co.in"

    # Phones
    assert normalize_phone("9876543210") == "+91-9876543210"
    assert normalize_phone("+91 98765 43210") == "+91-9876543210"
    assert normalize_phone("919876543210") == "+91-9876543210"

    # UPI
    assert normalize_upi("  SBI.Support@OkHDFCBank  ") == "sbi.support@okhdfcbank"

    # Brands
    assert normalize_brand("sbi") == "SBI"
    assert normalize_brand("state bank of india") == "SBI"
    assert normalize_brand("phonepe") == "PhonePe"


def test_empty_database_graph_handling():
    """Verify that graph builder handles empty or minimal data cleanly without crashing."""
    SessionLocal = get_sessionmaker()
    with SessionLocal() as db:
        graph = build_threat_graph(db=db, limit=50, include_demo=False)
        assert graph is not None
        assert isinstance(graph.nodes, list)
        assert isinstance(graph.edges, list)
        assert graph.verified_relationships_count >= 0
        assert graph.possible_relationships_count >= 0


def test_synthetic_demonstration_dataset_explicitly_labeled():
    """Verify synthetic demonstration dataset is cleanly segregated and explicitly labeled."""
    SessionLocal = get_sessionmaker()
    with SessionLocal() as db:
        graph = build_threat_graph(db=db, limit=50, include_demo=True)
        assert graph.is_demo_data is True
        assert len(graph.nodes) > 0
        assert len(graph.edges) > 0

        # Check explicit demo labeling
        demo_nodes = [n for n in graph.nodes if "[DEMO]" in n.label or n.properties.get("is_demo") is True]
        assert len(demo_nodes) > 0

        # Verify limitations statement is present on edges
        for edge in graph.edges:
            assert edge.limitations is not None
            assert "does not prove common ownership" in edge.limitations


def test_verified_vs_possible_relationship_classification():
    """Verify that shared technical entities are VERIFIED_SHARED_INDICATOR and tactics are POSSIBLE_RELATIONSHIP."""
    SessionLocal = get_sessionmaker()
    with SessionLocal() as db:
        graph = build_threat_graph(db=db, limit=50, include_demo=True)

        verified_edges = [e for e in graph.edges if e.category == "VERIFIED_SHARED_INDICATOR"]
        possible_edges = [e for e in graph.edges if e.category == "POSSIBLE_RELATIONSHIP"]

        assert len(verified_edges) > 0
        assert len(possible_edges) > 0

        # Verified edges must connect to technical entities (domain, url, phone, upi)
        for e in verified_edges:
            assert any(term in e.relationship_type for term in ["DOMAIN", "URL", "PHONE", "UPI", "EXACT"])

        # Possible edges connect to brands, tactics, or heuristic patterns
        for e in possible_edges:
            assert any(term in e.relationship_type for term in ["BRAND", "TACTIC", "TYPOSQUAT"])


def test_cross_module_exact_shared_domain_linking():
    """Verify that a URL Scan and a Scam Report referencing the same domain are linked to the same domain node."""
    shared_test_domain = "shared-phish-investigation.xyz"

    # Submit a scan for this domain
    scan_res = client.post("/api/v1/scans", json={"url": f"http://{shared_test_domain}"})
    assert scan_res.status_code == 201
    scan_id = scan_res.json()["id"]

    # Submit a scam message referencing the same domain
    scam_res = client.post(
        "/api/v1/scam/analyze",
        json={
            "message": f"Dear Customer, your card is blocked. Click http://{shared_test_domain}/unlock to verify immediately.",
            "context": "sms"
        }
    )
    assert scam_res.status_code in (200, 201)
    scam_id = scam_res.json()["id"]

    # Query the graph
    graph_res = client.get("/api/v1/intelligence/graph?include_demo=false")
    assert graph_res.status_code == 200
    graph = graph_res.json()

    # Find the shared domain node
    domain_nodes = [n for n in graph["nodes"] if n["type"] == "domain" and shared_test_domain in n["label"]]
    assert len(domain_nodes) >= 1
    domain_node = domain_nodes[0]

    # Verify both the URL scan and the Scam report have edges connecting to this domain node
    connecting_edges = [
        e for e in graph["edges"]
        if e["target"] == domain_node["id"] or e["source"] == domain_node["id"]
    ]
    report_sources = []
    for e in connecting_edges:
        report_sources.extend(e.get("source_report_ids", []))

    assert scan_id in report_sources or any(scan_id in e["source"] for e in connecting_edges)
    assert scam_id in report_sources or any(scam_id in e["source"] for e in connecting_edges)


def test_unrelated_reports_remain_unconnected():
    """Verify that unrelated messages with different domains and tactics do not create false-positive cross-links."""
    unique_domain_a = f"isolated-{uuid.uuid4().hex[:10]}-domain.org"

    scan_res = client.post("/api/v1/scans", json={"url": f"http://{unique_domain_a}"})
    assert scan_res.status_code == 201
    scan_id = scan_res.json()["id"]

    SessionLocal = get_sessionmaker()
    with SessionLocal() as db:
        rel = get_report_relationships(report_id=scan_id, db=db)
        # Should have no connected reports because the domain is unique
        assert len(rel.connected_reports) == 0


def test_graph_api_endpoints_and_filtering():
    """Test /api/v1/intelligence/graph filters and pagination."""
    # All
    res_all = client.get("/api/v1/intelligence/graph?limit=50&include_demo=true")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "nodes" in data_all
    assert "edges" in data_all

    # Verified only filter
    res_v = client.get("/api/v1/intelligence/graph?filter_type=verified_only&include_demo=true")
    assert res_v.status_code == 200
    data_v = res_v.json()
    for e in data_v["edges"]:
        assert e["category"] == "VERIFIED_SHARED_INDICATOR"

    # Search query filter
    res_s = client.get("/api/v1/intelligence/graph?search=SBI&include_demo=true")
    assert res_s.status_code == 200
    data_s = res_s.json()
    assert any("SBI" in n["label"] for n in data_s["nodes"])


def test_recurring_indicators_endpoint():
    """Test /api/v1/intelligence/indicators returns aggregated indicators."""
    res = client.get("/api/v1/intelligence/indicators?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "indicators" in data
    assert isinstance(data["indicators"], list)
    if data["indicators"]:
        ind = data["indicators"][0]
        assert "type" in ind
        assert "value" in ind
        assert "report_count" in ind
        assert ind["report_count"] >= 1


def test_sensitive_data_exclusion_in_graph():
    """Verify that graph node and edge properties do not expose full sensitive message text or credentials."""
    SessionLocal = get_sessionmaker()
    with SessionLocal() as db:
        graph = build_threat_graph(db=db, limit=50, include_demo=True)
        for node in graph.nodes:
            props = node.properties
            # Passwords or private keys must never exist
            assert "password" not in props
            assert "otp" not in props
            assert "private_key" not in props
            # Full raw message should not be present (only preview)
            assert "raw_message" not in props
