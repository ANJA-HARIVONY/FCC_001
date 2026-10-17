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

- `{% extends "base.html" %}` + blocs `title`, `page_icon`, `page_title`, `page_subtitle`, `page_actions`, `page_breadcrumb`, `content`
- Chaînes ES : `{{ _('…') }}` ; flash `success` | `error` | `info`
- Formulaire POST/PUT/DELETE : `{{ csrf_token() }}` (fetch déjà patché par `js/csrf.js`)
- Tokens CSS existants. Mobile 992px. Listes : variante carte si besoin (`_mobile_list_card_*.html`)
- Contenu : `<div class="container-fluid px-0">`. Action principale : `btn btn-primary btn-sm` dans `page_actions`. Retour : `btn btn-outline-secondary btn-sm` (`Volver`)

## Navigation

Le logo de l’en-tête ramène au Dashboard. La sidebar est le menu. Le fil d’Ariane ne recommence pas par Dashboard.

Fiche ou formulaire : bloc `page_breadcrumb` (rendu dans le titre de `base.html`), pas dans `content`.

```html
{% block page_breadcrumb %}
<nav aria-label="breadcrumb" class="app-breadcrumb page-title-breadcrumb">
    <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a href="{{ url_for('incidents') }}">Incidencias</a></li>
        <li class="breadcrumb-item active" aria-current="page">Nueva Incidencia</li>
    </ol>
</nav>
{% endblock %}
```

- Premier lien = section du menu (`Incidencias`, `Clientes`, `Materiales`, `Instalaciones`, `Usuarios`). Le bouton `Volver` pointe vers la même section.
- Liste de premier niveau (entrée de sidebar) : pas de fil d’Ariane.
- Lien vers un écran `@admin_required` : seulement si `current_user.is_admin()`.
- Carte KPI du Dashboard : lien vers la liste filtrée (état + période), pas une carte sans destination.

Si la page est dans le menu : ajouter l’**endpoint** aux listes `nav_*` de `presentation/templates/partials/_sidebar.html` seulement. Pas de second partial de navigation.

Ne pas étendre le CRUD legacy `/operateurs`. Ne pas le documenter dans `aide.html` comme entrée de menu.

## Après le code

1. Écran, bouton, filtre ou flux visible → `presentation/templates/aide.html` (section, mots-clés, les deux sommaires, FAQ si le geste est courant)
2. Nouvelles chaînes → skill `i18n-fcc`
3. Nouveau champ BDD → skill `schema-fcc`
4. Mutation métier → `write_audit` (best-effort) ; incidencia status → `record_incident_estado_change`
5. Vérifier le flux dans le navigateur (pas seulement un screenshot) : desktop, mobile si layout, états vide/erreur. Depuis le Dashboard, le lien ouvre la liste attendue ; depuis la fiche, la route et `Volver` reviennent à la section
