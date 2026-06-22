"""materiales trazabilidad y categoria operateur

Revision ID: 20062026_materiales
Revises: 08062026_categoria
Create Date: 2026-06-20

"""
from alembic import op
import sqlalchemy as sa

revision = '20062026_materiales'
down_revision = '08062026_categoria'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'operateur' in tables:
        columns = {col['name'] for col in inspector.get_columns('operateur')}
        if 'categoria' not in columns:
            op.add_column(
                'operateur',
                sa.Column('categoria', sa.String(length=20), nullable=False, server_default='atencion_cliente'),
            )
            try:
                op.create_index('ix_operateur_categoria', 'operateur', ['categoria'])
            except Exception:
                pass

    if 'material' not in tables:
        op.create_table(
            'material',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('nombre', sa.String(length=120), nullable=False),
            sa.Column('tipo', sa.String(length=30), nullable=False),
            sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('creado_le', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint('nombre', 'tipo', name='uq_material_nombre_tipo'),
        )
        try:
            op.create_index('ix_material_tipo_activo', 'material', ['tipo', 'activo'])
        except Exception:
            pass

    if 'material_salida' not in tables:
        op.create_table(
            'material_salida',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('fecha', sa.Date(), nullable=False),
            sa.Column('id_tecnico', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=False),
            sa.Column('id_client', sa.Integer(), sa.ForeignKey('client.id'), nullable=True),
            sa.Column('estado', sa.String(length=20), nullable=False, server_default='registrada'),
            sa.Column('id_operateur_registro', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=False),
            sa.Column('fecha_registro', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('id_operateur_modificacion', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=True),
            sa.Column('fecha_modificacion', sa.DateTime(), nullable=True),
        )
        try:
            op.create_index('ix_material_salida_fecha', 'material_salida', ['fecha'])
            op.create_index('ix_material_salida_id_tecnico', 'material_salida', ['id_tecnico'])
            op.create_index('ix_material_salida_id_client', 'material_salida', ['id_client'])
        except Exception:
            pass

    if 'material_salida_linea' not in tables:
        op.create_table(
            'material_salida_linea',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('id_salida', sa.Integer(), sa.ForeignKey('material_salida.id', ondelete='CASCADE'), nullable=False),
            sa.Column('id_material', sa.Integer(), sa.ForeignKey('material.id'), nullable=False),
            sa.Column('cantidad', sa.Integer(), nullable=False),
        )
        try:
            op.create_index('ix_material_salida_linea_id_salida', 'material_salida_linea', ['id_salida'])
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'material_salida_linea' in tables:
        op.drop_table('material_salida_linea')
    if 'material_salida' in tables:
        op.drop_table('material_salida')
    if 'material' in tables:
        op.drop_table('material')
    if 'operateur' in tables:
        columns = {col['name'] for col in inspector.get_columns('operateur')}
        if 'categoria' in columns:
            try:
                op.drop_index('ix_operateur_categoria', table_name='operateur')
            except Exception:
                pass
            op.drop_column('operateur', 'categoria')
