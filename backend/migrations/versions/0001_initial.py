"""Initial Polar Portal schema, including feed module."""
from alembic import op
from app.core.db import Base
from app import models
from app.modules import feed

revision="0001_initial"
down_revision=None
branch_labels=None
depends_on=None
def upgrade():
    if op.get_bind().dialect.name=="postgresql":op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=op.get_bind())
    if op.get_bind().dialect.name=="postgresql":
        op.execute("CREATE INDEX IF NOT EXISTS ix_chunks_fts ON chunks USING GIN (to_tsvector('english', text))")
def downgrade(): Base.metadata.drop_all(bind=op.get_bind())
