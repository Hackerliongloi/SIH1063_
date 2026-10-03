import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from httpx import Response
from unittest.mock import patch, MagicMock
from app.modules.webhook import publish_feed_item, poll_webhooks, retry_webhook_event
from app.models import Base, WebhookOutbox, Asset, User, Expedition
from app.modules.feed import FeedItem
from sqlalchemy import select, create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_feed_item(db_session):
    u = User(email="testwebhook@example.com", password_hash="hash", role="admin")
    db_session.add(u)
    db_session.commit()
    
    exp = Expedition(name="Test Exp")
    db_session.add(exp)
    db_session.commit()

    asset = Asset(
        type="photo",
        title="Test Photo",
        processing_status="ready",
        review_status="approved",
        file_key="test-key.jpg",
        created_by=u.id,
        expedition_id=exp.id
    )
    db_session.add(asset)
    db_session.commit()
    
    item = FeedItem(
        kind="post",
        caption="Testing Webhooks",
        title="Webhook Post",
        primary_asset_id=asset.id,
        created_by=u.id,
        expedition_id=exp.id,
        status="approved"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item

def test_webhook_outbox_enqueue(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    
    publish_feed_item(db_session, test_feed_item)
    db_session.flush()
    
    assert test_feed_item.status == "published"
    assert test_feed_item.published_at is not None
    
    outbox = db_session.scalars(select(WebhookOutbox)).first()
    assert outbox is not None
    assert outbox.state == "pending"
    assert outbox.feed_item_id == test_feed_item.id
    assert outbox.payload["portal_url"].endswith(f"/community?view_id={test_feed_item.id}&view_type=post")

def test_publish_is_idempotent(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    assert len(db_session.scalars(select(WebhookOutbox)).all()) == 1

def test_webhook_polling_success(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.is_success = True
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp
        
        poll_webhooks(db_session)
        
        outbox = db_session.scalars(select(WebhookOutbox)).first()
        assert outbox.state == "delivered"
        assert mock_post.called

def test_webhook_polling_429(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.is_success = False
        mock_resp.status_code = 429
        mock_resp.headers = {"Retry-After": "10"}
        mock_post.return_value = mock_resp
        
        poll_webhooks(db_session)
        
        outbox = db_session.scalars(select(WebhookOutbox)).first()
        assert outbox.state == "retry_wait"
        assert outbox.next_attempt_at is not None
        assert "429" in outbox.last_error

def test_webhook_polling_dead_letter(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.is_success = False
        mock_resp.status_code = 400
        mock_resp.text = "Bad Request"
        mock_post.return_value = mock_resp
        
        poll_webhooks(db_session)
        
        outbox = db_session.scalars(select(WebhookOutbox)).first()
        assert outbox.state == "dead_letter"

def test_dead_letter_can_be_retried(db_session, test_feed_item, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "social_webhook_enabled", True)
    monkeypatch.setattr(settings, "social_webhook_url", "http://test.local")
    publish_feed_item(db_session, test_feed_item)
    db_session.commit()
    event = db_session.scalar(select(WebhookOutbox))
    event.state = "dead_letter"
    event.attempts = 5
    db_session.commit()
    assert retry_webhook_event(db_session, event.id)
    assert event.state == "pending"
    assert event.attempts == 0
    assert not retry_webhook_event(db_session, event.id)

def test_public_media_route_authorization(db_session, test_feed_item, monkeypatch):
    from app.main import app
    from fastapi.testclient import TestClient
    from app.core.db import get_db
    from app.modules.feed import FeedMedia
    import app.main as main_module

    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    monkeypatch.setattr(main_module, "file_size", lambda _key: 1)
    monkeypatch.setattr(main_module, "stream_file", lambda _key, _start, _end: iter([b"x"]))
    client = TestClient(app)
    media = FeedMedia(item_id=test_feed_item.id, idx=0, asset_id=test_feed_item.primary_asset_id,
                      kind="image", alt_text="Test")
    db_session.add(media)
    db_session.commit()
    try:
        unpublished = client.get(f"/api/public/feed/{test_feed_item.id}/media/{media.id}")
        assert unpublished.status_code == 404

        test_feed_item.status = "published"
        db_session.commit()
        valid = client.get(f"/api/public/feed/{test_feed_item.id}/media/{media.id}")
        unrelated = client.get(f"/api/public/feed/{test_feed_item.id + 999}/media/{media.id}")
        assert valid.status_code == 200
        assert valid.content == b"x"
        assert unrelated.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)
