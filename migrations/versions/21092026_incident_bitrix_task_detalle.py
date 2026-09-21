"""incident bitrix task detail columns (vencimiento, prioridad, movimiento)

Revision ID: 21092026_bitrix_detalle
Revises: 19092026_client_traza
Create Date: 2026-09-21

"""
from alembic import op
import sqlalchemy as sa

revision = '21092026_bitrix_detalle'
down_revision = '19092026_client_traza'
branch_labels = None
depends_on = None

_COLUMNS = (
    ('bitrix_deadline', sa.DateTime()),
    ('bitrix_created_at', sa.DateTime()),
    ('bitrix_closed_at', sa.DateTime()),
    ('bitrix_changed_at', sa.DateTime()),
    ('bitrix_priority', sa.String(length=2)),
    ('bitrix_moved_at', sa.DateTime()),
)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('incident')}

    for name, col_type in _COLUMNS:
        if name not in columns:
            op.add_column('incident', sa.Column(name, col_type, nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('incident')}
    for name, _col_type in reversed(_COLUMNS):
        if name in columns:
            op.drop_column('incident', name)
