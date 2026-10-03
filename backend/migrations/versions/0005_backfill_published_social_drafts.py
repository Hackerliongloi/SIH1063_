"""Ensure published editorial social drafts have public feed records.

Revision ID: 0005_social_drafts
Revises: bd23fc0ccf41
"""
from alembic import op
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Asset, Draft, DraftCitation
from app.modules.feed import (
    FeedCitation,
    FeedItem,
    OutreachStory,
    StoryCitation,
    StorySlide,
)

revision = "0005_social_drafts"
down_revision = "bd23fc0ccf41"
branch_labels = None
depends_on = None

SOCIAL_KINDS = {"post", "carousel", "reel", "instagram", "twitter", "facebook"}
EDITORIAL_STATES = {"draft", "changes_requested", "in_review", "approved", "scheduled", "published", "archived"}
FEED_KIND = {
    "post": "post",
    "carousel": "carousel",
    "reel": "reel",
    "instagram": "post",
    "twitter": "post",
    "facebook": "post",
}


def upgrade():
    session = Session(bind=op.get_bind())
    try:
        drafts = session.scalars(
            select(Draft).where(
                Draft.status.in_(EDITORIAL_STATES),
                Draft.kind.in_(SOCIAL_KINDS | {"story"}),
            )
        ).all()

        for draft in drafts:
            published_at = (
                draft.published_at or draft.updated_at or draft.created_at
                if draft.status == "published"
                else None
            )
            citations = session.scalars(
                select(DraftCitation).where(DraftCitation.draft_id == draft.id)
            ).all()

            if draft.kind == "story":
                story = session.scalar(
                    select(OutreachStory).where(OutreachStory.source_draft_id == draft.id)
                )
                if story is None:
                    story = OutreachStory(
                        title=draft.title,
                        summary=draft.body_md[:500],
                        status=draft.status,
                        expedition_id=draft.expedition_id,
                        ai_assisted=draft.ai_assisted,
                        source_draft_id=draft.id,
                        created_by=draft.created_by,
                        approved_at=draft.approved_at,
                        scheduled_at=draft.scheduled_at,
                        published_at=published_at,
                        reviewer_id=draft.reviewer_id,
                    )
                    session.add(story)
                    session.flush()
                    slide = StorySlide(
                        story_id=story.id,
                        position=0,
                        kind="text",
                        title=draft.title,
                        body=draft.body_md[:3000],
                        duration_seconds=7,
                    )
                    session.add(slide)
                    session.flush()
                    for citation in citations:
                        asset = session.get(Asset, citation.asset_id) if citation.asset_id else None
                        session.add(StoryCitation(
                            story_id=story.id,
                            slide_id=slide.id,
                            asset_id=citation.asset_id,
                            chunk_id=citation.chunk_id,
                            claim_text=citation.claim_text,
                            span_text=citation.span_text,
                            supported=citation.supported,
                            label=asset.title if asset else "",
                        ))
                else:
                    story.status = draft.status
                    story.scheduled_at = draft.scheduled_at
                    story.published_at = published_at
                    story.approved_at = story.approved_at or draft.approved_at
                    story.reviewer_id = draft.reviewer_id
                continue

            item = session.scalar(
                select(FeedItem).where(FeedItem.origin_draft_id == draft.id)
            )
            if item is None:
                first_asset = next(
                    (session.get(Asset, c.asset_id) for c in citations if c.asset_id),
                    None,
                )
                media_asset = first_asset if first_asset and first_asset.type in {"photo", "video"} else None
                item = FeedItem(
                    kind=FEED_KIND[draft.kind],
                    caption=draft.body_md,
                    title=draft.title,
                    description=draft.body_md,
                    expedition_id=draft.expedition_id,
                    region=first_asset.region if first_asset else None,
                    station=first_asset.station if first_asset else None,
                    primary_asset_id=media_asset.id if media_asset else None,
                    source="auto",
                    origin_draft_id=draft.id,
                    status=draft.status,
                    scheduled_at=draft.scheduled_at,
                    approved_at=draft.approved_at,
                    published_at=published_at,
                    reviewer_id=draft.reviewer_id,
                    ai_assisted=draft.ai_assisted,
                    created_by=draft.created_by,
                )
                session.add(item)
                session.flush()
                for citation in citations:
                    asset = session.get(Asset, citation.asset_id) if citation.asset_id else None
                    session.add(FeedCitation(
                        item_id=item.id,
                        asset_id=citation.asset_id,
                        chunk_id=citation.chunk_id,
                        claim_text=citation.claim_text,
                        span_text=citation.span_text,
                        supported=citation.supported,
                        label=asset.title if asset else "",
                    ))
            else:
                item.kind = FEED_KIND[draft.kind]
                item.title = draft.title
                item.caption = draft.body_md
                item.description = draft.body_md
                item.status = draft.status
                item.scheduled_at = draft.scheduled_at
                item.published_at = published_at
                item.approved_at = item.approved_at or draft.approved_at
                item.reviewer_id = draft.reviewer_id

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def downgrade():
    # This migration repairs public records and intentionally does not delete them.
    pass
