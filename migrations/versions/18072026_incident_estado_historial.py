"""incident_estado_historial table

Revision ID: 18072026_estado_hist
Revises: 30062026_bitrix_cache
Create Date: 2026-07-18

"""
from alembic import op
import sqlalchemy as sa

revision = '18072026_estado_hist'
down_revision = '30062026_bitrix_cache'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident_estado_historial' in inspector.get_table_names():
        return

    op.create_table(
        'incident_estado_historial',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('id_incident', sa.Integer(), sa.ForeignKey('incident.id', ondelete='CASCADE'), nullable=False),
        sa.Column('estado_anterior', sa.String(length=20), nullable=True),
        sa.Column('estado_nuevo', sa.String(length=20), nullable=False),
        sa.Column('id_operateur', sa.Integer(), sa.ForeignKey('operateur.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cambiado_en', sa.DateTime(), nullable=False),
        sa.Column('ref_bitrix', sa.String(length=10), nullable=True),
    )
    try:
        op.create_index('ix_ieh_incident_cambiado', 'incident_estado_historial', ['id_incident', 'cambiado_en'])
    except Exception:
        pass
    try:
        op.create_index('ix_ieh_operateur_cambiado', 'incident_estado_historial', ['id_operateur', 'cambiado_en'])
    except Exception:
        pass
    try:
        op.create_index('ix_ieh_estado_nuevo_cambiado', 'incident_estado_historial', ['estado_nuevo', 'cambiado_en'])
    except Exception:
        pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident_estado_historial' not in inspector.get_table_names():
        return
    for idx in (
        'ix_ieh_estado_nuevo_cambiado',
        'ix_ieh_operateur_cambiado',
        'ix_ieh_incident_cambiado',
    ):
        try:
            op.drop_index(idx, table_name='incident_estado_historial')
        except Exception:
            pass
    op.drop_table('incident_estado_historial')
