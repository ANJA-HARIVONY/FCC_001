"""sitios de cliente, instalaciones (estado/traslado) y reprise de datos

Revision ID: 27092026_instalacion_sitio
Revises: 26092026_foto_id_client
Create Date: 2026-09-27

"""
from alembic import op
import sqlalchemy as sa

revision = '27092026_instalacion_sitio'
down_revision = '26092026_foto_id_client'
branch_labels = None
depends_on = None


def _add_fk(name, source, referent, local_cols, ondelete):
    try:
        op.create_foreign_key(name, source, referent, local_cols, ['id'], ondelete=ondelete)
    except Exception:
        pass


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'client_sitio' not in tables:
        op.create_table(
            'client_sitio',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column(
                'id_client', sa.Integer(),
                sa.ForeignKey('client.id', ondelete='CASCADE'), nullable=False,
            ),
            sa.Column('adresse', sa.String(length=200), nullable=False),
            sa.Column('ville', sa.String(length=100), nullable=False),
            sa.Column('latitud', sa.Numeric(10, 7), nullable=True),
            sa.Column('longitud', sa.Numeric(10, 7), nullable=True),
            sa.Column('gps_actualizado_le', sa.DateTime(), nullable=True),
            sa.Column(
                'id_operateur_gps', sa.Integer(),
                sa.ForeignKey('operateur.id', ondelete='SET NULL'), nullable=True,
            ),
            sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('desde', sa.Date(), nullable=True),
            sa.Column('hasta', sa.Date(), nullable=True),
            sa.Column('creado_le', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_client_sitio_id_client', 'client_sitio', ['id_client'])
        op.create_index('ix_client_sitio_activo', 'client_sitio', ['activo'])

    if 'instalacion' not in tables:
        op.create_table(
            'instalacion',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column(
                'id_client', sa.Integer(),
                sa.ForeignKey('client.id', ondelete='CASCADE'), nullable=False,
            ),
            sa.Column(
                'id_sitio', sa.Integer(),
                sa.ForeignKey('client_sitio.id', ondelete='SET NULL'), nullable=True,
            ),
            sa.Column(
                'id_sitio_origen', sa.Integer(),
                sa.ForeignKey('client_sitio.id', ondelete='SET NULL'), nullable=True,
            ),
            sa.Column('tipo', sa.String(length=20), nullable=False, server_default='nueva'),
            sa.Column('estado', sa.String(length=20), nullable=False, server_default='en_curso'),
            sa.Column('fecha', sa.Date(), nullable=False),
            sa.Column('id_tecnico', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=False),
            sa.Column('observaciones', sa.Text(), nullable=True),
            sa.Column(
                'id_operateur_registro', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=False,
            ),
            sa.Column('fecha_registro', sa.DateTime(), nullable=False),
            sa.Column(
                'id_operateur_modificacion', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=True,
            ),
            sa.Column('fecha_modificacion', sa.DateTime(), nullable=True),
            sa.Column('terminada_le', sa.DateTime(), nullable=True),
            sa.Column(
                'id_operateur_terminada', sa.Integer(), sa.ForeignKey('operateur.id'), nullable=True,
            ),
        )
        for col in ('id_client', 'id_sitio', 'tipo', 'estado', 'fecha', 'id_tecnico'):
            op.create_index(f'ix_instalacion_{col}', 'instalacion', [col])

    if 'instalacion_traslado_linea' not in tables:
        op.create_table(
            'instalacion_traslado_linea',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column(
                'id_instalacion', sa.Integer(),
                sa.ForeignKey('instalacion.id', ondelete='CASCADE'), nullable=False,
            ),
            sa.Column('id_material', sa.Integer(), sa.ForeignKey('material.id'), nullable=False),
            sa.Column('cantidad', sa.Integer(), nullable=False),
            sa.Column('accion', sa.String(length=20), nullable=False),
        )
        op.create_index(
            'ix_instalacion_traslado_linea_id_instalacion',
            'instalacion_traslado_linea',
            ['id_instalacion'],
        )

    is_sqlite = bind.dialect.name == 'sqlite'

    if 'material_salida' in tables:
        columns = {col['name'] for col in inspector.get_columns('material_salida')}
        if 'id_instalacion' not in columns:
            op.add_column('material_salida', sa.Column('id_instalacion', sa.Integer(), nullable=True))
            op.create_index('ix_material_salida_id_instalacion', 'material_salida', ['id_instalacion'])
            if not is_sqlite:
                _add_fk(
                    'fk_material_salida_id_instalacion', 'material_salida', 'instalacion',
                    ['id_instalacion'], 'SET NULL',
                )

    if 'instalacion_foto' in tables:
        columns = {col['name'] for col in inspector.get_columns('instalacion_foto')}
        if 'id_sitio' not in columns:
            op.add_column('instalacion_foto', sa.Column('id_sitio', sa.Integer(), nullable=True))
            op.create_index('ix_instalacion_foto_id_sitio', 'instalacion_foto', ['id_sitio'])
            if not is_sqlite:
                _add_fk(
                    'fk_instalacion_foto_id_sitio', 'instalacion_foto', 'client_sitio',
                    ['id_sitio'], 'CASCADE',
                )

    if 'client' in tables and 'material_salida' in tables and 'instalacion_foto' in tables:
        from core.services.instalaciones_backfill import run_instalaciones_backfill

        run_instalaciones_backfill(bind)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    is_sqlite = bind.dialect.name == 'sqlite'

    if 'instalacion_foto' in tables:
        columns = {col['name'] for col in inspector.get_columns('instalacion_foto')}
        if 'id_sitio' in columns:
            if not is_sqlite:
                try:
                    op.drop_constraint('fk_instalacion_foto_id_sitio', 'instalacion_foto', type_='foreignkey')
                except Exception:
                    pass
            try:
                op.drop_index('ix_instalacion_foto_id_sitio', table_name='instalacion_foto')
            except Exception:
                pass
            op.drop_column('instalacion_foto', 'id_sitio')

    if 'material_salida' in tables:
        columns = {col['name'] for col in inspector.get_columns('material_salida')}
        if 'id_instalacion' in columns:
            if not is_sqlite:
                try:
                    op.drop_constraint(
                        'fk_material_salida_id_instalacion', 'material_salida', type_='foreignkey'
                    )
                except Exception:
                    pass
            try:
                op.drop_index('ix_material_salida_id_instalacion', table_name='material_salida')
            except Exception:
                pass
            op.drop_column('material_salida', 'id_instalacion')

    for table in ('instalacion_traslado_linea', 'instalacion', 'client_sitio'):
        if table in tables:
            op.drop_table(table)
