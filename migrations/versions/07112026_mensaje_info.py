"""mensaje de cabecera (información del día)

Revision ID: 07112026_mensaje_info
Revises: 12102026_apreciacion_scope
Create Date: 2026-11-07

"""
from alembic import op
import sqlalchemy as sa

revision = '07112026_mensaje_info'
down_revision = '12102026_apreciacion_scope'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'mensaje_info' in inspector.get_table_names():
        return

    op.create_table(
        'mensaje_info',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('texto', sa.String(length=400), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.Column(
            'id_operateur',
            sa.Integer(),
            sa.ForeignKey('operateur.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('modificado_en', sa.DateTime(), nullable=False),
    )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'mensaje_info' not in inspector.get_table_names():
        return
    op.drop_table('mensaje_info')
