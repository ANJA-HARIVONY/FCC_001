---
name: git-workflow-fcc
description: >-
  Prépare et exécute les opérations Git pour le dépôt FCC_001 : statut, add,
  commits au format Conventional Commits en français, push, merge d'une
  branche feature dans main, et suppression de la branche. Utiliser quand
  l'utilisateur demande un commit, un push, un merge vers main, de terminer
  une branche, de supprimer une branche, ou d'aligner le dépôt sur origin.
---

# Workflow Git — FCC_001

## Shell

- macOS / zsh / bash : `&&` est correct.
- Windows PowerShell : enchaîner avec **`;`**, pas `&&`.
- Exemple zsh : `git add fichier.css && git status`

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

## Terminer une branche feature (merge dans main)

Quand l’utilisateur a fini une branche et demande de merger dans `main` puis de pousser :

1. Vérifier que le working tree est propre (`git status`). S’il y a des changements non commités, s’arrêter et demander.
2. `git fetch origin` puis comparer :
   - commits de la feature absents de `main` : `git log --oneline main..HEAD`
   - commits de `origin/main` absents de la feature : `git log --oneline HEAD..origin/main`
3. Si `origin/main` a des commits en avance : d’abord rebase ou merge de `main` dans la feature, puis reprendre. Ne pas forcer.
4. `git checkout main` puis `git merge <branche-feature>` (fast-forward si possible).
5. `git push origin main`.
6. Confirmer : `git status -sb` doit afficher `main...origin/main` à jour.

Ne merger que si l’utilisateur le demande. Ne pas `push --force` sur `main`.

## Supprimer la branche feature

Après un merge réussi dans `main`, si l’utilisateur demande de supprimer la branche :

1. Vérifier local et remote : `git branch -a`.
2. Local (sûr, uniquement si déjà mergée) : `git branch -d <branche-feature>`.
3. Remote si elle existe : `git push origin --delete <branche-feature>`.
4. Confirmer qu’elle n’apparaît plus dans `git branch -a`.

Rester sur `main`. Ne pas supprimer `main`. Utiliser `-D` seulement si l’utilisateur demande explicitement de forcer la suppression d’une branche non mergée.

## Checklist rapide

- [ ] Fichiers attendus dans le commit
- [ ] Message clair et cohérent avec le diff
- [ ] Pas de secrets (.env, clés) dans le commit
- [ ] Push uniquement si l’utilisateur le demande
- [ ] Merge dans `main` uniquement si l’utilisateur le demande
- [ ] Suppression de la branche feature uniquement si l’utilisateur le demande (local + origin)
