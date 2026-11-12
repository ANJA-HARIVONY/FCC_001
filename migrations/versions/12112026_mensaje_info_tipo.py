"""tipo du message de cabecera (problema / informacion)

Revision ID: 12112026_mensaje_tipo
Revises: 07112026_mensaje_info
Create Date: 2026-11-12

"""
from alembic import op
import sqlalchemy as sa

revision = '12112026_mensaje_tipo'
down_revision = '07112026_mensaje_info'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'mensaje_info' not in inspector.get_table_names():
        return

    columns = {col['name'] for col in inspector.get_columns('mensaje_info')}
    if 'tipo' in columns:
        return

    op.add_column(
        'mensaje_info',
        sa.Column('tipo', sa.String(length=20), nullable=False, server_default='problema'),
    )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'mensaje_info' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('mensaje_info')}
    if 'tipo' not in columns:
        return
    op.drop_column('mensaje_info', 'tipo')
