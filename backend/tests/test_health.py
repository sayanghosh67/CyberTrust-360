import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "CyberTrust 360"
    assert data["team"] == "Technix Pro"
    assert data["status"] == "online"


def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "CyberTrust 360"
    assert data["team"] == "Technix Pro"
    assert "status" in data
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "timestamp" in data
    assert "database" in data
    assert "status" in data["database"]
    assert "services" in data
    assert data["services"]["threat_engine"] == "ready"


def test_404_error_handling():
    response = client.get("/api/nonexistent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert data["error_code"] == "HTTP_404"
    assert "timestamp" in data
