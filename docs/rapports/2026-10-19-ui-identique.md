# Rapport — UI identique au Flask

Date : 19 octobre 2026. Branche : `feat/reecriture-react-node`.

## Objectif

La coquille React ne doit plus être un layout Bootstrap générique : elle reprend le HTML et les CSS de l'application Flask.

## Changements

- CSS servis depuis `presentation/static` (`style.css`, `layout-shell.css`) via Vite sous `/static/…`.
- Login : même structure ArchitectUI (`login-aside` + `app-login-box`), logo CONNEXIA, points de confiance, champs Correo o teléfono / Contraseña, Recordarme, bouton Entrar.
- Shell authentifié : `app-header`, `app-sidebar` (icônes Font Awesome et libellés identiques), `app-page-title`, `app-footer`, overlay mobile, thème clair/sombre.
- Modale de session : « Sesión a punto de expirar » / Seguir conectado / Cerrar sesión (comme `base.html`).
- `/api/auth/me` expose aussi `agenciaNombre`, `ciudadNombre`, `avatarUrl` pour le bandeau.

## Vérification

```text
npm test -w @fcc/api   # 9/9
npm test -w @fcc/web   # 9/9
```

Navigateur : `http://localhost:5173/login` affiche le panneau sombre CONNEXIA à gauche et le formulaire à droite en largeur bureau.

Les écrans métier restent des emplacements dans le même chrome. Les listes et formulaires Flask (filtres, tableaux, badges) seront calqués module par module.
