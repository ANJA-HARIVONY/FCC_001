---
name: nouvelle-surface-fcc
description: >-
  Ajoute une route, page ou API FCC_001 (core/routes, template base.html,
  CSRF, droits, sidebar). Utiliser quand l'utilisateur demande un nouvel
  écran, une page, un formulaire, un endpoint, une API JSON, un item de
  menu, ou d'étendre un module (materiales, etats, usuarios, incidencias).
---

# Nouvelle surface — FCC_001

Pas de Blueprints. Pas d’app factory. Lire d’abord routes + service + template **du même domaine**.

## Où placer le code

| Cas | Fichier |
|---|---|
| Domaine déjà dans `core/routes/` | Étendre ce module |
| Nouveau domaine | `core/routes/<domaine>_routes.py` puis `from core.routes import <domaine>_routes` dans `core/app.py` (après les modèles, avec les autres imports routes) |
| Logique réutilisable | `core/services/` |
| CRUD clients / incidents / usuarios existant | `core/app.py` (déjà là) — ne pas y ajouter materiales / etats / AC / apreciaciones |
| UI | `presentation/templates/…` extends `base.html` |
| JS spécifique | `presentation/static/js/` ; étendre un fichier existant plutôt que dupliquer |

Le module routes fait `from core.app import app, db, …` et déclare `@app.route`.

## Droits

- Admin (materiales, usuarios, audit, ficha AC, write apreciaciones) → `@admin_required`
- Liste / KPI / export incidencias → `apply_incident_visibility`
- Fiche / commentaire incidencia → `user_can_access_incident`
- Modifier incidencia → `user_can_modify_incident` ; supprimer → `user_can_delete_incident`
- JSON : `{ 'ok': True/False, 'error': '…en español' }`

Ne pas inventer un statut, une catégorie ou un rôle. Si la règle métier est floue : **demander**.

## Template

- `{% extends "base.html" %}` + blocs `title`, `page_icon`, `page_title`, `page_subtitle`, `content`
- Chaînes ES : `{{ _('…') }}` ; flash `success` | `error` | `info`
- Formulaire POST/PUT/DELETE : `{{ csrf_token() }}` (fetch déjà patché par `js/csrf.js`)
- Tokens CSS existants. Mobile 992px. Listes : variante carte si besoin (`_mobile_list_card_*.html`)

## Navigation

Si la page est dans le menu : ajouter l’**endpoint** aux listes `nav_*` dans :

- `presentation/templates/partials/_sidebar.html`
- `presentation/templates/partials/_nav_vars.html`

Ne pas étendre le CRUD legacy `/operateurs`.

## Après le code

1. Nouvelles chaînes → skill `i18n-fcc`
2. Nouveau champ BDD → skill `schema-fcc`
3. Mutation métier → `write_audit` (best-effort) ; incidencia status → `record_incident_estado_change`
4. Vérifier le flux dans le navigateur (pas seulement un screenshot) : desktop, mobile si layout, états vide/erreur
