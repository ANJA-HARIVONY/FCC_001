---
name: git-workflow-fcc
description: >-
  Prépare et exécute les opérations Git pour le dépôt FCC_001 : statut, add,
  commits au format Conventional Commits en français, push. Utiliser quand
  l'utilisateur demande un commit, un push, de valider des changements, ou
  d'aligner le dépôt sur origin ; sur Windows PowerShell.
---

# Workflow Git — FCC_001

## Shell Windows (PowerShell)

- Enchaîner les commandes avec **`;`**, pas avec `&&` (souvent invalide selon la version).
- Exemple : `git add fichier.css; git status`

## Avant un commit

1. `git status` — voir les fichiers modifiés.
2. `git diff` ou `git diff --staged` — comprendre le périmètre.
3. N’inclure que les fichiers pertinents au besoin exprimé (pas de fichiers hors sujet).

## Format des messages de commit

- **Conventional Commits** : `type(scope): sujet court` (sujet en français, impératif ou description factuelle).
- Types courants : `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `test`.
- Scopes utiles pour ce projet : `ui`, `api`, `templates`, `auth`, `incidents`, `clients`, `specs`, etc.
- Corps optionnel : plusieurs paragraphes avec `-m` répété, ou liste à puces après une ligne vide.

**Exemples :**

```
feat(ui): harmonisation thème, shell et listes

- Navbar et pied de page alignés sur la palette login et --dark-gray.
- Filtres et tableaux cohérents sur incidents, clients, informes.
```

```
fix(templates): corriger contraste en-tête tableau sur la liste incidencias
```

```
docs(specs): mettre à jour la demande d'animation UX
```

## Push

- Après commit : `git push` (branche courante vers `origin`).
- **Ne pas** `git push --force` sur `main` / `master` sans demande explicite de l’utilisateur.

## Checklist rapide

- [ ] Fichiers attendus dans le commit
- [ ] Message clair et cohérent avec le diff
- [ ] Pas de secrets (.env, clés) dans le commit
- [ ] Push uniquement si l’utilisateur le demande
