"""material_salida observaciones

Revision ID: 23062026_salida_observaciones
Revises: 22062026_material_detalle
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa

revision = '23062026_salida_observaciones'
down_revision = '22062026_material_detalle'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material_salida' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material_salida')}
    if 'observaciones' not in columns:
        op.add_column('material_salida', sa.Column('observaciones', sa.Text(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material_salida' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material_salida')}
    if 'observaciones' in columns:
        op.drop_column('material_salida', 'observaciones')
