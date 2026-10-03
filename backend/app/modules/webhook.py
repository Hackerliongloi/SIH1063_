"""Transactional outbox delivery for published feed items."""
import logging
import random
import uuid
from datetime import timedelta
from urllib.parse import urlparse

import httpx
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models import WebhookOutbox, now

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 8
LEASE = timedelta(minutes=5)


def _public_url(path: str) -> str:
    return f"{settings.public_app_url.rstrip('/')}{path}"


def build_webhook_payload(item) -> dict:
    media_list = []
    for media in item.media:
        asset = media.asset
        if not asset or asset.access_level!="public":
            continue
        url = asset.external_url or _public_url(f"/api/public/feed/{item.id}/media/{media.id}")
        media_list.append({"kind": media.kind, "url": url, "alt_text": media.alt_text})
    if not media_list and item.primary_asset and item.primary_asset.access_level=="public":
        asset = item.primary_asset
        if asset.type in {"photo", "video", "image"}:
            url = asset.external_url or _public_url(f"/api/public/feed/{item.id}/asset/{asset.id}")
            media_list.append({"kind": "video" if asset.type == "video" else "image", "url": url, "alt_text": ""})

    event_id = str(uuid.uuid4())
    return {
        "schema_version": 1,
        "event_id": event_id,
        "event_type": "polar.feed_item.published",
        "published_at": item.published_at.isoformat() if item.published_at else now().isoformat(),
        "portal_url": _public_url(f"/community?view_id={item.id}&view_type={'reel' if item.kind == 'reel' else 'post'}"),
        "post": {"id": item.id, "kind": item.kind, "title": item.title, "text": item.caption,
                 "hashtags": item.hashtags or [], "media": media_list},
    }


def publish_feed_item(db: Session, item):
    """Update publish state and add its immutable event to this DB transaction."""
    # Serialize concurrent manual and scheduled publish attempts. PostgreSQL honors
    # this row lock; SQLite safely ignores it for single-process local development.
    requested_kind = item.kind
    item_model = type(item)
    item = db.scalar(select(item_model).where(item_model.id == item.id)
                     # FeedItem eagerly joins its nullable primary_asset. Locking
                     # the whole joined result makes PostgreSQL reject FOR UPDATE
                     # against the nullable side of that outer join. Restrict the
                     # lock to the feed_items row; the asset is only read to build
                     # the immutable webhook payload.
                     .with_for_update(of=item_model)
                     .execution_options(populate_existing=True))
    if item is None:
        return
    # Editorial transitions normalize social platform kinds before this call; retain
    # that intended value when the locking read refreshes the ORM object.
    item.kind = requested_kind
    if item.status == "published":
        return
    item.status = "published"
    item.published_at = now()
    item.scheduled_at = None
    item.updated_at = now()
    if settings.social_webhook_enabled and settings.social_webhook_url:
        payload = build_webhook_payload(item)
        db.add(WebhookOutbox(event_id=payload["event_id"], event_type=payload["event_type"],
                             feed_item_id=item.id, payload=payload, state="pending"))


def _retry_at(attempts: int):
    seconds = min(3600, 2 ** min(attempts, 10))
    return now() + timedelta(seconds=seconds * random.uniform(0.8, 1.2))


def poll_webhooks(db: Session):
    """Atomically lease one due event, deliver it, then persist a bounded retry state."""
    if not settings.social_webhook_enabled or not settings.social_webhook_url:
        return
    current = now()
    due = or_(WebhookOutbox.state == "pending",
              (WebhookOutbox.state == "retry_wait") & (WebhookOutbox.next_attempt_at <= current),
              (WebhookOutbox.state == "sending") & (WebhookOutbox.updated_at < current - LEASE))
    candidate = db.scalar(select(WebhookOutbox.id).where(due).order_by(WebhookOutbox.created_at).limit(1))
    if candidate is None:
        return
    # Compare-and-swap on state and lease timestamp. Concurrent workers that selected
    # the same row cannot both acquire it, on either SQLite or PostgreSQL.
    old = db.get(WebhookOutbox, candidate)
    if old is None:
        return
    result = db.execute(update(WebhookOutbox).where(
        WebhookOutbox.id == candidate,
        WebhookOutbox.state == old.state,
        WebhookOutbox.updated_at == old.updated_at,
    ).values(state="sending", updated_at=current, attempts=WebhookOutbox.attempts + 1))
    if result.rowcount != 1:
        db.rollback()
        return
    db.commit()
    event = db.scalar(select(WebhookOutbox).where(WebhookOutbox.id == candidate)
                      .execution_options(populate_existing=True))
    if event is None:
        return
    try:
        parsed = urlparse(settings.social_webhook_url)
        if parsed.scheme != "https" and settings.environment.lower() == "production":
            raise ValueError("Webhook URL must use HTTPS in production")
        headers = {"Content-Type": "application/json"}
        if settings.social_webhook_secret:
            headers["Authorization"] = f"Bearer {settings.social_webhook_secret}"
        with httpx.Client(timeout=httpx.Timeout(10.0, connect=5.0), follow_redirects=False) as client:
            response = client.post(settings.social_webhook_url, json=event.payload, headers=headers)
        if response.is_success:
            event.state, event.last_error, event.next_attempt_at = "delivered", None, None
        elif response.status_code == 429 or response.status_code >= 500:
            event.state = "retry_wait" if event.attempts < MAX_ATTEMPTS else "dead_letter"
            retry_after = response.headers.get("Retry-After", "")
            delay = int(retry_after) if retry_after.isdigit() else None
            event.next_attempt_at = now() + timedelta(seconds=min(delay, 3600)) if delay is not None else _retry_at(event.attempts)
            event.last_error = f"Webhook returned HTTP {response.status_code}"
        else:
            event.state, event.next_attempt_at = "dead_letter", None
            event.last_error = f"Webhook returned HTTP {response.status_code}"
    except (httpx.TimeoutException, httpx.NetworkError) as exc:
        event.state = "retry_wait" if event.attempts < MAX_ATTEMPTS else "dead_letter"
        event.next_attempt_at = _retry_at(event.attempts) if event.state == "retry_wait" else None
        event.last_error = f"Webhook request failed ({type(exc).__name__})"
    except Exception as exc:
        logger.exception("Webhook delivery failed for event %s", event.event_id)
        event.state, event.next_attempt_at = "dead_letter", None
        event.last_error = f"Webhook delivery failed ({type(exc).__name__})"
    event.updated_at = now()
    db.commit()


def retry_webhook_event(db: Session, event_id: int):
    event = db.get(WebhookOutbox, event_id)
    if event is None:
        return False
    if event.state != "dead_letter":
        return False
    event.state, event.attempts, event.next_attempt_at = "pending", 0, None
    event.last_error, event.updated_at = None, now()
    db.commit()
    return True
