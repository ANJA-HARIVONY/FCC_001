"""coordenadas GPS en client y tabla instalacion_foto

Revision ID: 25092026_instalacion_gps
Revises: 21092026_bitrix_detalle
Create Date: 2026-09-25

"""
from alembic import op
import sqlalchemy as sa

revision = '25092026_instalacion_gps'
down_revision = '21092026_bitrix_detalle'
branch_labels = None
depends_on = None

_CLIENT_COLUMNS = (
    ('latitud', sa.Numeric(10, 7)),
    ('longitud', sa.Numeric(10, 7)),
    ('gps_actualizado_le', sa.DateTime()),
    ('id_operateur_gps', sa.Integer()),
)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'client' in tables:
        columns = {col['name'] for col in inspector.get_columns('client')}
        for name, col_type in _CLIENT_COLUMNS:
            if name not in columns:
                op.add_column('client', sa.Column(name, col_type, nullable=True))
        if 'id_operateur_gps' not in columns:
            try:
                op.create_foreign_key(
                    'fk_client_operateur_gps', 'client', 'operateur',
                    ['id_operateur_gps'], ['id'], ondelete='SET NULL',
                )
            except Exception:
                pass

    if 'instalacion_foto' not in tables:
        op.create_table(
            'instalacion_foto',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column(
                'id_salida', sa.Integer(),
                sa.ForeignKey('material_salida.id', ondelete='CASCADE'), nullable=False,
            ),
            sa.Column('fichier', sa.String(length=255), nullable=False),
            sa.Column(
                'id_operateur', sa.Integer(),
                sa.ForeignKey('operateur.id', ondelete='SET NULL'), nullable=True,
            ),
            sa.Column('creado_le', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_instalacion_foto_id_salida', 'instalacion_foto', ['id_salida'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'instalacion_foto' in tables:
        op.drop_table('instalacion_foto')

    if 'client' in tables:
        columns = {col['name'] for col in inspector.get_columns('client')}
        if 'id_operateur_gps' in columns:
            try:
                op.drop_constraint('fk_client_operateur_gps', 'client', type_='foreignkey')
            except Exception:
                pass
        for name, _col_type in reversed(_CLIENT_COLUMNS):
            if name in columns:
                op.drop_column('client', name)
