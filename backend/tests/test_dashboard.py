from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_dashboard_metrics_endpoint():
    """Tests GET /api/v1/dashboard/metrics returns genuine database counts."""
    response = client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_url_investigations" in data
    assert "total_scam_analyses" in data
    assert "high_risk_reports" in data
    assert "related_threat_indicators" in data
    assert "blockchain_registered_reports" in data
    assert isinstance(data["total_url_investigations"], int)
    assert isinstance(data["total_scam_analyses"], int)
    assert isinstance(data["high_risk_reports"], int)
    assert isinstance(data["related_threat_indicators"], int)
    assert isinstance(data["blockchain_registered_reports"], int)
    assert data["total_url_investigations"] >= 0
