"""note du jour rattachée à la ciudad et à l'agencia du créateur

Revision ID: 12102026_apreciacion_scope
Revises: 01102026_role_superadmin
Create Date: 2026-10-12

"""
from alembic import op

revision = '12102026_apreciacion_scope'
down_revision = '01102026_role_superadmin'
branch_labels = None
depends_on = None


def upgrade():
    from core.services.apreciacion_schema import sync_apreciacion_dia_scope

    sync_apreciacion_dia_scope(op.get_bind())


def downgrade():
    from core.services.apreciacion_schema import revert_apreciacion_dia_scope

    revert_apreciacion_dia_scope(op.get_bind())
