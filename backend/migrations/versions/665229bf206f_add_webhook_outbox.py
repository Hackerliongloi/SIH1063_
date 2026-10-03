"""Add webhook_outbox

Revision ID: 665229bf206f
Revises: 76942b9f02be
Create Date: 2026-10-03 10:11:12.734696
"""
from alembic import op
import sqlalchemy as sa

revision = '665229bf206f'
down_revision = '76942b9f02be'
branch_labels = None
depends_on = None
def upgrade():
    inspector = sa.inspect(op.get_bind())
    tables = inspector.get_table_names()
    if 'webhook_outbox' not in tables:
        op.create_table(
            'webhook_outbox',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.String(length=64), nullable=False),
            sa.Column('event_type', sa.String(length=100), nullable=False),
            sa.Column('feed_item_id', sa.Integer(), nullable=True),
            sa.Column('payload', sa.JSON(), nullable=False),
            sa.Column('state', sa.String(length=20), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False),
            sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_error', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['feed_item_id'], ['feed_items.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        inspector = sa.inspect(op.get_bind())
    elif op.get_bind().dialect.name == 'postgresql':
        foreign_key = next((fk for fk in inspector.get_foreign_keys('webhook_outbox')
                            if fk['constrained_columns'] == ['feed_item_id']), None)
        if foreign_key and foreign_key['options'].get('ondelete', '').upper() != 'SET NULL':
            if foreign_key['name']:
                op.drop_constraint(foreign_key['name'], 'webhook_outbox', type_='foreignkey')
            op.alter_column('webhook_outbox', 'feed_item_id', nullable=True)
            op.create_foreign_key('fk_webhook_outbox_feed_item_id_feed_items', 'webhook_outbox',
                                  'feed_items', ['feed_item_id'], ['id'], ondelete='SET NULL')
    indexes = {index['name'] for index in inspector.get_indexes('webhook_outbox')}
    if 'ix_webhook_outbox_event_id' not in indexes:
        op.create_index('ix_webhook_outbox_event_id', 'webhook_outbox', ['event_id'], unique=True)
    if 'ix_webhook_outbox_feed_item_id' not in indexes:
        op.create_index('ix_webhook_outbox_feed_item_id', 'webhook_outbox', ['feed_item_id'])
    if 'ix_webhook_outbox_state' not in indexes:
        op.create_index('ix_webhook_outbox_state', 'webhook_outbox', ['state'])
    if 'ix_webhook_outbox_next_attempt_at' not in indexes:
        op.create_index('ix_webhook_outbox_next_attempt_at', 'webhook_outbox', ['next_attempt_at'])
def downgrade():
    inspector = sa.inspect(op.get_bind())
    if 'webhook_outbox' not in inspector.get_table_names():
        return
    indexes = {index['name'] for index in inspector.get_indexes('webhook_outbox')}
    for name in ('ix_webhook_outbox_next_attempt_at', 'ix_webhook_outbox_state',
                 'ix_webhook_outbox_feed_item_id', 'ix_webhook_outbox_event_id'):
        if name in indexes:
            op.drop_index(name, table_name='webhook_outbox')
    op.drop_table('webhook_outbox')
