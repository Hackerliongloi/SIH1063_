"""
Unit tests for the editorial draft transition cascade logic.

These tests verify that publishing/approving/unpublishing a draft
correctly propagates the status to its linked FeedItem or OutreachStory.

Run: python -m pytest backend/tests/test_transition_cascade.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, call
import pytest

# ---------------------------------------------------------------------------
# Stubs mimicking the ORM models (no DB needed)
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)

class _FeedItem:
    def __init__(self, kind="post", origin_draft_id=None, status="draft"):
        self.kind = kind
        self.origin_draft_id = origin_draft_id
        self.status = status
        self.updated_at = _now()
        self.published_at = None
        self.scheduled_at = None
        self.approved_at = None
        self.reviewer_id = None

class _OutreachStory:
    def __init__(self, source_draft_id=None, status="draft"):
        self.source_draft_id = source_draft_id
        self.status = status
        self.updated_at = _now()
        self.published_at = None
        self.scheduled_at = None
        self.approved_at = None
        self.reviewer_id = None

class _Draft:
    def __init__(self, id=1, kind="post", status="approved", ai_assisted=False, scheduled_at=None):
        self.id = id
        self.kind = kind
        self.status = status
        self.ai_assisted = ai_assisted
        self.scheduled_at = scheduled_at
        self.published_at = None
        self.approved_at = None
        self.reviewer_id = None
        self.updated_at = _now()

# ---------------------------------------------------------------------------
# The cascade logic extracted for unit testing
# (mirrors main.py transition() lines 443–470)
# ---------------------------------------------------------------------------

def apply_cascade(draft, action, linked_item=None, linked_story=None, user_id=1):
    """Replicate the cascade logic from main.py transition() for testing."""
    from datetime import datetime, timezone
    now = lambda: datetime.now(timezone.utc)

    linked_states = {
        "submit": "in_review",
        "approve": "approved",
        "request_changes": "changes_requested",
        "reject": "rejected",
        "schedule": "scheduled",
        "publish": "published",
        "unschedule": "approved",
        "unpublish": "approved",
        "archive": "archived",
    }

    # Apply to Draft itself
    draft.status = linked_states[action]
    if draft.status == "published":
        draft.published_at = now()
    if action in {"approve", "request_changes", "reject"}:
        draft.reviewer_id = user_id
    if action == "approve":
        draft.approved_at = now()
    if action == "unpublish":
        draft.published_at = None
        draft.scheduled_at = None
    draft.updated_at = now()

    # Cascade to linked FeedItem
    if draft.kind in {"reel", "post", "carousel"}:
        x = linked_item
        if x and x.status in {"draft", "changes_requested", "in_review", "approved", "scheduled", "published", "archived"}:
            x.status = linked_states[action]
            x.updated_at = now()
            if action in {"approve", "request_changes", "reject"}:
                x.reviewer_id = user_id
            if action == "approve":
                x.approved_at = now()
            if action == "publish":
                x.published_at = now()
            if action == "schedule":
                x.scheduled_at = draft.scheduled_at
                x.published_at = None
            if action in {"unpublish", "unschedule"}:
                x.published_at = None
                x.scheduled_at = None

    # Cascade to linked OutreachStory
    elif draft.kind == "story":
        s = linked_story
        if s and s.status in {"draft", "changes_requested", "in_review", "approved", "scheduled", "published", "archived"}:
            s.status = linked_states[action]
            s.updated_at = now()
            if action in {"approve", "request_changes", "reject"}:
                s.reviewer_id = user_id
            if action == "approve":
                s.approved_at = now()
            if action == "publish":
                s.published_at = now()
            if action == "schedule":
                s.scheduled_at = draft.scheduled_at
                s.published_at = None
            if action in {"unpublish", "unschedule"}:
                s.published_at = None
                s.scheduled_at = None

# ---------------------------------------------------------------------------
# Tests: FeedItem cascade for post
# ---------------------------------------------------------------------------

def test_post_publish_cascades_feed_item_status():
    draft = _Draft(kind="post", status="approved")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="approved")
    apply_cascade(draft, "publish", linked_item=fi)
    assert draft.status == "published"
    assert fi.status == "published"
    assert fi.published_at is not None


def test_post_approve_cascades_feed_item():
    draft = _Draft(kind="post", status="in_review")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="in_review")
    apply_cascade(draft, "approve", linked_item=fi)
    assert draft.status == "approved"
    assert fi.status == "approved"
    assert fi.approved_at is not None


def test_post_unpublish_clears_published_at():
    draft = _Draft(kind="post", status="published")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="published")
    fi.published_at = _now()
    apply_cascade(draft, "unpublish", linked_item=fi)
    assert draft.status == "approved"
    assert fi.status == "approved"
    assert fi.published_at is None
    assert fi.scheduled_at is None


def test_post_submit_cascades_to_in_review():
    draft = _Draft(kind="post", status="draft")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="draft")
    apply_cascade(draft, "submit", linked_item=fi)
    assert draft.status == "in_review"
    assert fi.status == "in_review"


def test_post_reject_cascades_and_sets_reviewer():
    draft = _Draft(kind="post", status="in_review")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="in_review")
    apply_cascade(draft, "reject", linked_item=fi, user_id=99)
    assert draft.status == "rejected"
    assert fi.status == "rejected"
    assert fi.reviewer_id == 99


# ---------------------------------------------------------------------------
# Tests: FeedItem cascade for carousel
# ---------------------------------------------------------------------------

def test_carousel_publish_cascades():
    draft = _Draft(kind="carousel", status="approved")
    fi = _FeedItem(kind="carousel", origin_draft_id=draft.id, status="approved")
    apply_cascade(draft, "publish", linked_item=fi)
    assert fi.status == "published"
    assert fi.published_at is not None


def test_carousel_no_cascade_when_linked_item_missing():
    """If no linked FeedItem exists, cascade should not error."""
    draft = _Draft(kind="carousel", status="approved")
    apply_cascade(draft, "publish", linked_item=None)  # must not raise
    assert draft.status == "published"


# ---------------------------------------------------------------------------
# Tests: OutreachStory cascade for story
# ---------------------------------------------------------------------------

def test_story_publish_cascades_outreach_story():
    draft = _Draft(kind="story", status="approved")
    story = _OutreachStory(source_draft_id=draft.id, status="approved")
    apply_cascade(draft, "publish", linked_story=story)
    assert draft.status == "published"
    assert story.status == "published"
    assert story.published_at is not None


def test_story_approve_cascades():
    draft = _Draft(kind="story", status="in_review")
    story = _OutreachStory(source_draft_id=draft.id, status="in_review")
    apply_cascade(draft, "approve", linked_story=story, user_id=42)
    assert story.status == "approved"
    assert story.approved_at is not None
    assert story.reviewer_id == 42


def test_story_unpublish_clears_timestamps():
    draft = _Draft(kind="story", status="published")
    story = _OutreachStory(source_draft_id=draft.id, status="published")
    story.published_at = _now()
    story.scheduled_at = _now()
    apply_cascade(draft, "unpublish", linked_story=story)
    assert story.status == "approved"
    assert story.published_at is None
    assert story.scheduled_at is None


def test_story_no_cascade_when_linked_story_missing():
    draft = _Draft(kind="story", status="approved")
    apply_cascade(draft, "publish", linked_story=None)  # must not raise
    assert draft.status == "published"


def test_story_request_changes_cascades():
    draft = _Draft(kind="story", status="in_review")
    story = _OutreachStory(source_draft_id=draft.id, status="in_review")
    apply_cascade(draft, "request_changes", linked_story=story, user_id=7)
    assert story.status == "changes_requested"
    assert story.reviewer_id == 7


# ---------------------------------------------------------------------------
# Tests: article kind — no cascade (article is served directly from Draft)
# ---------------------------------------------------------------------------

def test_article_publish_does_not_cascade_to_feed_item():
    """Articles have no linked FeedItem — cascade block must be skipped entirely."""
    draft = _Draft(kind="article", status="approved")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="approved")
    apply_cascade(draft, "publish", linked_item=fi)
    # Draft is published
    assert draft.status == "published"
    # But the (incorrectly linked) feed item must NOT be touched
    assert fi.status == "approved", "Article publish must not touch any FeedItem"


# ---------------------------------------------------------------------------
# Tests: reel still works after refactor
# ---------------------------------------------------------------------------

def test_reel_publish_still_works():
    draft = _Draft(kind="reel", status="approved")
    fi = _FeedItem(kind="reel", origin_draft_id=draft.id, status="approved")
    apply_cascade(draft, "publish", linked_item=fi)
    assert fi.status == "published"
    assert fi.published_at is not None


def test_reel_unschedule_clears_timestamps():
    draft = _Draft(kind="reel", status="scheduled")
    fi = _FeedItem(kind="reel", origin_draft_id=draft.id, status="scheduled")
    fi.published_at = _now()
    fi.scheduled_at = _now()
    apply_cascade(draft, "unschedule", linked_item=fi)
    assert fi.status == "approved"
    assert fi.published_at is None
    assert fi.scheduled_at is None


# ---------------------------------------------------------------------------
# Tests: schedule action propagates scheduled_at timestamp
# ---------------------------------------------------------------------------

def test_post_schedule_sets_scheduled_at_on_feed_item():
    future = datetime(2027, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    draft = _Draft(kind="post", status="approved", scheduled_at=future)
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="approved")
    apply_cascade(draft, "schedule", linked_item=fi)
    assert fi.status == "scheduled"
    assert fi.scheduled_at == future
    assert fi.published_at is None


def test_story_schedule_sets_scheduled_at():
    future = datetime(2027, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    draft = _Draft(kind="story", status="approved", scheduled_at=future)
    story = _OutreachStory(source_draft_id=draft.id, status="approved")
    apply_cascade(draft, "schedule", linked_story=story)
    assert story.status == "scheduled"
    assert story.scheduled_at == future
    assert story.published_at is None


# ---------------------------------------------------------------------------
# Tests: linked record in terminal state is not overwritten
# ---------------------------------------------------------------------------

def test_already_archived_feed_item_is_still_synced():
    """archived is now included in the guard set, so it can be moved out of archive by any transition."""
    draft = _Draft(kind="post", status="draft")
    fi = _FeedItem(kind="post", origin_draft_id=draft.id, status="archived")
    apply_cascade(draft, "submit", linked_item=fi)
    # archived is in allowed set — it should be synced
    assert fi.status == "in_review"
