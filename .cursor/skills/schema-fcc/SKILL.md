---
name: schema-fcc
description: >-
  Ajoute une colonne ou table FCC_001 avec migration Alembic DDMMYYYY et
  fonction ensure_* idempotente. Utiliser quand l'utilisateur demande une
  migration, un champ SQLAlchemy, ALTER TABLE, Flask-Migrate, alembic,
  ensure_*, ou un changement de schéma MariaDB.
---

# Schéma — FCC_001

Toute nouvelle colonne / table = **les deux** :

1. Fichier `migrations/versions/DDMMYYYY_slug.py` (idempotent)
2. `ensure_*` dans `core/app.py`, appelé depuis `require_authentication()`

Ne pas écraser une migration déjà versionnée. Ne pas renommer les colonnes FR (`nom`, `intitule`, `date_heure`, …).

`FLASK_APP=core/app.py`. Head Alembic actuel : la `revision` qui n’apparaît dans aucun `down_revision` (lire `migrations/versions/`).

## Checklist

```
- [ ] Modèle / colonne dans core/app.py
- [ ] Nouvelle migration (inspector + add si absent)
- [ ] ensure_* avec garde _done + inspect
- [ ] Appel dans require_authentication()
- [ ] flask db upgrade en local si l’utilisateur le veut
```

## 1. Trouver le parent

Lire `revision` / `down_revision` dans `migrations/versions/`.  
`down_revision` du nouveau fichier = head actuelle. Ne pas créer de branche parallèle.

Nom : `DDMMYYYY_description.py`  
`revision` : id court du même jour, ex. `24072026_client_radius`.

## 2. Migration (modèle du dépôt)

Copier le style de `migrations/versions/24072026_client_radius_cache.py` :

- `upgrade()` : `sa.inspect(bind)` ; `return` si table absente ; n’ajouter que les colonnes manquantes
- `downgrade()` : drop seulement si la colonne existe
- MariaDB `utf8mb4` ; pas de f-string SQL avec entrée utilisateur

Ne pas se fier à `flask db migrate` seul : le fichier auto-généré n’est **pas** idempotent. Le réécrire au pattern inspector, ou écrire à la main.

## 3. ensure_*

Modèle : `ensure_client_radius_cache_columns` / `ensure_apreciacion_dia_table`.

- Garde `if getattr(fn, '_done', False): return`
- `inspect(db.engine)` ; no-op si table absente
- Colonne : `ALTER TABLE … ADD COLUMN …` **une par une** dans `db.engine.begin()`
- Table : `Model.__table__.create(db.engine)` si `not has_table`
- `except` : `db.session.rollback()` + `app.logger.exception(...)`
- Marquer `_done = True` en succès **et** si la table n’existe pas encore

Puis ajouter l’appel dans `require_authentication()` (bloc des autres `ensure_*`).

## 4. Appliquer

```bash
FLASK_APP=core/app.py .venv/bin/flask db upgrade
```

Prod : ne jamais basculer vers SQLite. Commit seulement si l’utilisateur le demande.
