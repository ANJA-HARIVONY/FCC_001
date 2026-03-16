#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verification de la colonne ref_bitrix"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'core'))

try:
    from core.app import app, db
    from core.app import Incident

    with app.app_context():
        total_bitrix = Incident.query.filter_by(status='Bitrix').count()
        avec_ref = db.session.query(Incident).filter(
            Incident.status == 'Bitrix',
            Incident.ref_bitrix.isnot(None),
            Incident.ref_bitrix != ''
        ).count()
        exemples = db.session.query(Incident).filter(
            Incident.status == 'Bitrix',
            Incident.ref_bitrix.isnot(None)
        ).limit(5).all()

        result = [
            "=== VERIFICATION ref_bitrix ===",
            f"Total incidents Bitrix: {total_bitrix}",
            f"Avec ref_bitrix renseignee: {avec_ref}",
            "Exemples (id, ref_bitrix, intitule):",
        ] + [f"  - {i.id}: {i.ref_bitrix} | {i.intitule[:40]}" for i in exemples]

        output = "\n".join(result)
        print(output)
        out_path = Path(__file__).parent.parent / "verification_ref_bitrix.txt"
        out_path.write_text(output, encoding="utf-8")
        print("\nResultat sauvegarde dans verification_ref_bitrix.txt")
        sys.exit(0)

except Exception as e:
    print(f"ERREUR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
