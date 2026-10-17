"""id_client en instalacion_foto; id_salida nullable

Revision ID: 26092026_foto_id_client
Revises: 25092026_instalacion_gps
Create Date: 2026-09-26

"""
from alembic import op
import sqlalchemy as sa

revision = '26092026_foto_id_client'
down_revision = '25092026_instalacion_gps'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'instalacion_foto' not in tables:
        return

    columns = {col['name']: col for col in inspector.get_columns('instalacion_foto')}
    indexes = {idx['name'] for idx in inspector.get_indexes('instalacion_foto')}
    fks = {fk['name'] for fk in inspector.get_foreign_keys('instalacion_foto')}

    if 'id_client' not in columns:
        op.add_column('instalacion_foto', sa.Column('id_client', sa.Integer(), nullable=True))

    if 'ix_instalacion_foto_id_client' not in indexes:
        try:
            op.create_index('ix_instalacion_foto_id_client', 'instalacion_foto', ['id_client'])
        except Exception:
            pass

    if 'material_salida' in tables:
        op.execute(
            sa.text(
                'UPDATE instalacion_foto SET id_client = ('
                'SELECT material_salida.id_client FROM material_salida '
                'WHERE material_salida.id = instalacion_foto.id_salida'
                ') WHERE id_client IS NULL AND id_salida IS NOT NULL'
            )
        )

    if 'fk_instalacion_foto_id_client' not in fks:
        try:
            op.create_foreign_key(
                'fk_instalacion_foto_id_client',
                'instalacion_foto',
                'client',
                ['id_client'],
                ['id'],
                ondelete='CASCADE',
            )
        except Exception:
            pass

    col = columns.get('id_salida')
    if col is not None and not col.get('nullable', True) and bind.dialect.name != 'sqlite':
        op.execute(sa.text('ALTER TABLE instalacion_foto MODIFY COLUMN id_salida INTEGER NULL'))

    if bind.dialect.name != 'sqlite':
        fks = {fk['name']: fk for fk in sa.inspect(bind).get_foreign_keys('instalacion_foto')}
        for name, fk in list(fks.items()):
            if list(fk.get('constrained_columns') or []) != ['id_salida']:
                continue
            ondelete = ((fk.get('options') or {}).get('ondelete') or '').upper()
            if name and ondelete == 'CASCADE':
                try:
                    op.drop_constraint(name, 'instalacion_foto', type_='foreignkey')
                except Exception:
                    pass
                try:
                    op.create_foreign_key(
                        'fk_instalacion_foto_id_salida',
                        'instalacion_foto',
                        'material_salida',
                        ['id_salida'],
                        ['id'],
                        ondelete='SET NULL',
                    )
                except Exception:
                    pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'instalacion_foto' not in tables:
        return

    columns = {col['name'] for col in inspector.get_columns('instalacion_foto')}
    indexes = {idx['name'] for idx in inspector.get_indexes('instalacion_foto')}
    fks = {fk['name'] for fk in inspector.get_foreign_keys('instalacion_foto')}

    if 'fk_instalacion_foto_id_client' in fks:
        try:
            op.drop_constraint('fk_instalacion_foto_id_client', 'instalacion_foto', type_='foreignkey')
        except Exception:
            pass
    if 'ix_instalacion_foto_id_client' in indexes:
        try:
            op.drop_index('ix_instalacion_foto_id_client', table_name='instalacion_foto')
        except Exception:
            pass
    if 'id_client' in columns:
        op.drop_column('instalacion_foto', 'id_client')
