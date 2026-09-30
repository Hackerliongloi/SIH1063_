"""Add reviewer approval timestamp to existing outreach stories."""
from alembic import op
from sqlalchemy import Column, DateTime, inspect

revision = "0004_story_approval_timestamp"
down_revision = "0003_story_hashtags"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "outreach_stories" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("outreach_stories")}
    if "approved_at" not in columns:
        op.add_column(
            "outreach_stories",
            Column("approved_at", DateTime(timezone=True), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    if "outreach_stories" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("outreach_stories")}
    if "approved_at" in columns:
        op.drop_column("outreach_stories", "approved_at")
