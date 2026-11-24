from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Trutify Verification Microservice"
    assert data["status"] == "operational"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "trutify-verification-service"
    assert "timestamp" in data


def test_verify_endpoint_valid_claim():
    payload = {
        "claim": "The government has announced a nationwide school closure for one month."
    }
    response = client.post("/api/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["original_claim"] == payload["claim"]
    assert data["verdict"] in ["VERIFIED", "FALSE", "MISLEADING", "PARTIALLY TRUE", "UNVERIFIED"]
    assert 0 <= data["confidence"] <= 100
    assert "summary" in data
    assert "explanation" in data
    assert isinstance(data["supporting_evidence"], list)
    assert isinstance(data["contradicting_evidence"], list)
    assert isinstance(data["contextual_evidence"], list)


def test_verify_endpoint_invalid_short_claim():
    payload = {"claim": "hi"}  # shorter than min_length=5
    response = client.post("/api/verify", json=payload)
    assert response.status_code == 422  # Pydantic validation failure


def test_verify_endpoint_missing_claim():
    payload = {}
    response = client.post("/api/verify", json=payload)
    assert response.status_code == 422
