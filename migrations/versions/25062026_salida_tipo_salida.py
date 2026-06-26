"""material_salida tipo_salida

Revision ID: 25062026_salida_tipo
Revises: 23062026_salida_observaciones
Create Date: 2026-06-25

"""
from alembic import op
import sqlalchemy as sa

revision = '25062026_salida_tipo'
down_revision = '23062026_salida_observaciones'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material_salida' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material_salida')}
    if 'tipo_salida' in columns:
        return

    op.add_column(
        'material_salida',
        sa.Column('tipo_salida', sa.String(length=20), nullable=True),
    )

    op.execute("""
        UPDATE material_salida
        SET tipo_salida = 'uso_interno'
        WHERE id_client IS NULL
    """)
    op.execute("""
        UPDATE material_salida
        SET tipo_salida = 'uso_interno'
        WHERE id_client IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM client c
            WHERE c.id = material_salida.id_client
            AND (
                TRIM(COALESCE(c.nom, '')) = ''
                OR LOWER(TRIM(c.nom)) = 'uso general'
            )
        )
    """)
    op.execute("""
        UPDATE material_salida
        SET tipo_salida = 'incidencia'
        WHERE tipo_salida IS NULL
    """)

    with op.batch_alter_table('material_salida') as batch_op:
        batch_op.alter_column('tipo_salida', nullable=False)

    try:
        op.create_index('ix_material_salida_tipo_salida', 'material_salida', ['tipo_salida'])
    except Exception:
        pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'material_salida' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('material_salida')}
    if 'tipo_salida' not in columns:
        return
    try:
        op.drop_index('ix_material_salida_tipo_salida', table_name='material_salida')
    except Exception:
        pass
    op.drop_column('material_salida', 'tipo_salida')
