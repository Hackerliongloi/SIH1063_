from datetime import date, datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, Date, ForeignKey, Float, JSON, UniqueConstraint, Index, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .core.db import Base
from pgvector.sqlalchemy import Vector

class VectorJSON(TypeDecorator):
    """Store vectors as pgvector on Postgres and JSON on lightweight SQLite dev DBs."""
    impl=JSON
    cache_ok=True
    def __init__(self,dimensions:int):self.dimensions=dimensions;super().__init__()
    def load_dialect_impl(self,dialect):
        return dialect.type_descriptor(Vector(self.dimensions) if dialect.name=="postgresql" else JSON())

def now(): return datetime.now(timezone.utc)
class User(Base):
    __tablename__="users"
    id: Mapped[int]=mapped_column(primary_key=True); email: Mapped[str]=mapped_column(String(320), unique=True, index=True); password_hash: Mapped[str]=mapped_column(String(255)); role: Mapped[str]=mapped_column(String(20), default="viewer"); is_active: Mapped[bool]=mapped_column(Boolean, default=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
class ActivationToken(Base):
    __tablename__="activation_tokens"
    id: Mapped[int]=mapped_column(primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True); token_hash: Mapped[str]=mapped_column(String(255)); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True)); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Expedition(Base):
    __tablename__="expeditions"
    id: Mapped[int]=mapped_column(primary_key=True); name: Mapped[str]=mapped_column(String(240), index=True); year: Mapped[int|None]=mapped_column(Integer, nullable=True); region: Mapped[str|None]=mapped_column(String(120), nullable=True); start_date:Mapped[date|None]=mapped_column(Date,nullable=True);end_date:Mapped[date|None]=mapped_column(Date,nullable=True);stations: Mapped[list]=mapped_column(JSON, default=list); description: Mapped[str]=mapped_column(Text, default="")
class Asset(Base):
    __tablename__="assets"
    id: Mapped[int]=mapped_column(primary_key=True); type: Mapped[str]=mapped_column(String(30), index=True); title: Mapped[str]=mapped_column(String(500), index=True); description: Mapped[str]=mapped_column(Text, default=""); expedition_id: Mapped[int|None]=mapped_column(ForeignKey("expeditions.id", ondelete="SET NULL"), nullable=True, index=True); region: Mapped[str|None]=mapped_column(String(120), nullable=True, index=True); station:Mapped[str|None]=mapped_column(String(120),nullable=True,index=True);year: Mapped[int|None]=mapped_column(Integer, nullable=True, index=True); file_key: Mapped[str|None]=mapped_column(String(800), nullable=True); thumb_key: Mapped[str|None]=mapped_column(String(800), nullable=True); external_url: Mapped[str|None]=mapped_column(String(2000), nullable=True); processing_status: Mapped[str]=mapped_column(String(20), default="ready", index=True); review_status: Mapped[str]=mapped_column(String(30), default="draft", index=True); error: Mapped[str|None]=mapped_column(Text, nullable=True); version: Mapped[int]=mapped_column(Integer, default=1); created_by: Mapped[int|None]=mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now); updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now, onupdate=now); metadata_json: Mapped[dict]=mapped_column(JSON, default=dict)
    expedition=relationship(Expedition)
    __table_args__=(Index("ix_assets_type_expedition_year_region","type","expedition_id","year","region"),)
class AssetVersion(Base):
    __tablename__="asset_versions"
    id: Mapped[int]=mapped_column(primary_key=True); asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True); version: Mapped[int]=mapped_column(Integer); snapshot_json: Mapped[dict]=mapped_column(JSON); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)

class AssetReviewHistory(Base):
    __tablename__="asset_review_history"
    id: Mapped[int]=mapped_column(primary_key=True); asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True); actor_id: Mapped[int|None]=mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True); action: Mapped[str]=mapped_column(String(50)); from_status: Mapped[str]=mapped_column(String(30)); to_status: Mapped[str]=mapped_column(String(30)); comment: Mapped[str]=mapped_column(Text, default=""); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
class Tag(Base):
    __tablename__="tags"
    id: Mapped[int]=mapped_column(primary_key=True); name: Mapped[str]=mapped_column(String(120), unique=True); kind: Mapped[str]=mapped_column(String(30), default="theme")
class AssetTag(Base):
    __tablename__="asset_tags"
    asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id",ondelete="CASCADE"),primary_key=True); tag_id: Mapped[int]=mapped_column(ForeignKey("tags.id",ondelete="CASCADE"),primary_key=True)
class Chunk(Base):
    __tablename__="chunks"
    id: Mapped[int]=mapped_column(primary_key=True); asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id",ondelete="CASCADE"), index=True); idx: Mapped[int]=mapped_column(Integer); text: Mapped[str]=mapped_column(Text); page: Mapped[int|None]=mapped_column(Integer,nullable=True); embedding: Mapped[list|None]=mapped_column(VectorJSON(384),nullable=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    __table_args__=(Index("ix_chunks_embedding_hnsw","embedding",postgresql_using="hnsw",postgresql_ops={"embedding":"vector_cosine_ops"}),)
class ImageEmbedding(Base):
    __tablename__="image_embeddings"
    asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id",ondelete="CASCADE"),primary_key=True); embedding: Mapped[list|None]=mapped_column(VectorJSON(512),nullable=True)
    __table_args__=(Index("ix_image_embeddings_hnsw","embedding",postgresql_using="hnsw",postgresql_ops={"embedding":"vector_cosine_ops"}),)
class Draft(Base):
    __tablename__="drafts"
    id: Mapped[int]=mapped_column(primary_key=True); kind: Mapped[str]=mapped_column(String(30)); title: Mapped[str]=mapped_column(String(500)); body_md: Mapped[str]=mapped_column(Text,default=""); tone: Mapped[str]=mapped_column(String(60),default="general_public"); status: Mapped[str]=mapped_column(String(30),default="draft",index=True); ai_assisted:Mapped[bool]=mapped_column(Boolean,default=False);expedition_id: Mapped[int|None]=mapped_column(ForeignKey("expeditions.id",ondelete="SET NULL"),nullable=True); scheduled_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True); approved_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True);published_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True); created_by: Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True); reviewer_id: Mapped[int|None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"),nullable=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now);updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class DraftCitation(Base):
    __tablename__="draft_citations"
    id: Mapped[int]=mapped_column(primary_key=True); draft_id: Mapped[int]=mapped_column(ForeignKey("drafts.id",ondelete="CASCADE"),index=True); claim_text: Mapped[str]=mapped_column(Text); chunk_id: Mapped[int|None]=mapped_column(ForeignKey("chunks.id",ondelete="SET NULL"),nullable=True); asset_id: Mapped[int|None]=mapped_column(ForeignKey("assets.id",ondelete="SET NULL"),nullable=True); span_text: Mapped[str]=mapped_column(Text,default=""); supported: Mapped[bool]=mapped_column(Boolean,default=False)
class DraftComment(Base):
    __tablename__="draft_comments"
    id: Mapped[int]=mapped_column(primary_key=True); draft_id: Mapped[int]=mapped_column(ForeignKey("drafts.id",ondelete="CASCADE"),index=True); author_id: Mapped[int]=mapped_column(ForeignKey("users.id",ondelete="CASCADE")); body: Mapped[str]=mapped_column(Text,default=""); action: Mapped[str]=mapped_column(String(30)); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class SearchLog(Base):
    __tablename__="search_logs"
    id: Mapped[int]=mapped_column(primary_key=True); query: Mapped[str]=mapped_column(String(1000),index=True); filters_json: Mapped[dict]=mapped_column(JSON,default=dict); n_results: Mapped[int]=mapped_column(Integer,default=0); ts: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class ViewLog(Base):
    __tablename__="view_logs"
    id: Mapped[int]=mapped_column(primary_key=True); asset_id: Mapped[int]=mapped_column(ForeignKey("assets.id",ondelete="CASCADE"),index=True); ts: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class PortalConfig(Base):
    __tablename__="config"
    key: Mapped[str]=mapped_column(String(120),primary_key=True); value_json: Mapped[dict]=mapped_column(JSON,default=dict)

class PublicProfile(Base):
    __tablename__="public_profiles"
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    username: Mapped[str]=mapped_column(String(60), unique=True, index=True)
    display_name: Mapped[str]=mapped_column(String(120), default="")
    bio: Mapped[str]=mapped_column(Text, default="")
    avatar_asset_id: Mapped[int|None]=mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class SocialLike(Base):
    __tablename__="social_likes"
    id: Mapped[int]=mapped_column(primary_key=True)
    user_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    feed_item_id: Mapped[int|None]=mapped_column(Integer, ForeignKey("feed_items.id", ondelete="CASCADE"), nullable=True, index=True)
    story_id: Mapped[int|None]=mapped_column(Integer, ForeignKey("outreach_stories.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    __table_args__=(
        UniqueConstraint("user_id", "feed_item_id", name="uq_social_like_feed_item"),
        UniqueConstraint("user_id", "story_id", name="uq_social_like_story"),
    )

class SocialShare(Base):
    __tablename__="social_shares"
    id: Mapped[int]=mapped_column(primary_key=True)
    sender_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recipient_id: Mapped[int]=mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    feed_item_id: Mapped[int|None]=mapped_column(Integer, ForeignKey("feed_items.id", ondelete="CASCADE"), nullable=True)
    story_id: Mapped[int|None]=mapped_column(Integer, ForeignKey("outreach_stories.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    __table_args__=(
        Index("ix_social_shares_recipient_created", "recipient_id", "created_at"),
    )

class WebhookOutbox(Base):
    __tablename__ = "webhook_outbox"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    feed_item_id: Mapped[int | None] = mapped_column(ForeignKey("feed_items.id", ondelete="SET NULL"), nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    state: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
