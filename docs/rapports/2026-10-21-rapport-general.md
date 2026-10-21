# Rapport général — réécriture React / Node

Date : 21 octobre 2026. Branche : `feat/reecriture-react-node`.

Ce rapport remplace le bilan du 20 octobre (`docs/rapports/2026-10-20-rapport-general.md`). Les phases 0 à 8 sont closes dans le code. La bascule est faite : le port 8089 sert React et l’API. Flask est arrêtée, le conteneur reste démarrable jusqu’au 23 octobre 2026, 12 h.

## Phases

| Phase | Verdict |
|---|---|
| 0 — Gel | Tenue. `docs/parite.md` |
| 1 — Socle | Tenue. Nest, Prisma sans migration, cookie, CSRF, Werkzeug puis Argon2id. Session dans `instance/api-sessions.json` |
| 2 — Coquille | Tenue. Sidebar selon le rôle, pas de menu Operadores, aide à deux sommaires |
| 3 — Clients | Tenue. Référentiel partagé, sitio actif, Excel de page, RADIUS, fotos (max 10), impression, vérification |
| 4 — Incidencias | Tenue. Visibilité 10.4, commentaires, historique, `ref_bitrix` 10 chiffres, Bitrix en lecture, Excel de page |
| 5 — Materiales | Tenue. Catálogo partagé, salidas scopées, informe, ficha técnico, photos, Excel |
| 6 — Instalaciones | Tenue. Hub, nueva avec salida liée, terminar / reabrir, traslado non supprimable, GPS, fotos, Copiar |
| 7 — Informes | Tenue. Visibilité `agence_id`, texte local sans clé, branche Gemini, Excel d’un informe `generated` |
| 8 — Compte | Tenue. Perfil, avatar, usuarios, trazabilidad, export SQL, dashboard, apreciación, ficha avec le calcul Flask |
| 9 — Parité | Comparaison tenue sur `fcc_001_parite`. Bascule faite sur le port 8089. Flask arrêtée, redémarrable 48 h. Voir `docs/rapports/2026-10-21-phase-9.md` |

## Trous du 20 octobre

Copiar sur le hub Instalaciones, Excel d’un informe, avatar, toasts Pendiente de plus de 30 minutes, retard de la ficha, informe de materiales, ficha técnico, export SQL : présents, avec tests de la règle.

Le sélecteur `es` / `fr` / `en` est dans l’en-tête et au login. La coquille (sidebar, en-tête, aide, login, dashboard) passe par `t()`. Les écrans métier restent en espagnol en dur. Le critère du trou (coquille en français après le choix, littéraux `Pendiente` et `Solucionadas` inchangés en espagnol) est tenu. La traduction page par page reste ouverte, elle ne bloque pas la comparaison.

## Docker

`docker-compose.yml` lance MariaDB. `docker-compose.bascule.yml` sert React (Nginx) et l’API Nest sur le port 8089, avec les volumes d’uploads, d’instance et d’avatars de Flask. `PASSWORD_REHASH` reste faux. Le profil `with-nginx` du compose principal vise encore Flask : ne pas l’activer pendant la fenêtre. `docker-compose.rewrite.yml` reste le montage de comparaison à côté, pas l’entrée des opérateurs.

## Tests de ce jour

Règles de la phase 8 et tri du catalogue : passés. Sur la copie : `tools/parite/compare.mjs` et `tools/parite/oracle.mjs` sortent 0. Le parcours navigateur (login, incidencia commentée, traslado, installation avec matériel, informe local, Excel, session absente) a été fait sur le front branché à cette copie.

## Reste

Fenêtre de retour jusqu’au 23 octobre 2026, 12 h : `docker compose -p fcc_001 -f docker-compose.yml -f docker-compose.bascule.yml stop web api`, puis `docker update --restart=unless-stopped fcc_001_app` et `docker start fcc_001_app`. La base n’a pas été migrée. Ensuite seulement, retirer Flask du déploiement. Les prompts Gemini sont branchés ; leur texte n’a pas été confronté ligne à ligne au Flask. La traduction page par page des écrans métier reste ouverte.
