"""Add story theme tags to existing outreach stories."""
from alembic import op
from sqlalchemy import Column, JSON, inspect, text

revision = "0003_story_hashtags"
down_revision = "0002_outreach_stories"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "outreach_stories" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("outreach_stories")}
    if "hashtags" not in columns:
        op.add_column(
            "outreach_stories",
            Column("hashtags", JSON(), nullable=False, server_default=text("'[]'")),
        )


def downgrade():
    bind = op.get_bind()
    if "outreach_stories" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("outreach_stories")}
    if "hashtags" in columns:
        op.drop_column("outreach_stories", "hashtags")
