"""
Tests for API Endpoints, Security Guards, and Intelligence Router
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_system_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"


def test_intelligence_health(client):
    res = client.get("/intelligence/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "aligner" in data["modules"]
    assert "delta_engine" in data["modules"]


def test_hardware_profiling(client):
    steer_points = [0.0] * 250
    res = client.post("/intelligence/hardware", json={"steer_trace": steer_points})
    assert res.status_code == 200
    data = res.json()
    assert "tier_label" in data
    assert "brake_threshold_m" in data


def test_career_progression_endpoint(client):
    """Honest-metrics contract (audit B3): real values only, nulls + sufficiency marker."""
    res = client.get("/intelligence/career/progression")
    assert res.status_code == 200
    data = res.json()
    assert "total_sessions" in data
    assert "total_laps_recorded" in data
    assert "pace_progression" in data
    assert "data_sufficiency" in data
    assert set(data["data_sufficiency"]) == {"sufficient", "reports_with_delta", "required"}
    # Fabricated placeholders must never come back
    assert "coaching_adherence_rate" not in data
    assert "consistency_index" not in data


def test_destructive_endpoints_require_admin_when_configured(client, monkeypatch):
    from core.config import settings
    monkeypatch.setattr(settings, "admin_api_key", "secure_token_123")

    # Request without key -> 403
    res = client.delete("/telemetry/laps/clear")
    assert res.status_code == 403

    # Request with wrong key -> 403
    res = client.delete("/telemetry/laps/clear", headers={"X-Admin-Key": "wrong_key"})
    assert res.status_code == 403

    # Request with valid key -> 200
    res = client.delete("/telemetry/laps/clear", headers={"X-Admin-Key": "secure_token_123"})
    assert res.status_code == 200
