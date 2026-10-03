import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import app and dependencies
from app.main import app, get_db, require_roles
from app.models import Asset, AssetReviewHistory

client = TestClient(app)

class MockUser:
    def __init__(self, id, role):
        self.id = id
        self.role = role

class MockAsset:
    def __init__(self, id=1, review_status="draft", created_by=1):
        self.id = id
        self.review_status = review_status
        self.created_by = created_by
        self.updated_at = None

def _get_mock_db(mock_asset):
    db = MagicMock()
    db.get.return_value = mock_asset
    return db

def test_transition_submit_success():
    asset = MockAsset(id=1, review_status="draft", created_by=100)
    app.dependency_overrides[get_db] = lambda: _get_mock_db(asset)
    app.dependency_overrides[require_roles] = lambda *args: lambda: MockUser(id=100, role="submitter")
    
    response = client.post("/api/datasets/1/transition", json={"action": "submit", "comment": ""})
    
    assert response.status_code == 200
    assert response.json()["review_status"] == "in_review"
    assert asset.review_status == "in_review"

def test_transition_submit_unauthorized_user():
    asset = MockAsset(id=1, review_status="draft", created_by=100)
    app.dependency_overrides[get_db] = lambda: _get_mock_db(asset)
    app.dependency_overrides[require_roles] = lambda *args: lambda: MockUser(id=200, role="submitter")
    
    response = client.post("/api/datasets/1/transition", json={"action": "submit", "comment": ""})
    
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]

def test_transition_approve_as_reviewer():
    asset = MockAsset(id=1, review_status="in_review", created_by=100)
    app.dependency_overrides[get_db] = lambda: _get_mock_db(asset)
    app.dependency_overrides[require_roles] = lambda *args: lambda: MockUser(id=200, role="reviewer")
    
    response = client.post("/api/datasets/1/transition", json={"action": "approve", "comment": "Looks good"})
    
    assert response.status_code == 200
    assert asset.review_status == "approved"

def test_transition_reject_requires_comment():
    asset = MockAsset(id=1, review_status="in_review", created_by=100)
    app.dependency_overrides[get_db] = lambda: _get_mock_db(asset)
    app.dependency_overrides[require_roles] = lambda *args: lambda: MockUser(id=200, role="reviewer")
    
    response = client.post("/api/datasets/1/transition", json={"action": "request_changes", "comment": "   "})
    
    assert response.status_code == 422
    assert "Comment is required" in response.json()["detail"]

def test_transition_reject_success():
    asset = MockAsset(id=1, review_status="in_review", created_by=100)
    app.dependency_overrides[get_db] = lambda: _get_mock_db(asset)
    app.dependency_overrides[require_roles] = lambda *args: lambda: MockUser(id=200, role="reviewer")
    
    response = client.post("/api/datasets/1/transition", json={"action": "request_changes", "comment": "Missing data"})
    
    assert response.status_code == 200
    assert asset.review_status == "rejected"
