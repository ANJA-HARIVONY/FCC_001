"""ajout categoria client particular corporativo

Revision ID: 08062026_categoria
Revises:
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = '08062026_categoria'
down_revision = None
branch_labels = None
depends_on = None

CORPORATIVO_KEYWORDS = (
    'ministerio', 'embajada', 'eglng', 'pnud', 'unrco', 'unge',
    'federacion', 'societe general', 'societe',
)


def _nom_indica_corporativo(nom):
    if not nom:
        return False
    lower = nom.lower()
    return any(keyword in lower for keyword in CORPORATIVO_KEYWORDS)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return

    columns = {col['name'] for col in inspector.get_columns('client')}
    if 'categoria' not in columns:
        op.add_column(
            'client',
            sa.Column('categoria', sa.String(length=20), nullable=False, server_default='particular'),
        )
        try:
            op.create_index('ix_client_categoria', 'client', ['categoria'])
        except Exception:
            pass

    rows = bind.execute(sa.text('SELECT id, nom FROM client')).fetchall()
    for row in rows:
        if _nom_indica_corporativo(row.nom):
            bind.execute(
                sa.text('UPDATE client SET categoria = :cat WHERE id = :id'),
                {'cat': 'corporativo', 'id': row.id},
            )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'client' not in inspector.get_table_names():
        return
    columns = {col['name'] for col in inspector.get_columns('client')}
    if 'categoria' in columns:
        try:
            op.drop_index('ix_client_categoria', table_name='client')
        except Exception:
            pass
        op.drop_column('client', 'categoria')
