# Plan d'exécution — réécriture FCC_001 en React et Node.js

## Avancement

| Phase | État | Preuve |
|---|---|---|
| 0 — Gel du comportement | faite | `docs/parite.md`, `docs/rapports/2026-10-19-phase-0.md` |
| 1 — Socle | en cours | Prisma introspecté (18 modèles, aucune migration). API NestJS : login, session, CSRF, hash Werkzeug, audit best-effort. `docs/rapports/2026-10-19-phase-1.md`. React, Redis et les modules métier restent à faire. |
| 2 à 9 | non commencées | — |

Branche : `feat/reecriture-react-node`.

La réécriture est un remplacement total : React pour tous les écrans, Node.js pour toute l’API, même métier, même base MariaDB. L’application Flask actuelle reste la référence de comportement jusqu’à la bascule.

Le périmètre à reproduire est déjà borné : 18 tables, environ 90 routes, 3 intégrations en lecture seule (Bitrix24, RADIUS, Gemini), et des droits qui ne se résument pas à « admin voit tout ».

## Décisions figées pour ce plan

Quatre choix rendent le plan exécutable. Ils sont pris ici ; un changement d’un seul d’entre eux décale les phases 1 et 2.

| Sujet | Choix |
|---|---|
| Données | Conserver MariaDB 10.11 et les noms de colonnes (`nom`, `intitule`, `ville`, `date_heure`, `mot_de_passe_hash`). Aucun renommage, aucun nouveau statut. |
| Code | Monorepo neuf `apps/api` (NestJS, TypeScript) et `apps/web` (Vite, React, TypeScript), à côté du Flask gelé. Le Flask n’est plus modifié sauf correctif bloquant. |
| Auth | Cookie de session `HttpOnly` + `SameSite=Lax`, pas de JWT dans `localStorage`. Durée 12 h, inactivité 30 min, alerte à 2 min. |
| UI | Espagnol à l’écran. Catalogues `es` / `fr` / `en` repris depuis `i18n/translations`. Parité fonctionnelle d’abord, habillage Bootstrap conservé pour que les opérateurs retrouvent les listes, filtres et modales. |

Odoo, Kimi et WeasyPrint ne sont pas repris. L’impression reste celle du navigateur. Le menu `Operadores` n’est pas recréé : les comptes passent par Usuarios.

## Carte de parité

À la fin, ces écrans existent, avec les mêmes libellés.

| Menu | Rôles | Écrans |
|---|---|---|
| Dashboard | tous | KPI du jour, filtres ciudad/agencia (superadmin), apreciación, graphiques, notifications |
| Incidencias | tous | Liste, création, fiche, modification, commentaire, export Excel de la page |
| Clientes | tous | Liste, création, modification, fiche (GPS, fotos, RADIUS, Traslado), impression, vérification, export Excel de la page |
| Informes | tous | Liste, génération, détail, régénération, suppression, export JSON et Excel |
| Materiales | admin, superadmin | Hub, catálogo, salidas, fiche sortie, informe, fiche técnico |
| Instalaciones | admin, superadmin | Hub, création, détail, modification, terminar, reabrir, eliminar |
| Usuarios | superadmin | Liste, création, édition, désactivation, avatar, ficha atención al cliente |
| Trazabilidad | superadmin | Journal, export texte |
| Base de datos | superadmin | Vérification, export |
| Cuenta | tous | Perfil, Centro de Ayuda, Salir |

GPS, fotos et Traslado restent sur la fiche client. Le hub Instalaciones ne les liste pas.

Littéraux à coder comme constantes partagées (`packages/domain`), recopiées depuis `core/app.py` :

- Incident : `Pendiente` | `Solucionadas` | `Bitrix`
- Client : `particular` | `corporativo`
- Rôle : `usuario` | `admin` | `superadmin` — `is_admin()` couvre admin et superadmin
- Catégorie utilisateur : `atencion_cliente` | `tecnico`
- Matériel : `outillage` | `material_cliente`
- Salida : types `uso_interno` | `incidencia` | `instalacion` ; états `registrada` → `modificada`
- Instalación : `en_curso` → `terminada` ; types `nueva` | `traslado`
- Traslado : `reutilizado` | `retirado`

Règle de visibilité, à tester avant toute liste métier : le superadmin voit tout. L’admin a le même filtre que le `usuario` : son `agencia` et sa `ciudad`. Clients et catálogo de material sont partagés. Incidencias, dashboard, informes, salidas, informe de materiales et instalaciones sont scopés.

## Phase 0 — Gel du comportement

But : une spécification vérifiable, avant la première ligne React.

1. Exporter le schéma MariaDB réel (`SHOW CREATE TABLE`) et le comparer aux 18 modèles de `core/app.py`. Le schéma vivant gagne sur le modèle si les deux divergent.
2. Relever le format des hash dans `mot_de_passe_hash` (Werkzeug émet `scrypt:` ou `pbkdf2:sha256:`). L’API Node doit vérifier ce format tel quel, puis réécrire le hash en Argon2id au premier login réussi.
3. Dresser la matrice droits : pour chaque action (voir, créer, modifier, supprimer), les trois rôles, et le cas « admin d’une autre agencia ». Source : `apply_incident_visibility`, `user_can_access_incident`, `user_can_modify_incident`, `user_can_delete_incident`, `scoped_instalaciones_query`, `salidas_base_query`, `apply_apreciacion_visibility`.
4. Lister les fichiers uploadés (avatars, fotos catálogo, fotos sitio) et leurs dossiers. L’API nouvelle les sert aux mêmes chemins relatifs.
5. Geler les variables d’environnement utiles : `BITRIX24_*`, `RADIUS_ENABLED`, `GEMINI_API_KEY`, `ETATS_USE_AI`. Secrets uniquement dans `.env`, jamais dans le dépôt.
6. Ranger les 4 fichiers `tests/` comme oracle : tout scénario qu’ils couvrent (catálogo, salidas, instalaciones, sidebar) doit avoir un équivalent Jest avant la bascule du module.

Livrable : un document `docs/parite.md` dans le monorepo (matrice droits, littéraux, format de hash, arborescence fichiers). Critère : une personne qui n’a pas lu le Flask peut dire, pour une action, si elle est autorisée.

## Phase 1 — Socle technique

1. Créer le monorepo : `apps/api`, `apps/web`, `packages/domain` (littéraux et types partagés), `packages/ui` seulement si un composant est utilisé par deux écrans.
2. Docker Compose : MariaDB 10.11 inchangée, API Node, web Vite. Le Flask reste sur 5001 / 8089 ; l’API prend un autre port (par exemple 4000) et le web 5173, pour comparer les deux sur la même base.
3. Prisma : `db pull` vers le schéma existant, mapping explicite des noms de colonnes françaises. Les migrations Prisma remplacent Alembic et les `ensure_*`. Aucune migration au premier tirage : la base actuelle doit démarrer sans `ALTER`.
4. NestJS : un module par domaine (`auth`, `clientes`, `incidencias`, `materiales`, `instalaciones`, `informes`, `usuarios`, `auditoria`, `apreciaciones`, `dashboard`). Garde globale d’authentification. Exceptions : login et changement de langue.
5. Session : store serveur (table `session` ou Redis), cookie `Secure` seulement hors local, idle 30 min, absolu 12 h, `POST /api/session/ping`.
6. CSRF : jeton en cookie non `HttpOnly` + en-tête `X-CSRFToken` sur toute mutation.
7. Mots de passe : vérificateur Werkzeug, puis réécriture Argon2id. Refus si `actif` est faux.
8. Login : email insensible à la casse, ou téléphone, ou nom unique. Redirection `next` limitée au même hôte.
9. Audit : `writeAudit()` best-effort, une erreur d’audit n’échoue jamais la requête métier.
10. En-têtes : CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS si HTTPS. Chaque CDN ajouté met à jour la CSP.
11. Journal : pas de mot de passe, pas d’URI complète.
12. CI : `tsc`, tests unitaires du package domaine, lint. `compileall` du Flask n’entre pas dans cette CI.

Critère : un utilisateur existant se connecte avec son mot de passe actuel, reçoit le cookie, est rejeté après 30 min d’inactivité, et un compte `actif=false` ne passe pas.

## Phase 2 — Coquille React

1. Routes miroir des menus, garde par rôle. Un `usuario` ne voit pas Materiales, Instalaciones, ni Administración. Un `admin` ne voit pas Usuarios, Trazabilidad, Base de datos.
2. Layout : sidebar, en-tête, pied, pages 403 / 404 / 500, bannière de session (alerte 2 min, ping).
3. i18next chargé depuis les catalogues Babel existants. La langue suit `es` par défaut, avec le sélecteur déjà présent.
4. Client HTTP unique : cookie inclus, CSRF, 401 vers login, messages d’erreur déjà en espagnol affichés tels quels.
5. Listes : composant commun de pagination 50 / 100 / 200 / 500, tri, filtres dans l’URL, cartes mobiles. Les listes du Flask ont déjà ce comportement ; le composant le reprend une fois.
6. Centro de Ayuda : une page, deux sommaires (sidebar et accordéon mobile), sections par `id`. Toute évolution d’écran met à jour cette page dans le même changement. Materiales et Instalaciones visibles pour admin ; Usuarios, Trazabilidad et Base de datos pour superadmin.

Critère : navigation complète avec données fictives de session, sans appel métier, sur desktop et sur une largeur mobile.

## Phase 3 — Référentiels partagés

Ordre : ciudades et agencias, puis clients. Les mouvements en dépendent.

1. `GET /api/ciudades` et `GET /api/ciudades/:id/agencias`. Un non-superadmin ne reçoit que son agencia lorsque la ciudad correspond.
2. Clients : liste partagée (aucun filtre agencia), recherche, CRUD. Catégorie `particular` par défaut.
3. Création et modification d’adresse passent par le sitio actif : `Client.adresse`, `ville`, `latitud`, `longitud` sont un miroir, écrits seulement par le service instalaciones. La correction d’adresse met à jour le sitio actif. Le déménagement est le Traslado (phase 6), pas ce formulaire.
4. Fiche client : identité, incidencias liées, RADIUS en lecture (cache ~300 s, message espagnol clair si `RADIUS_ENABLED` est faux), impression navigateur, vérification.
5. Export Excel : page courante seulement.
6. Un seul sitio actif par client. Photos : maximum 10, liées au sitio.

Critère : deux utilisateurs d’agencias différentes voient le même client. Modifier l’adresse ne crée pas de second sitio actif.

## Phase 4 — Incidencias

Cœur du produit. À fermer avant Materiales.

1. Liste, KPI et export passent par la même fonction de visibilité : créateur dans la même agencia et client dans la ciudad de l’utilisateur. Superadmin : pas de filtre.
2. Consulter et commenter : même règle. Modifier : quiconque peut consulter. Supprimer : créateur ou admin.
3. `id_operateur` est le créateur, immuable. L’édition remplit `id_operateur_modificacion` et `modifie_le`.
4. Tout changement de `status` écrit une ligne d’historique. Passage vers `Bitrix` : `ref_bitrix` sur 10 chiffres maximum, sinon `null`, et invalidation du cache Bitrix si le statut ou la référence change.
5. Commentaire : 1000 caractères, notification au créateur et aux commentateurs précédents. Marquer lu à l’ouverture de la fiche.
6. Fiche : historique d’états, cache Bitrix (TTL ~600 s, statut `'5'` verrouille le fetch). Aucune écriture vers l’API Bitrix.
7. Export Excel de la page courante.
8. Création : le client doit être dans la ciudad de l’utilisateur, sauf superadmin.

Critère : un admin de l’agencia A ne voit pas une incidencia créée dans l’agencia B, même sur le même client si la ciudad diffère. Un jeu de tests reprend la règle 10.4 avant d’ouvrir l’écran.

## Phase 5 — Materiales

Admin et superadmin. Le `usuario` reçoit 403.

1. Catálogo partagé, sans scope. Unicité `(nombre, tipo)`. Photo servie par l’API.
2. Salidas scopées agencia du técnico et ciudad. Liste paginée 50 / 100 / 200 / 500. Colonne Estado absente de la table, comme aujourd’hui.
3. Modale « Nueva salida » : seulement `uso_interno` et `incidencia`. `uso_interno` : client null. `incidencia` : client obligatoire. `tipo_salida` figé à l’édition.
4. Une salida `instalacion` exige `id_instalacion`. Sans lui, refus et renvoi vers la création d’installation. Cette création est la phase 6 ; en phase 5 l’API refuse déjà le cas.
5. Édition : lignes et observations. L’état passe à `modificada`.
6. Export Excel des salidas : page courante. Informe de materiales : Excel de toutes les lignes filtrées, HTML paginé à 50.
7. Fiche técnico scopée.

Critère : la modale ne propose pas `instalacion`. Un admin ne voit pas les salidas d’une autre ville.

## Phase 6 — Instalaciones

1. Hub : liste des `Instalacion`, filtres `search`, `tecnico`, `estado`, `tipo`, `date_from`, `date_to`, pagination 50 / 100 / 200 / 500. Colonnes : ID, Fecha, Tipo, Técnico, Cliente, Materiales, Estado, Acciones (Ver, Modificar, Copiar, Eliminar).
2. `Nueva instalación` : données plus lignes de matériel facultatives, et création de la première salida dans le même enregistrement.
3. Édition : client, sitio et tipo non modifiables.
4. Terminer sans condition préalable. Reabrir réservé à l’admin. Eliminar : `tipo=nueva` seulement, et suppression des salidas liées. Un `traslado` ne se supprime pas.
5. Traslado depuis la fiche client : ferme le sitio (`activo=false`, `hasta`), en crée un nouveau, crée une `Instalacion` `tipo=traslado`, lignes `reutilizado` | `retirado`.
6. GPS et fotos sur la fiche client, réservés à l’admin. Le fichier photo reste lisible par tout utilisateur connecté.
7. Dashboard « Instalaciones del día » : installations du jour, pas des salidas. Branché dès que ce module existe, y compris si le dashboard enrichi est encore en phase 8.

Critère : créer une installation avec deux lignes produit une installation et une salida `instalacion` liées. Supprimer un traslado est refusé.

## Phase 7 — Informes

1. Visibilité : superadmin voit tous les informes ; les autres voient ceux dont `parametres` contient leur `agence_id`.
2. Génération : types existants `summary`, `analysis`, `performance`, `custom`. Le non-superadmin est forcé sur son agencia, avec `ciudad_id` figé dans les paramètres.
3. Création en statut `generating`, puis rédaction. Gemini si `ETATS_USE_AI` et clé présente ; sinon le texte local déterministe déjà dans `etats_routes.py`. Prompts en espagnol.
4. Détail, régénération, suppression, export JSON, export Excel d’un informe `generated`.
5. Le hub affiche 20 informes récents.

Critère : avec la clé absente, un informe se génère quand même, en espagnol, sans exception brute.

## Phase 8 — Compte, administration, tableau de bord

1. Perfil : nom, téléphone, avatar, mot de passe (6 caractères minimum, confirmation). Un admin ne peut pas se désactiver lui-même.
2. Usuarios (superadmin) : CRUD, rôle, catégorie, ciudad, agencia, désactivation.
3. Trazabilidad : liste et export texte.
4. Base de datos : vérification et export, superadmin.
5. Dashboard : KPI et listes du jour sur la même visibilité que les incidencias. Filtres ciudad/agencia seulement pour le superadmin. Apreciación du jour branchée ici.
6. Apreciaciones : une note par jour, par ciudad et par agencia, 120 caractères. Lecture pour tout connecté dans le périmètre. Écriture et suppression : admin sur sa paire ; superadmin sur la paire filtrée si les deux sont choisies, sinon sur sa paire. La paire ne change pas à l’édition. Une note sans créateur : superadmin seul.
7. Notifications de commentaires et recherche globale.
8. Ficha atención al cliente (admin) : retards de changement d’état, pagination 50 (maximum 200), Excel de toutes les lignes filtrées.

Critère : la sidebar des trois rôles correspond à `presentation/templates/partials/_sidebar.html`. Le menu Operadores est absent.

## Phase 9 — Parité et bascule

1. Jeu de données de référence sur une copie MariaDB : un superadmin, un admin, un usuario, deux ciudades, deux agencias, clients des deux catégories, incidencias des trois statuts, salidas des trois types, une installation `nueva`, un traslado, une apreciación, un informe.
2. Pour chaque écran, script de comparaison : mêmes lignes, même ordre, mêmes totaux que le Flask sur cette copie. Écart = bug de la réécriture.
3. Reprise des tests Python existants en tests d’API.
4. Parcours navigateur des flux complets : login, incidencia de la création au commentaire, client puis traslado, installation avec matériel, informe sans Gemini, export Excel de page, session expirée.
5. Bascule : DNS ou reverse proxy vers `apps/web` + `apps/api`, Flask arrêté en écriture. Les fichiers uploadés sont le même volume disque.
6. Fenêtre de retour arrière : le conteneur Flask reste démarrable 48 h, base inchangée, donc rallumable sans migration inverse.
7. Ensuite seulement : retirer le code Flask du déploiement. Le dépôt historique reste en archive.

Critère de fin : un opérateur fait sa journée sur React sans ouvrir le Flask, et un superadmin retrouve audit, utilisateurs et base.

## Ordre de construction des modules API

Chaque module suit le même pas : schéma Prisma déjà en place, service de scope, DTO Zod, contrôleur, tests de droits, écran, entrée d’aide.

| Pas | Module | Dépend de |
|---|---|---|
| 1 | Auth, session, audit, domaine | Phase 1 |
| 2 | Ciudades, agencias, clientes, sitios | Auth |
| 3 | Incidencias, commentaires, historique, notifications, Bitrix lecture | Clientes |
| 4 | Materiales catálogo et salidas | Clientes, utilisateurs |
| 5 | Instalaciones, traslado, GPS, fotos | Clientes, materiales |
| 6 | Informes, Gemini | Incidencias, apreciaciones |
| 7 | Usuarios, ficha AC, ficha técnico | Incidencias, materiales |
| 8 | Dashboard, recherche, aide, exports | Tous les scopes |

Les exports Excel (OpenPyXL aujourd’hui) deviennent un service Node unique, avec deux modes explicites : page courante (clients, incidencias, salidas) et jeu filtré complet (informe materiales, ficha AC, un informe généré).

## Risques à traiter dans la phase indiquée

- Hash Werkzeug illisible côté Node : bloquant en phase 1, pas à la bascule.
- `ensure_*` qui masque un écart de schéma : le `db pull` de la phase 1 doit partir d’une base migrée, pas d’un schéma théorique.
- Admin traité comme superadmin dans un repository : un test d’isolation par agencia est obligatoire dans chaque module scopé.
- Double écriture Flask + Node pendant la transition : interdite. Un seul processus écrit.
- Colonnes renommées « pour faire propre » : interdit pendant cette réécriture. Un renommage serait un projet séparé, après la bascule.

Ordre de grandeur pour deux développeurs à plein temps : phases 0 à 2 en trois semaines, incidencias en trois, materiales et instalaciones en quatre, informes et administration en trois, parité et bascule en deux. Environ quatre mois jusqu’à un remplacement utilisable en production, si le métier reste gelé.

La première action concrète est la phase 0 sur une copie de la base : schéma, format de hash, matrice de droits. Dès que ce relevé est fait, la phase 1 peut démarrer sans rouvrir le choix d’architecture.
