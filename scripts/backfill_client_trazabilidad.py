#!/usr/bin/env python3
"""Remplit id_operateur / id_operateur_modificacion sur client depuis audit_log.

Les clients créés avant la mise en place de l'audit restent sans créateur
connu (affichés « — » sur la ficha). Le script est idempotent : il ne touche
que les lignes dont la colonne est encore NULL.

Usage (Docker) : docker exec fcc_001_app python scripts/backfill_client_trazabilidad.py
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / '.env')
except ImportError:
    pass

CLIENT_ID_RE = re.compile(r'client_id=(\d+)')


def main() -> int:
    os.environ.setdefault('FLASK_ENV', os.environ.get('FLASK_ENV', 'production'))
    os.environ.setdefault('FLASK_APP', 'core/app.py')

    from core.app import app, db, AuditLog, Client, ensure_client_trazabilidad_columns

    with app.app_context():
        ensure_client_trazabilidad_columns._done = False  # type: ignore[attr-defined]
        ensure_client_trazabilidad_columns()

        # Création : première trace par client. Modification : la plus récente.
        createurs: dict[int, int] = {}
        modificateurs: dict[int, tuple[int, object]] = {}
        rows = (
            AuditLog.query
            .filter(AuditLog.action.in_(('CREATE_CLIENT', 'UPDATE_CLIENT')))
            .filter(AuditLog.id_operateur.isnot(None))
            .order_by(AuditLog.id.asc())
            .all()
        )
        for row in rows:
            match = CLIENT_ID_RE.search(row.detail or '')
            if not match:
                continue
            client_id = int(match.group(1))
            if row.action == 'CREATE_CLIENT':
                createurs.setdefault(client_id, row.id_operateur)
            else:
                modificateurs[client_id] = (row.id_operateur, row.date_heure)

        print(f'Traces exploitables : {len(createurs)} créations, {len(modificateurs)} modifications')

        remplis_creation = 0
        remplis_modification = 0
        for client in Client.query.all():
            if client.id_operateur is None and client.id in createurs:
                client.id_operateur = createurs[client.id]
                remplis_creation += 1
            if client.id_operateur_modificacion is None and client.id in modificateurs:
                operateur_id, quand = modificateurs[client.id]
                client.id_operateur_modificacion = operateur_id
                client.modifie_le = quand
                remplis_modification += 1

        db.session.commit()

        total = Client.query.count()
        connus = Client.query.filter(Client.id_operateur.isnot(None)).count()
        print(f'Créateur renseigné sur {remplis_creation} client(s) lors de ce passage')
        print(f'Modificateur renseigné sur {remplis_modification} client(s) lors de ce passage')
        print(f'Total : {connus}/{total} clients avec créateur connu')
        return 0


if __name__ == '__main__':
    raise SystemExit(main())
