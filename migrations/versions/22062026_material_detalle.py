"""material descripcion modelo foto modificado_le

Revision ID: 22062026_material_detalle
Revises: 20062026_materiales
Create Date: 2026-06-22

"""
from alembic import op
import sqlalchemy as sa

revision = '22062026_material_detalle'
down_revision = '20062026_materiales'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material')}
    if 'descripcion' not in columns:
        op.add_column('material', sa.Column('descripcion', sa.Text(), nullable=True))
    if 'modelo' not in columns:
        op.add_column('material', sa.Column('modelo', sa.String(length=100), nullable=True))
    if 'foto' not in columns:
        op.add_column('material', sa.Column('foto', sa.String(length=255), nullable=True))
    if 'modificado_le' not in columns:
        op.add_column('material', sa.Column('modificado_le', sa.DateTime(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material')}
    if 'modificado_le' in columns:
        op.drop_column('material', 'modificado_le')
    if 'foto' in columns:
        op.drop_column('material', 'foto')
    if 'modelo' in columns:
        op.drop_column('material', 'modelo')
    if 'descripcion' in columns:
        op.drop_column('material', 'descripcion')
