#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration des references Bitrix: observations -> ref_bitrix
A executer APRES la migration Alembic 20260216_100000 (ajout colonne ref_bitrix)
"""

import os
import sys
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CORE_DIR = ROOT_DIR / 'core'
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(CORE_DIR))

REF_EXACT_PATTERN = re.compile(r'^(\d{5})$')
REF_IN_TEXT_PATTERN = re.compile(r'\b(\d{5})\b')


def extract_ref_bitrix(obs):
    """Extrait la ref Bitrix (5 chiffres). Prend la derniere si plusieurs (ex: texte + 82129)."""
    if not obs or not str(obs).strip():
        return None
    obs = str(obs).strip()
    if REF_EXACT_PATTERN.match(obs):
        return obs
    matches = REF_IN_TEXT_PATTERN.findall(obs)
    return matches[-1] if matches else None


def migrate_refs():
    """Extrait les refs Bitrix des observations vers ref_bitrix"""
    try:
        from core.app import app, db
        from core.app import Incident
    except ImportError as e:
        print(f"Erreur import: {e}")
        return False

    with app.app_context():
        # Verifier que la colonne ref_bitrix existe
        from sqlalchemy import inspect
        insp = inspect(db.engine)
        cols = [c['name'] for c in insp.get_columns('incident')]
        if 'ref_bitrix' not in cols:
            print("Erreur: La colonne ref_bitrix n'existe pas. Executez d'abord: flask db upgrade")
            return False

        incidents = Incident.query.filter_by(status='Bitrix').all()
        updated = 0
        for inc in incidents:
            ref = extract_ref_bitrix(inc.observations)
            if ref:
                inc.ref_bitrix = ref
                updated += 1

        if updated > 0:
            db.session.commit()
            print(f"Migration OK: {updated} refs Bitrix extraites vers ref_bitrix")
        else:
            print("Aucune ref a migrer (ou deja fait)")
        return True


if __name__ == '__main__':
    success = migrate_refs()
    sys.exit(0 if success else 1)
