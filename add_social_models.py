import re

with open("d:/SIH1063_/backend/app/models.py", "r", encoding="utf-8") as f:
    content = f.read()

new_models = """
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
"""

if "class PublicProfile" not in content:
    with open("d:/SIH1063_/backend/app/models.py", "a", encoding="utf-8") as f:
        f.write(new_models)
    print("Added social models to models.py")
else:
    print("Social models already present.")
