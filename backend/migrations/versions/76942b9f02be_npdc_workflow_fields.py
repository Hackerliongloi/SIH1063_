"""npdc_workflow_fields

Revision ID: 76942b9f02be
Revises: 0005_social_drafts
Create Date: 2026-10-03 06:13:00.369198
"""
from alembic import op
import sqlalchemy as sa

revision = '76942b9f02be'
down_revision = '0005_social_drafts'
branch_labels = None
depends_on = None

def upgrade():
    # Create asset_review_history
    op.create_table('asset_review_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('asset_id', sa.Integer(), nullable=False),
    sa.Column('actor_id', sa.Integer(), nullable=True),
    sa.Column('action', sa.String(length=50), nullable=False),
    sa.Column('from_status', sa.String(length=30), nullable=False),
    sa.Column('to_status', sa.String(length=30), nullable=False),
    sa.Column('comment', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_review_history_asset_id'), 'asset_review_history', ['asset_id'], unique=False)

    # Add columns as nullable
    op.add_column('assets', sa.Column('processing_status', sa.String(length=20), nullable=True))
    op.add_column('assets', sa.Column('review_status', sa.String(length=30), nullable=True))
    
    # Backfill
    op.execute("UPDATE assets SET processing_status = status, review_status = 'approved' WHERE status = 'ready'")
    op.execute("UPDATE assets SET processing_status = status, review_status = 'draft' WHERE status != 'ready'")

    # Alter to not nullable
    op.alter_column('assets', 'processing_status', nullable=False)
    op.alter_column('assets', 'review_status', nullable=False)

    # Indexes
    op.drop_index('ix_assets_status', table_name='assets')
    op.create_index(op.f('ix_assets_processing_status'), 'assets', ['processing_status'], unique=False)
    op.create_index(op.f('ix_assets_review_status'), 'assets', ['review_status'], unique=False)
    
    # Drop legacy column
    op.drop_column('assets', 'status')

def downgrade():
    op.add_column('assets', sa.Column('status', sa.String(length=20), nullable=True))
    
    # Backfill backwards
    op.execute("UPDATE assets SET status = processing_status")
    
    op.alter_column('assets', 'status', nullable=False)
    
    op.drop_index(op.f('ix_assets_review_status'), table_name='assets')
    op.drop_index(op.f('ix_assets_processing_status'), table_name='assets')
    op.create_index('ix_assets_status', 'assets', ['status'], unique=False)
    op.drop_column('assets', 'review_status')
    op.drop_column('assets', 'processing_status')
    op.drop_index(op.f('ix_asset_review_history_asset_id'), table_name='asset_review_history')
    op.drop_table('asset_review_history')
