# Plan de clôture — réécriture React / Node

Date : 24 octobre 2026. Branche : `feat/reecriture-react-node`.
Suite de `docs/plan-reecriture-react-node.md` et de `docs/rapports/2026-10-21-rapport-general.md`.

La réécriture est en service : les phases 0 à 8 sont dans le code, le port 8089 sert React et l’API Nest depuis le 21 octobre 2026, 12 h 13. Ce plan ferme ce qui reste. Il ne rouvre pas le métier, les statuts, les rôles, ni les noms de colonnes.

## Ce qui est déjà tenu

| Sujet | État |
|---|---|
| Écrans et API | Présents. Aucune route de `docs/liste-verification-pages.md` n’est absente. `PlaceholderPage` n’est branché sur aucune route. |
| Bascule locale | `docker-compose.bascule.yml` : `fcc_001_web` + `fcc_001_api` sur le port 8089, mêmes volumes d’uploads, d’instance et d’avatars. Base `fcc_001_db` non migrée. |
| Parité des listes | `tools/parite/compare.mjs` et `tools/parite/oracle.mjs` sortis à 0 le 21 octobre, sur la copie `fcc_001_parite`. |
| Fenêtre de retour | Échue le 23 octobre 2026, 12 h. Le conteneur `fcc_001_app` peut encore être sur disque. |
| Langue de la coquille | Login, sidebar, en-tête, pied, aide, alerte de session et dashboard passent par `t()`. |

## Ce qui empêche de dire « clos »

1. Travail local non commité après `fbb77ae` : autocomplétion técnico / client, fiche et formulaire d’installation, dashboard, formulaire de salida, pile Docker `docker-compose.react.yml` (port 8090, base propre `fcc_react`).
2. `docs/liste-verification-pages.md` marque encore chaque écran « À comparer ». La comparaison du 21 octobre porte sur les listes et un parcours, pas sur le visuel desktop et mobile des trois rôles.
3. Les prompts de `apps/api/src/informes/gemini.ts` ne sont pas confrontés ligne à ligne à `core/services/gemini_service.py`.
4. Les écrans métier (incidencias, clientes, materiales, instalaciones, informes, usuarios, perfil) sont en espagnol en dur. Le sélecteur `es` / `fr` / `en` ne les change pas.
5. `docker compose up` décrit encore Flask. Le profil `with-nginx` vise Flask. `README.md`, `CLAUDE.md` et les règles d’identité décrivent encore `python start_app.py` comme l’application.
6. `PASSWORD_REHASH` est faux. Un login Node ne réécrit pas le hash Werkzeug. On le laisse faux dans cette clôture : le rallumage de Flask ne doit pas devenir impossible par un hash Argon2id écrit au passage.
7. Le code Flask (`core/`, `presentation/`, `start_app.py`, tests Python, Alembic) est encore l’arbre de travail. Le plan d’origine le retire du déploiement après la fenêtre, et garde le dépôt historique en archive.

## Décisions de cette clôture

| Sujet | Choix |
|---|---|
| Entrée des opérateurs | Port 8089, MariaDB `fcc_001_db`, volumes déjà montés par la bascule. Une commande Compose, MariaDB + API + web. |
| Pile `fcc_react` | Reste un laboratoire : port 8090, base `fcc_react`, volumes propres. Elle ne pointe pas vers `fcc_001_db`. Elle n’est pas l’entrée des opérateurs. |
| Flask | Tag d’archive, puis retrait de l’arbre actif et du `up` par défaut. Les volumes Docker d’uploads, d’instance et d’avatars ne sont pas supprimés. |
| Mots de passe | `PASSWORD_REHASH` reste faux. Le vérificateur Werkzeug reste dans l’API. |
| Langue | Les libellés d’écran passent par `t()`. Les littéraux métier restent les mots déjà à l’écran en espagnol : `Incidencias`, `Pendiente`, `Solucionadas`, `Bitrix`, `Usuarios`. |
| Schéma | Aucun `ALTER`. Prisma continue de mapper les colonnes françaises. |
| Hors clôture | Odoo, Kimi, WeasyPrint, menu Operadores, renommage de colonnes, nouveau statut, fusion dans `main`. La fusion se fait sur demande explicite, après ce plan. |
| Aides et règles | `apps/web/src/pages/AyudaPage.tsx` devient la page d’aide. Toute règle modifiée est recopiée dans `.cursor/rules/` et `.claude/rules/`. |

## Ordre

Les phases se suivent. On n’archive pas Flask avant la signature visuelle et la confrontation des prompts : les templates et `gemini_service.py` sont la référence. On ne traduit pas les écrans avant cette signature : les chaînes bougeraient deux fois.

| Phase | But | Bloque la suivante |
|---|---|---|
| A | Ranger le travail local | oui |
| B | Signer la parité visuelle | oui |
| C | Aligner les prompts Gemini | oui |
| D | Traduire les écrans métier | non pour E, oui pour dire le sélecteur honnête |
| E | Une seule commande de déploiement | oui pour F |
| F | Archiver Flask et le retirer de l’arbre actif | oui |
| G | Documents, règles, critère de fin | — |

## Phase A — Ranger le travail local

Le dépôt de travail contient des modifications non commitées. La clôture part d’un arbre propre, sur un commit dont les tests passent.

Fichiers en cours : règles métier et UI, `instalaciones.service.ts`, `DashboardPage.tsx`, fiche et formulaire d’installation, `types.ts`, `SalidaFormPage.tsx`, `docker-compose.yml`, plus les fichiers nouveaux `SearchAutocomplete.tsx`, les tests de formulaire et de fiche, `fcc-react.mdc` / `fcc-react.md`, `docker-compose.react.yml`, `docker/react/`.

1. Relire le diff. Garder le comportement déjà décrit dans `fcc-react.mdc` : autocomplétion técnico et client, date locale `YYYY-MM-DD`, lignes de matériel facultatives à la création, pas de matériel dans le formulaire d’édition.
2. Lancer `npm test` et `npm run typecheck`.
3. Vérifier dans le navigateur, sur la pile qui sert les opérateurs ou sur le laboratoire 8090 : création d’installation, édition, fiche (Terminar, Reabrir, Eliminar seulement si `tipo=nueva`), salida depuis la fiche.
4. Commit Conventional Commits en français, séparé des commits de clôture. Message centré sur le formulaire d’installation et l’autocomplétion.
5. `docker-compose.react.yml` va dans ce commit s’il démarre. Le documenter en une phrase dans le README de la phase G : laboratoire, port 8090, base `fcc_react`.

Critère : `git status` propre. Les tests et le typecheck passent. Un admin crée une installation avec une ligne et retrouve la salida liée sur la fiche.

## Phase B — Signer la parité visuelle

Référence : `docs/liste-verification-pages.md`. Chaque ligne « À comparer » devient « Tenu » ou « Écart corrigé ». Un écart se corrige dans cette phase, puis la ligne repasse.

Comptes : `usuario`, `admin`, `superadmin`. Largeurs : desktop et une largeur mobile. Même base pour les deux applications tant que Flask répond encore (`python start_app.py` sur le port 5001, React sur 8089 ou 5173).

Ordre des menus : Dashboard, Incidencias (liste, création, fiche, édition, commentaire, Excel de la page), Clientes (liste, création, édition, fiche, impression, vérification, Excel), Informes, Materiales, Instalaciones, Perfil, Ayuda. Puis, avec le bon rôle : Traslado, GPS et fotos sur la fiche client, Usuarios, Trazabilidad, Base de datos, ficha atención al cliente, ficha técnico.

Contrôles qui ne se voient pas sur une capture :

- Un `usuario` sur `/materiales` et `/usuarios` voit 403. Le menu Operadores est absent.
- Un admin ne voit pas une incidencia d’une autre agencia ni une installation d’une autre ciudad. Il voit le même client qu’un autre agencia.
- Session : alerte à 2 minutes, ping, rejet après inactivité. Un compte `actif=false` ne se connecte pas.
- Excel : page courante pour clients, incidencias et salidas. Jeu filtré complet pour l’informe de materiales, la ficha et un informe `generated`.
- Relancer `tools/parite/compare.mjs` et `tools/parite/oracle.mjs` sur `fcc_001_parite` si les conteneurs de comparaison existent encore. Une sortie différente de 0 est un écart de cette phase.

Critère : plus aucune ligne « À comparer » ni « Écart connu » dans la liste. Le rapport de phase note les écrans corrigés.

## Phase C — Prompts Gemini

Comparer `buildPrompt` dans `apps/api/src/informes/gemini.ts` aux quatre constructions de `core/services/gemini_service.py` : résumé, tendances, performance, analyse personnalisée.

Aligner le texte, le mode JSON, le repli sans thinking, le message si la clé est absente, et le texte local de `local-content.ts` sur le texte déterministe de Flask. Les prompts restent en espagnol.

Sans clé, ou avec `ETATS_USE_AI` faux, un informe passe à `generated` avec le texte local. Aucun appel réseau n’est la preuve : la preuve est le diff des chaînes et le test déjà présent dans `apps/api/test/informes.test.ts`.

Critère : un lecteur voit les deux prompts côte à côte et ne trouve plus d’écart de consigne. Le test d’informe sans Gemini passe.

## Phase D — Écrans métier traduits

Catalogues déjà chargés par `apps/web/src/i18n.ts` (`es`, `fr`, `en`, clé `fcc_lang`, défaut `es`). Aujourd’hui seuls la coquille, l’aide, le login et le dashboard appellent `useTranslation`.

Passer les libellés par `t()`, dans l’ordre du menu : incidencias, clientes, informes, materiales, instalaciones, perfil, usuarios, trazabilidad, base de datos, fiches. Même travail sur les messages d’erreur renvoyés par l’API qui sont des libellés d’interface. Les messages métier déjà en espagnol côté API peuvent rester en espagnol si le Flask les renvoyait ainsi ; les entourer de `t()` seulement quand une clé existe dans les trois catalogues.

Les valeurs espagnoles des clés métier sont les mots déjà à l’écran. `Pendiente` et `Solucionadas` ne deviennent pas « En attente » et « Résolues » dans le catalogue `es`.

Après nouvelles chaînes : mettre à jour `apps/web/src/locales/{es,fr,en}.json`. Si une clé vient des catalogues Babel `i18n/translations/`, reprendre la traduction déjà écrite. Ne pas inventer un libellé.

Critère : au premier affichage, l’espagnol sur une fiche incidencia et sur le hub instalaciones. Après le choix `fr`, ces libellés passent en français, un rafraîchissement conserve `fcc_lang`, et les statuts restent `Pendiente` et `Solucionadas` quand la langue d’interface est l’espagnol.

## Phase E — Un seul déploiement

La fenêtre de retour est échue. On fige le retour arrière avant de toucher à l’arbre des sources.

1. Dump de `fcc_001_db` hors du dépôt. Contrôle : le fichier s’ouvre, les tables de `docs/parite.md` y sont. Les volumes `fcc_001_app_uploads`, `fcc_001_app_instance` et `fcc_001_app_avatars` restent en place.
2. Confirmer que 8089 sert le login React, que `GET /api/health` répond 200, et que `GET /api/clients` sans cookie répond 401.
3. Arrêter `fcc_001_app` s’il tourne. Ne pas lancer `docker compose --profile with-nginx` : ce Nginx vise Flask.
4. Replier `api` et `web` de `docker-compose.bascule.yml` dans le Compose principal, en gardant le projet Docker `fcc_001` (les conteneurs et volumes existent sous ce nom). Le service `app` sort du `up` par défaut. `PASSWORD_REHASH` reste `false`. `SESSION_COOKIE_SECURE` reste faux en HTTP local.
5. La commande des opérateurs devient un seul `docker compose up -d --build`. MariaDB, phpMyAdmin, l’API et le web démarrent. Flask ne démarre pas.
6. `docker-compose.rewrite.yml` et le service de parité Flask ne sont plus le chemin de comparaison une fois la phase B signée. Les garder jusqu’à la signature, puis les retirer du mode d’emploi.
7. `docker-compose.react.yml` reste le laboratoire 8090. Sa base s’appelle `fcc_react`. Aucun volume partagé avec `fcc_001_app_uploads`.

Critère : un `docker compose up -d` depuis un clone propre amène le login React sur 8089 et MariaDB. Aucun conteneur Flask n’est running. Les fichiers déjà uploadés s’affichent encore.

## Phase F — Archiver Flask

Seulement après B, C et E.

1. Tag git annoté sur le commit qui contient encore Flask, par exemple `archive/flask-2026-10-24`. Le tag n’est pas poussé tant que ce n’est pas demandé.
2. Retirer de l’arbre actif le code qui n’a plus d’appelant : `core/`, `presentation/` (templates, statiques versionnés, `aide.html`), `start_app.py`, `config/requirements.txt`, `config.py` s’il ne sert qu’à Flask, `migrations/`, `tests/` Python, le `Dockerfile` Flask, `docker-compose.local.yml` s’il ne lance que Flask.
3. Ne pas supprimer les volumes nommés. Les montages de l’API restent `presentation/uploads`, `instance` et `presentation/static/avatars` à l’intérieur du conteneur : ce sont des chemins de volume, pas une raison de garder les templates.
4. `docs/parite.md` reste. Il décrit le comportement gelé. L’en-tête précise que la référence vivante est désormais l’API et les tests Node.
5. `apps/web/src/pages/AyudaPage.tsx` est l’aide. La règle `fcc-aide` pointe vers cette page, avec les deux sommaires, les mêmes sections, et les mêmes gardes admin / superadmin.
6. `CLAUDE.md`, `README.md`, les règles d’identité, de fichiers et de sécurité décrivent le monorepo `apps/api`, `apps/web`, `packages/domain`. Les commandes deviennent `npm test`, `npm run typecheck`, et le Compose de la phase E. Le port local des opérateurs est 8089. Le laboratoire React isolé est 8090.
7. `package.json` : la description ne dit plus que le Flask historique reste à la racine.
8. Relancer `npm test` et `npm run typecheck`. Ouvrir le login, une lista d’incidencias, une fiche client et le hub instalaciones sur 8089.

Critère : un clone de la branche démarre sans Python. Le tag `archive/flask-2026-10-24` contient encore `core/app.py`. L’aide React a les deux sommaires. Les trois rôles voient le menu déjà figé dans `docs/parite.md`.

## Phase G — Documents de fin

1. Mettre à jour le tableau d’avancement de `docs/plan-reecriture-react-node.md` : phase 9 close, clôture tenue, lien vers ce fichier.
2. Écrire `docs/rapports/2026-10-24-cloture.md` : commit de départ, tag d’archive, commande Compose, résultat des tests, écrans corrigés en phase B, écarts de prompts corrigés en phase C.
3. Corriger la dernière phrase de `docs/plan-trous-flask.md` : la bascule est faite, les trous listés sont fermés, ce document n’est plus une liste de travail.
4. `docs/liste-verification-pages.md` : légende à jour, plus de ligne « À comparer ».

Critère de fin du plan : un opérateur fait sa journée sur http://localhost:8089. Un superadmin ouvre Usuarios, Trazabilidad et Base de datos. `git status` est propre. `npm test` et `npm run typecheck` passent. Le README n’indique plus `python start_app.py` comme démarrage. Le sélecteur de langue change les écrans métier. Flask se retrouve par le tag, pas par le `up`.

## Après la clôture, sur demande seulement

- Fusion de `feat/reecriture-react-node` dans `main`, puis poussée.
- Bascule d’un Portainer qui servirait encore l’image Flask. Le guide Portainer du README décrit encore cette image : le réécrire au moment de ce déploiement, pas avant.
- Passage de `PASSWORD_REHASH` à vrai, après un dump, une fois le tag d’archive accepté comme seul retour possible. Ce n’est pas une étape de ce plan.
