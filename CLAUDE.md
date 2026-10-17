# FCC_001 — Atención al Cliente (Connexia)

App Flask monolithique de service client pour un FAI : clientes, incidencias, instalaciones, materiales, informes (Gemini), apreciaciones, usuarios.
Les règles détaillées sont dans `.claude/rules/` (chargées automatiquement) ; les procédures dans `.claude/skills/`.

## Stack

- Flask 3, SQLAlchemy 2, Flask-Login, Flask-WTF (CSRF), Flask-Babel — `config/requirements.txt`
- MariaDB 10.11 (`utf8mb4`) via Docker ; SQLite = secours dev uniquement
- Templates Jinja2 + JS vanilla + Bootstrap ; UI en **espagnol**
- Intégrations **lecture seule** : Bitrix24, RADIUS, Gemini (informes). Odoo / Kimi / WeasyPrint non branchés

## Commandes

```bash
# Docker local (le code est COPIÉ dans l'image : toujours --build après une modif)
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose logs -f app            # http://localhost:8089
docker compose down

# Local sans Docker (port 5001)
python3 -m venv .venv && .venv/bin/pip install -r config/requirements.txt
python start_app.py

# Tests (unittest ; tests/ est exclu de l'image Docker → lancer en local)
.venv/bin/python -m unittest discover -s tests -v

# Vérification syntaxe rapide (détecte aussi les marqueurs de conflit)
python3 -m compileall -q core config.py start_app.py
```

## Carte du code

| Chemin | Contenu |
|---|---|
| `core/app.py` | Config, modèles, droits, `ensure_*`, auth, CRUD clients / incidents / usuarios (gros fichier : lire par zone) |
| `core/routes/*_routes.py` | materiales, etats, instalaciones, atencion_cliente, apreciaciones |
| `core/services/` | Logique réutilisable (exports, caches Bitrix/RADIUS, Gemini, instalaciones, materiales) |
| `presentation/templates/` | Jinja2, `base.html` + partials ; `aide.html` = Centro de Ayuda |
| `migrations/versions/` | Migrations `DDMMYYYY_*.py` (+ `ensure_*` idempotents dans `core/app.py`) |
| `i18n/translations/{es,fr,en}/` | Catalogues Babel |

## Langues

- UI, flash, erreurs JSON, prompts Gemini : **espagnol** via `gettext` / `{{ _('…') }}`
- Réponses à l'utilisateur et messages de commit : **français** (Conventional Commits)

## Méthode

- Lire route + service + template du même domaine avant d'éditer. Diff minimal.
- Règle métier ambiguë (statut, rôle, droit) → **demander**, ne rien inventer.
- Changement visible → mettre à jour `presentation/templates/aide.html`.
- Nouvelles chaînes → skill `i18n-fcc` ; nouveau champ BDD → skill `schema-fcc` ; nouvelle page → skill `nouvelle-surface-fcc`.
- Ne pas commiter / pousser sans demande explicite.

## Pièges connus

- Après un merge : vérifier qu'aucun marqueur `<<<<<<<` / `=======` / `>>>>>>>` ne reste (déjà arrivé dans `gemini_service.py`).
- Fins de ligne : LF uniquement (`.gitattributes`). Ne pas réintroduire de CRLF.
- Ne jamais lire ni afficher `.env` ; secrets uniquement par variables d'environnement.
- `config.py` et `instance/gestion_client.db` sont dans `.gitignore` mais encore suivis par Git : n'y mettre aucun secret ni donnée réelle.

## Synchronisation avec Cursor

`.cursor/rules/*.mdc` et `.cursor/skills/` sont les équivalents Cursor de `.claude/rules/` et `.claude/skills/`. Toute modification d'une règle doit être reportée des deux côtés.
