"""Add first-class Stories, source citations and richer feed metadata.

revision = "0002_outreach_stories"
down_revision = "0001_initial"
branch_labels = None
depends_on = None
"""
from alembic import op
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, inspect
from app.core.db import Base
from app import models
from app.modules import feed

revision = "0002_outreach_stories"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if "feed_items" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("feed_items")}
        for name, column in (
            ("title", Column("title", String(300), nullable=False, server_default="")),
            ("description", Column("description", Text(), nullable=False, server_default="")),
            ("region", Column("region", String(120), nullable=True)),
            ("station", Column("station", String(120), nullable=True)),
            ("event_at", Column("event_at", DateTime(timezone=True), nullable=True)),
            ("approved_at", Column("approved_at", DateTime(timezone=True), nullable=True)),
            ("reviewer_id", Column("reviewer_id", Integer(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)),
            ("updated_at", Column("updated_at", DateTime(timezone=True), nullable=True)),
        ):
            if name not in existing:
                op.add_column("feed_items", column)
    for table, additions in {
        "assets": (("station", Column("station", String(120), nullable=True)),),
        "expeditions": (("start_date", Column("start_date", Date(), nullable=True)),
                        ("end_date", Column("end_date", Date(), nullable=True))),
        "drafts": (("ai_assisted", Column("ai_assisted", Boolean(), nullable=False, server_default="false")),
                   ("approved_at", Column("approved_at", DateTime(timezone=True), nullable=True)),
                   ("updated_at", Column("updated_at", DateTime(timezone=True), nullable=True))),
    }.items():
        if table in inspector.get_table_names():
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, column in additions:
                if name not in existing:
                    op.add_column(table, column)
    Base.metadata.create_all(bind=bind)


def downgrade():
    bind = op.get_bind()
    for table in ("story_citations", "story_slides", "outreach_stories", "feed_citations"):
        if table in inspect(bind).get_table_names():
            Base.metadata.tables[table].drop(bind=bind, checkfirst=True)
    if "feed_items" in inspect(bind).get_table_names():
        existing = {column["name"] for column in inspect(bind).get_columns("feed_items")}
        for name in ("updated_at", "reviewer_id", "approved_at", "event_at", "station", "region", "description", "title"):
            if name in existing:
                op.drop_column("feed_items", name)
    for table, names in (("assets", ("station",)), ("expeditions", ("end_date", "start_date"))):
        if table in inspect(bind).get_table_names():
            existing = {column["name"] for column in inspect(bind).get_columns(table)}
            for name in names:
                if name in existing:
                    op.drop_column(table, name)
    if "drafts" in inspect(bind).get_table_names():
        existing = {column["name"] for column in inspect(bind).get_columns("drafts")}
        for name in ("updated_at", "approved_at", "ai_assisted"):
            if name in existing:
                op.drop_column("drafts", name)
