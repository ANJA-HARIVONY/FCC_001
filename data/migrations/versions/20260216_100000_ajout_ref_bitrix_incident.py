"""Ajout champ ref_bitrix a la table incident

Revision ID: 20260216_100000
Revises: 20250801_133000
Create Date: 2026-02-16 10:00:00.000000

Etape 7 - Champ ref_bitrix pour incidents avec status Bitrix
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260216_100000'
down_revision = '20250801_133000'
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter la colonne ref_bitrix (nullable, visible quand status=Bitrix)
    op.add_column('incident', sa.Column('ref_bitrix', sa.String(length=10), nullable=True))
    
    # Migration des donnees: executer via script tools/migrate_bitrix_ref.py apres migration
    # (evite problemes de compatibilite SQLite vs MySQL/MariaDB)


def downgrade():
    op.drop_column('incident', 'ref_bitrix')
