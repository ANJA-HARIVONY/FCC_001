"""ajout traçabilité créateur / modificateur sur client

Revision ID: 19092026_client_traza
Revises: 19092026_incident_modif
Create Date: 2026-09-19

"""
from alembic import op
import sqlalchemy as sa

revision = '19092026_client_traza'
down_revision = '19092026_incident_modif'
branch_labels = None
depends_on = None

_FKS = (
    ('id_operateur', 'fk_client_operateur'),
    ('id_operateur_modificacion', 'fk_client_operateur_modificacion'),
)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return

    columns = {col['name'] for col in inspector.get_columns('client')}
    for column, fk_name in _FKS:
        if column not in columns:
            op.add_column('client', sa.Column(column, sa.Integer(), nullable=True))
            try:
                op.create_foreign_key(
                    fk_name, 'client', 'operateur', [column], ['id'], ondelete='SET NULL'
                )
            except Exception:
                pass
    if 'modifie_le' not in columns:
        op.add_column('client', sa.Column('modifie_le', sa.DateTime(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('client')}
    if 'modifie_le' in columns:
        op.drop_column('client', 'modifie_le')
    for column, fk_name in reversed(_FKS):
        if column in columns:
            try:
                op.drop_constraint(fk_name, 'client', type_='foreignkey')
            except Exception:
                pass
            op.drop_column('client', column)
