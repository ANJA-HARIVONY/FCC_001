#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour appliquer les modifications ref_bitrix
- Verifie/ajoute la colonne ref_bitrix si necessaire
- Migre les donnees observations -> ref_bitrix
"""
import os
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORE_DIR = ROOT / 'core'
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(CORE_DIR))

# Ref exacte (observations = "58313") ou en fin de texte ("...82129")
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


def main():
    log_path = ROOT / "apply_ref_bitrix_result.txt"
    # Fallback si ecriture reseau impossible
    if not os.access(str(ROOT), os.W_OK):
        log_path = Path(os.environ.get("TEMP", ".")) / "apply_ref_bitrix_result.txt"
    log = []
    def log_msg(msg):
        log.append(msg)
        print(msg)
    
    log_msg("Application des modifications ref_bitrix...")
    
    try:
        from core.app import app, db
        from core.app import Incident
    except ImportError as e:
        log_msg(f"Erreur import: {e}")
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("\n".join(log))
        return 1

    with app.app_context():
        from sqlalchemy import inspect, text
        
        # 1. Verifier si ref_bitrix existe, sinon l'ajouter
        insp = inspect(db.engine)
        cols = [c['name'] for c in insp.get_columns('incident')]
        
        if 'ref_bitrix' not in cols:
            log_msg("Ajout de la colonne ref_bitrix...")
            is_sqlite = 'sqlite' in str(db.engine.url).lower()
            sql = "ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10)" if is_sqlite else "ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL"
            try:
                db.session.execute(text(sql))
                db.session.commit()
                log_msg("Colonne ref_bitrix ajoutee.")
            except Exception as e:
                db.session.rollback()
                log_msg(f"Erreur ALTER TABLE: {e}")
                with open(log_path, "w", encoding="utf-8") as f:
                    f.write("\n".join(log))
                return 1
        else:
            log_msg("Colonne ref_bitrix deja presente.")
        
        # 2. Migrer les donnees (ref exacte ou en fin de texte, ex: "...82129")
        incidents = Incident.query.filter_by(status='Bitrix').all()
        updated = 0
        for inc in incidents:
            ref = extract_ref_bitrix(inc.observations)
            if ref:
                inc.ref_bitrix = ref
                updated += 1

        if updated > 0:
            db.session.commit()
            log_msg(f"Migration OK: {updated} refs Bitrix extraites vers ref_bitrix")
        else:
            log_msg("Aucune ref a migrer (ou deja fait)")
    
    log_msg("Termine.")
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(log))
    return 0


if __name__ == '__main__':
    sys.exit(main())
