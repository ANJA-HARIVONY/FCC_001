#!/usr/bin/env python3
"""Ajoute les colonnes RADIUS sur la table client si absentes (prod / Docker)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / '.env')
except ImportError:
    pass


def main() -> int:
    # Forcer lecture MariaDB via variables Docker/compose
    os.environ.setdefault('FLASK_ENV', os.environ.get('FLASK_ENV', 'production'))
    os.environ.setdefault('FLASK_APP', 'core/app.py')

    from sqlalchemy import inspect, text
    from core.app import app, db, ensure_client_radius_cache_columns

    with app.app_context():
        uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        dialect = uri.split('://', 1)[0] if '://' in uri else 'unknown'
        print(f'Connexion OK (dialecte={dialect})')

        ensure_client_radius_cache_columns._done = False  # type: ignore[attr-defined]
        ensure_client_radius_cache_columns()

        inspector = inspect(db.engine)
        if not inspector.has_table('client'):
            print('ERREUR: table client introuvable')
            return 1

        columns = {col['name'] for col in inspector.get_columns('client')}
        needed = ('username_radius', 'radius_cache_json', 'radius_cache_at')
        missing = [c for c in needed if c not in columns]

        if missing:
            # Fallback ALTER explicite (au cas où ensure a échoué silencieusement)
            alters = []
            if 'username_radius' not in columns:
                alters.append('ADD COLUMN username_radius VARCHAR(100) NULL')
            if 'radius_cache_json' not in columns:
                alters.append('ADD COLUMN radius_cache_json TEXT NULL')
            if 'radius_cache_at' not in columns:
                alters.append('ADD COLUMN radius_cache_at DATETIME NULL')
            sql = f'ALTER TABLE client {", ".join(alters)}'
            print(f'Fallback ALTER: {sql}')
            with db.engine.begin() as conn:
                conn.execute(text(sql))
            columns = {col['name'] for col in inspect(db.engine).get_columns('client')}
            missing = [c for c in needed if c not in columns]

        print('Colonnes RADIUS présentes:')
        for name in needed:
            print(f'  - {name}: {"OK" if name in columns else "MANQUANTE"}')

        if missing:
            print(f'ECHEC: colonnes encore manquantes: {missing}')
            return 1

        # Index optionnel
        try:
            indexes = {idx['name'] for idx in inspector.get_indexes('client')}
            if 'ix_client_username_radius' not in indexes:
                with db.engine.begin() as conn:
                    conn.execute(text(
                        'CREATE INDEX ix_client_username_radius ON client (username_radius)'
                    ))
                print('Index ix_client_username_radius créé')
        except Exception as exc:
            print(f'Index (ignore si déjà existant): {exc}')

        print('SUCCES: colonnes RADIUS prêtes')
        return 0


if __name__ == '__main__':
    raise SystemExit(main())
