"""Add production repository metadata and access classification.

Revision ID: 8f44d8f0c2a1
Revises: 665229bf206f
"""
from alembic import op
import sqlalchemy as sa

revision = "8f44d8f0c2a1"
down_revision = "665229bf206f"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("assets")}
    if "record_date" not in columns:
        op.add_column("assets", sa.Column("record_date", sa.Date(), nullable=True))
    if "authors" not in columns:
        op.add_column("assets", sa.Column("authors", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))
    if "access_level" not in columns:
        op.add_column("assets", sa.Column("access_level", sa.String(length=20), nullable=False, server_default="internal"))
    op.execute(sa.text("UPDATE assets SET access_level = CASE WHEN review_status = 'approved' THEN 'public' ELSE 'internal' END"))
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("assets")}
    if "ix_assets_access_level" not in indexes:
        op.create_index("ix_assets_access_level", "assets", ["access_level"], unique=False)

    draft_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("drafts")}
    for name, column_type, default in (
        ("audience", sa.String(length=200), "general public"),
        ("reading_level", sa.String(length=40), "plain_language"),
        ("max_length", sa.Integer(), "1000"),
        ("key_messages", sa.Text(), ""),
    ):
        if name not in draft_columns:
            op.add_column("drafts", sa.Column(name, column_type, nullable=False, server_default=default))


def downgrade():
    inspector = sa.inspect(op.get_bind())
    indexes = {index["name"] for index in inspector.get_indexes("assets")}
    if "ix_assets_access_level" in indexes:
        op.drop_index("ix_assets_access_level", table_name="assets")
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("assets")}
    if "access_level" in columns:
        op.drop_column("assets", "access_level")
    if "authors" in columns:
        op.drop_column("assets", "authors")
    if "record_date" in columns:
        op.drop_column("assets", "record_date")
    draft_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("drafts")}
    for name in ("key_messages", "max_length", "reading_level", "audience"):
        if name in draft_columns:
            op.drop_column("drafts", name)
