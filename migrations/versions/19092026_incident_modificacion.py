"""ajout traçabilité de modification sur incident (modificador + fecha)

Revision ID: 19092026_incident_modif
Revises: 24072026_client_radius
Create Date: 2026-09-19

"""
from alembic import op
import sqlalchemy as sa

revision = '19092026_incident_modif'
down_revision = '24072026_client_radius'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return

    columns = {col['name'] for col in inspector.get_columns('incident')}
    if 'id_operateur_modificacion' not in columns:
        op.add_column(
            'incident',
            sa.Column('id_operateur_modificacion', sa.Integer(), nullable=True),
        )
        try:
            op.create_foreign_key(
                'fk_incident_operateur_modificacion',
                'incident',
                'operateur',
                ['id_operateur_modificacion'],
                ['id'],
                ondelete='SET NULL',
            )
        except Exception:
            pass
    if 'modifie_le' not in columns:
        op.add_column(
            'incident',
            sa.Column('modifie_le', sa.DateTime(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'incident' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('incident')}
    if 'modifie_le' in columns:
        op.drop_column('incident', 'modifie_le')
    if 'id_operateur_modificacion' in columns:
        try:
            op.drop_constraint(
                'fk_incident_operateur_modificacion',
                'incident',
                type_='foreignkey',
            )
        except Exception:
            pass
        op.drop_column('incident', 'id_operateur_modificacion')
