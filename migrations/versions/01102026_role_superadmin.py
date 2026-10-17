"""promouvoir les roles admin historiques vers superadmin

Revision ID: 01102026_role_superadmin
Revises: 27092026_instalacion_sitio
Create Date: 2026-10-01

"""
from alembic import op
import sqlalchemy as sa

revision = '01102026_role_superadmin'
down_revision = '27092026_instalacion_sitio'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'operateur' not in inspector.get_table_names():
        return
    op.execute(sa.text("UPDATE operateur SET role = 'superadmin' WHERE role = 'admin'"))


def downgrade():
    pass
