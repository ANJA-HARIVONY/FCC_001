"""incident bitrix cache columns

Revision ID: 30062026_bitrix_cache
Revises: 25062026_salida_tipo
Create Date: 2026-06-30

"""
from alembic import op
import sqlalchemy as sa

revision = '30062026_bitrix_cache'
down_revision = '25062026_salida_tipo'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('incident')}

    if 'bitrix_task_status' not in columns:
        op.add_column('incident', sa.Column('bitrix_task_status', sa.String(length=2), nullable=True))
    if 'bitrix_status_label' not in columns:
        op.add_column('incident', sa.Column('bitrix_status_label', sa.String(length=80), nullable=True))
    if 'bitrix_status_emoji' not in columns:
        op.add_column('incident', sa.Column('bitrix_status_emoji', sa.String(length=10), nullable=True))
    if 'bitrix_responsible' not in columns:
        op.add_column('incident', sa.Column('bitrix_responsible', sa.String(length=120), nullable=True))
    if 'bitrix_fetched_at' not in columns:
        op.add_column('incident', sa.Column('bitrix_fetched_at', sa.DateTime(), nullable=True))
    if 'bitrix_fetch_locked' not in columns:
        op.add_column(
            'incident',
            sa.Column('bitrix_fetch_locked', sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('incident')}
    for col in (
        'bitrix_fetch_locked',
        'bitrix_fetched_at',
        'bitrix_responsible',
        'bitrix_status_emoji',
        'bitrix_status_label',
        'bitrix_task_status',
    ):
        if col in columns:
            op.drop_column('incident', col)
