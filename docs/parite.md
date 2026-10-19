# Parité FCC_001 — gel du comportement Flask

Référence pour la réécriture React / Node. Le comportement décrit ici est celui du code Flask et de la base MariaDB locale au 19 octobre 2026. Une personne qui n’a pas lu `core/app.py` doit pouvoir dire, pour une action, si elle est autorisée.

Les fonctions pures correspondantes vivent dans `packages/domain` et sont couvertes par `packages/domain/test/domain.test.ts`.

## Schéma MariaDB

Source vivante : conteneur `fcc_001_mariadb` (image `mariadb:10.11`), relevé `information_schema.COLUMNS`. Dix-huit tables, les mêmes que les modèles SQLAlchemy de `core/app.py`.

`agencia`, `apreciacion_dia`, `audit_log`, `ciudad`, `client`, `client_sitio`, `etat`, `incident`, `incident_comentario`, `incident_estado_historial`, `incident_notification`, `instalacion`, `instalacion_foto`, `instalacion_traslado_linea`, `material`, `material_salida`, `material_salida_linea`, `operateur`.

Les noms de colonnes coïncident avec les modèles, y compris les colonnes françaises `nom`, `intitule`, `ville`, `date_heure`, `mot_de_passe_hash`. Prisma doit les mapper telles quelles.

Écarts à respecter (le schéma vivant gagne) :

| Élément | Modèle SQLAlchemy | MariaDB |
|---|---|---|
| `etat.graphiques_data` | `Text` | `longtext` |
| `etat.parametres` | `Text` | `longtext` |
| Défauts `datetime.now` / `default=True` | côté Python | souvent `NULL` en base ; l’application doit écrire la valeur |
| `client_sitio.activo` | `default=True` Python | `tinyint(1) NOT NULL` sans défaut SQL |
| `operateur.mot_de_passe_hash` | `default=''` | `varchar(255) NOT NULL` défaut `''` |

Aucun `ALTER` au premier branchement Prisma : `db pull` sur une base déjà migrée.

## Mots de passe

`config/requirements.txt` fixe `werkzeug==3.0.1`. La méthode par défaut de `generate_password_hash` est `scrypt`.

Relevé agrégé sur `operateur.mot_de_passe_hash` (préfixe avant `:`, aucun hash affiché) :

| Méthode | Comptes |
|---|---|
| `scrypt` | 33 |
| chaîne vide | 1 |

L’API Node vérifie le format Werkzeug `scrypt:` tel quel. Un compte à hash vide est refusé (message admin, comme le Flask). Au premier login réussi, réécriture Argon2id. Le vérificateur accepte aussi `pbkdf2:sha256:` pour d’anciennes lignes, même si la base actuelle n’en a pas.

`actif` faux : login refusé.

## Session

| Règle | Valeur |
|---|---|
| Durée absolue | 12 h |
| Inactivité | 30 min |
| Alerte UI | 2 min avant l’expiration idle |
| Ping | `POST /api/session/ping` |
| Cookie | `HttpOnly`, `SameSite=Lax`, `Secure` seulement si `SESSION_COOKIE_SECURE=true` |

Identifiants de login, dans cet ordre : email insensible à la casse, téléphone exact, nom unique insensible à la casse, puis téléphone compacté (sans espaces ni tirets).

## Matrice des droits

`is_admin()` est vrai pour `admin` et `superadmin`. `is_superadmin()` est vrai pour `superadmin` seul. L’admin a le même filtre agencia + ciudad que le `usuario` sur les mouvements.

| Action | usuario | admin | superadmin | Autre agencia / ciudad |
|---|---|---|---|---|
| Voir un client | oui, tous les clients | oui | oui | oui : le référentiel client est partagé |
| Créer un mouvement sur un client | si `client.id_ciudad` = la sienne | idem | oui | non pour admin et usuario |
| Voir / commenter / modifier une incidencia | créateur dans son agencia et client dans sa ciudad | idem | oui | non |
| Supprimer une incidencia | seulement s’il en est le créateur | oui, y compris une incidencia d’une autre agencia s’il connaît l’id | oui | le Flask ne refiltre pas la suppression (`user_can_delete_incident`) |
| Catálogo de material | 403 (pas le menu) | oui, partagé | oui | pas de scope |
| Salidas, informe materiales, instalaciones | 403 | son agencia (técnico) et sa ciudad | tout | non |
| Apreciación lecture | sa paire ciudad + agencia | idem | tout, ou la paire filtrée | une note sans ciudad ou sans agencia : superadmin seul |
| Apreciación écriture | non (`@admin_required`) | sa paire, non modifiable | paire filtrée si l’agencia appartient à la ciudad, sinon la sienne | l’admin ne peut pas écrire sur une autre paire |
| Informes | ceux dont `parametres` contient `"agence_id": <son id>` avec un espace après `:` | idem | tous | non. Le filtre est une sous-chaîne : l’agencia `10` voit aussi un informe dont l’id est `100` |
| Usuarios, Trazabilidad, Base de datos | 403 | 403 | oui | — |
| GPS, fotos, Traslado | 403 | fiche client | fiche client | le hub Instalaciones ne les liste pas |
| Avatar | le sien | le sien | n’importe quel utilisateur | un non-superadmin ne change pas l’avatar d’un autre |

`id_operateur` d’une incidencia est le créateur et ne change pas. L’édition remplit `id_operateur_modificacion` et `modifie_le`. Tout changement de `status` écrit `incident_estado_historial`. Passage à `Bitrix` : `ref_bitrix` de 1 à 10 chiffres, sinon `null`.

Commentaire : 1 000 caractères maximum. Apreciación : 120 caractères, une par jour et par paire ciudad + agencia.

## Menus

Libellés de `presentation/templates/partials/_sidebar.html`.

| Rôle | Entrées |
|---|---|
| usuario | Dashboard, Incidencias, Clientes, Informes, Perfil, Ayuda, Salir |
| admin | les précédentes, plus Materiales et Instalaciones |
| superadmin | les précédentes, plus Usuarios, Trazabilidad, Base de datos |

`Operadores` n’est pas une entrée. Les routes legacy `/operateurs` ne sont pas portées.

## Fichiers uploadés

L’API nouvelle sert les mêmes chemins relatifs. Écriture dans le premier dossier, lecture dans l’ordre indiqué.

| Usage | URL | Dossiers (écriture = premier) | Contraintes |
|---|---|---|---|
| Avatar | `/static/avatars/avatar_<id>.<ext>` | `presentation/static/avatars` | jpg, jpeg, png, webp, 2 Mo |
| Photo catálogo | `/uploads/materiales/<fichier>` | `presentation/uploads/materiales`, `instance/uploads/materiales`, `presentation/static/materiales` | jpg, jpeg, png, webp, 2 Mo |
| Photo sitio | `/uploads/instalaciones/<fichier>` | `presentation/uploads/instalaciones`, `instance/uploads/instalaciones` | jpg, jpeg, png, webp, 5 Mo, 10 photos par sitio |

`presentation/uploads/**` est gitignoré. Le volume disque reste partagé à la bascule.

## Variables d’environnement

Noms seulement. Les valeurs restent dans `.env`, jamais dans le dépôt. Inventaire aligné sur `.env.example` et les lectures du code.

| Nom | Rôle |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MariaDB |
| `SECRET_KEY` | session Flask actuelle |
| `SESSION_COOKIE_SECURE` | `Secure` du cookie, faux en local |
| `BITRIX24_ENABLED`, `BITRIX24_API` | lecture Bitrix, cache ~600 s ; si off, message espagnol, pas d’exception |
| `RADIUS_ENABLED`, `RADIUS_BASE_URL`, `RADIUS_API_USER`, `RADIUS_API_PASS`, `RADIUS_CACHE_TTL_SECONDS` | lecture RADIUS, cache ~300 s |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `ETATS_USE_AI` | informes seulement ; sans clé, texte local déterministe |
| `BABEL_DEFAULT_LOCALE` | `es` |

Odoo (`ODOO_*`) n’est pas repris.

## Oracle de tests Flask

Chaque scénario ci-dessous doit avoir un équivalent dans la suite Node avant la bascule du module. Fichiers : `tests/test_materiales_catalogo.py`, `tests/test_materiales_salidas.py`, `tests/test_instalaciones.py`, `tests/test_sidebar.py`.

| Fichier | À reproduire |
|---|---|
| `test_sidebar.py` | Endpoints du menu existants ; Materiales et Instalaciones sont deux hubs ; usuario sans ces menus ; admin sans Administración ; superadmin avec Usuarios ; un usuario voit un client d’une autre ciudad ; un admin ne voit pas une incidencia d’une autre agencia ; hub instalaciones en 403 pour le usuario |
| `test_materiales_catalogo.py` | Tri par défaut tipo puis nombre ; tri nombre asc/desc ; vides de `modelo` en tête ; tri invalide ignoré ; le filtre `tipo` survit au tri |
| `test_materiales_salidas.py` | `per_page` invalide → 50 ; export Excel de la page courante ; pagination conserve les filtres ; admin peut supprimer une salida ; usuario ne peut pas |
| `test_instalaciones.py` | Filtres search, técnico, estado, tipo, dates ; dashboard du jour ignore la période et, pour le superadmin, filtre ciudad + agencia ; cycle créer / terminar / reabrir (reabrir admin) ; création avec matériel crée une salida ; eliminar `nueva` supprime les salidas ; `traslado` ne se supprime pas ; salida `instalacion` sans `id_instalacion` refusée ; client de la salida doit être celui de l’installation |

La pagination des listes métier est 50, 100, 200 ou 500, défaut 50 (`clamp_list_per_page`).
