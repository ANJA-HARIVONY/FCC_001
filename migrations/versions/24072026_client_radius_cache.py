"""ajout colonnes RADIUS client (username + cache)

Revision ID: 24072026_client_radius
Revises: 18072026_estado_hist
Create Date: 2026-07-24

"""
from alembic import op
import sqlalchemy as sa

revision = '24072026_client_radius'
down_revision = '18072026_estado_hist'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return

    columns = {col['name'] for col in inspector.get_columns('client')}
    if 'username_radius' not in columns:
        op.add_column(
            'client',
            sa.Column('username_radius', sa.String(length=100), nullable=True),
        )
        try:
            op.create_index('ix_client_username_radius', 'client', ['username_radius'])
        except Exception:
            pass
    if 'radius_cache_json' not in columns:
        op.add_column(
            'client',
            sa.Column('radius_cache_json', sa.Text(), nullable=True),
        )
    if 'radius_cache_at' not in columns:
        op.add_column(
            'client',
            sa.Column('radius_cache_at', sa.DateTime(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('client')}
    if 'radius_cache_at' in columns:
        op.drop_column('client', 'radius_cache_at')
    if 'radius_cache_json' in columns:
        op.drop_column('client', 'radius_cache_json')
    if 'username_radius' in columns:
        try:
            op.drop_index('ix_client_username_radius', table_name='client')
        except Exception:
            pass
        op.drop_column('client', 'username_radius')
