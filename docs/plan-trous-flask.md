# Plan — trous restants par rapport au Flask

Date : 20 octobre 2026. Mise à jour : 21 octobre 2026. Les huit trous ci-dessous sont fermés dans le code (Copiar, Excel d’informe, avatar, toasts Pendiente, retard de ficha, informe de materiales, ficha técnico, export SQL, sélecteur de langue sur la coquille). Les pages métier restent en espagnol en dur ; la coquille passe par `t()`. La phase 9 est ouverte : `docs/rapports/2026-10-21-phase-9.md`. Ce document reste la spécification de ce qui a été repris.

Règles communes à chaque trou :

- Étendre le module déjà en place (`apps/api/src/<domaine>`, `apps/web/src/pages/<domaine>`). Pas de second service « au cas où ».
- Libellés déjà utilisés dans l’UI Flask, en espagnol. Pas de statut, rôle ou menu nouveau.
- Même droit que Flask. Un admin a le même filtre d’`agencia` et de `ciudad` qu’un `usuario`. Seul le `superadmin` voit tout.
- Écran visible → `presentation/templates/aide.html` (sommaire desktop et accordéon mobile) et `apps/web/src/pages/AyudaPage.tsx`.
- Test du calcul ou du droit avant l’écran. Parcours navigateur ensuite.

## Ordre

| Pas | Trou | Taille | Dépend de |
|---|---|---|---|
| 1 | Copiar sur la liste Instalaciones | petit | rien |
| 2 | Excel d’un informe généré | petit | contenu déjà stocké |
| 3 | Avatar | petit | dossier `presentation/static/avatars` |
| 4 | Toast Pendiente > 30 min | moyen | visibilité 10.4 |
| 5 | Retard de la ficha atención al cliente | moyen | historique d’états |
| 6 | Informe de materiales et ficha técnico | grand | salidas scopées |
| 7 | Export SQL | moyen | superadmin, script Flask |
| 8 | Sélecteur de langue | grand | catalogues déjà chargés |

## 1 — Copiar sur le hub Instalaciones

Flask : `presentation/static/js/instalaciones-copy.js`, bouton de `instalaciones/hub.html` et de la carte mobile. Le texte copié est trois lignes, dans cet ordre : nom du client, matériaux (un par ligne), nom du técnico. Toast : « Información de la instalación copiada al portapapeles ».

React : le même geste existe déjà sur le dashboard (`copyInstalacion` dans `DashboardPage.tsx`). Il manque sur `InstalacionesListPage.tsx`, desktop et mobile, dans le groupe Ver / Modificar / Eliminar.

Critère : le presse-papiers a les trois lignes, y compris une installation sans matériau. Le bouton n’apparaît pas comme une nouvelle colonne.

## 2 — Excel d’un informe généré

Flask : `GET /api/etats/<id>/export.xlsx` (`core/routes/etats_routes.py`, `core/services/etats_export_service.py`). Refus si `statut` n’est pas `generated` ou si `contenu_ia` est vide. Le classeur reprend le contenu de l’informe, pas une page de liste. Nom de fichier via `build_export_filename`.

React : le détail (`InformeDetailPage.tsx`) a l’impression et le JSON. Il n’a pas l’Excel.

À faire : un endpoint dans `informes.controller.ts` qui réutilise la visibilité `agence_id` déjà appliquée à la lecture. Même message espagnol si l’informe n’est pas généré. Bouton sur le détail, à côté de l’export déjà présent.

Critère : un informe `generating` ou `error` ne se télécharge pas. Un `generated` visible par l’utilisateur se télécharge. Un informe d’une autre agencia reste invisible pour un admin.

## 3 — Avatar

Flask : `POST /usuarios/<id>/avatar` dans `core/app.py`. JPG, JPEG, PNG, WEBP, 2 Mo. Fichier `presentation/static/avatars/avatar_<id>.<ext>`. `avatar_url` = `/static/avatars/avatar_<id>.<ext>`. Le superadmin peut changer n’importe quel avatar. Un autre utilisateur ne change que le sien. Redirection : édition usuario pour le superadmin, dashboard pour soi-même.

React : l’image s’affiche (en-tête, listes) avec le secours `/static/img/default_avatar.png`. Il n’y a pas d’envoi.

À faire : le même dossier et le même nom de fichier, pour que Flask et React lisent la même photo. Contrôle sur Perfil et sur l’édition d’un usuario. Messages Flask repris tels quels : « Seleccione un archivo. », « Formato no válido (JPG, PNG, WEBP). », « Archivo demasiado grande (máx. 2 MB). », « Avatar actualizado. »

Critère : un `usuario` qui poste l’avatar d’un autre reçoit 403. Le fichier de plus de 2 Mo est refusé. L’en-tête montre la nouvelle image sans changer le nom du fichier de secours.

## 4 — Toast Pendiente de plus de 30 minutes

Flask : `GET /api/incidents-pendientes` (`core/app.py`) et `presentation/static/js/notifications.js`. Incidencias `Pendiente` dont `date_heure` a au moins 30 minutes, passées par `apply_incident_visibility`. Chaque toast n’est montré qu’une fois par session, puis peut revenir au bout d’une heure. Un seul son ding-dong par lot, et seulement après un geste de l’utilisateur. Le premier chargement des commentaires ne sonne pas.

React : la cloche des commentaires existe. Ce toast-là n’existe pas.

À faire : le même JSON (`id`, `intitule`, `client_nom`, `client_ville`, `operateur_nom`, `tiempo_transcurrido` en `Hh Mm`, `fecha_creacion` en `jj/mm/aaaa HH:MM`). Poll depuis l’en-tête, même cadence que le script Flask. Lien vers `/incidencias/:id`.

Critère : un admin ne voit pas une incidencia d’une autre agencia ou d’une autre ciudad. Une Pendiente de 10 minutes ne sort pas. Le son ne part pas au chargement de la page.

## 5 — Retard de la ficha atención al cliente

Flask : `core/services/incident_status_delay_service.py` et l’Excel `core/services/atencion_cliente_export_service.py`.

Le calcul actuel de `apps/api/src/cuenta/admin-ops.service.ts` mesure les minutes depuis la création de l’incidencia. Ce n’est pas la règle Flask.

Règle à reprendre telle quelle :

- Seuils : défaut 30 minutes, borné de 1 à 1440. Période par défaut : le mois en cours. Destination vide, ou `Bitrix`, ou `Solucionadas`.
- Lignes : `incident_estado_historial` dont l’auteur est l’utilisateur de la ficha, destination `Bitrix` ou `Solucionadas`, dans la période.
- Transitions comptées : `(vide, Bitrix)`, `(vide, Solucionadas)`, `(Pendiente, Bitrix)`, `(Pendiente, Solucionadas)`, `(Bitrix, Solucionadas)`.
- Départ du chrono : la création de l’incidencia, sauf `Bitrix` → `Solucionadas`, qui part de l’entrée en `Bitrix` (ligne d’historique précédente).
- On ne garde que les retards strictement supérieurs au seuil.
- KPI Flask : total, retard moyen, retard max, part Bitrix. Excel de toutes les lignes filtrées, pas de la page.

L’écran `FichaPage.tsx` garde la pagination 50, maximum 200. L’Excel est un second bouton, comme Flask.

Critère : un passage `Bitrix` → `Solucionadas` en 10 minutes après l’entrée en Bitrix ne compte pas, même si l’incidencia a été créée la veille. Une transition hors liste est ignorée. Un utilisateur qui n’est pas `atencion_cliente` est refusé.

## 6 — Informe de materiales et ficha técnico

Les deux sont `@admin_required`. Le bouton Informe du hub React est encore `Próximamente` (`MaterialesHubPage.tsx`). Il n’y a pas de route ficha técnico.

### Informe

Flask : `GET /materiales/informe` et `GET /materiales/informe/export.xlsx`. Période par défaut : 30 derniers jours. Filtres : técnico, material, `tipo_salida` parmi `uso_interno` | `incidencia` | `instalacion`. Pagination d’affichage 50. L’Excel contient toutes les lignes filtrées, pas la page. Scope : agencia et ciudad de l’utilisateur ; le superadmin voit tout, ou le filtre qu’il a choisi s’il existe déjà côté Flask.

Source : `parse_informe_filters`, `build_informe_page_data`, `build_informe_workbook` dans `core/services/materiales_service.py`.

À faire : `/materiales/informe` à la place du bouton désactivé. Pas de nouvelle entrée de menu.

### Ficha técnico

Flask : `GET /tecnicos/<id>/ficha`. L’utilisateur doit avoir `categoria = tecnico`. Un admin dont l’agencia ou la ciudad diffère reçoit 404. Les lignes viennent de `get_tecnico_material_rows` : salidas dont il est le técnico, même scope, tri date puis id décroissants.

Lien depuis la liste Usuarios, comme Flask. Pas d’entrée de menu.

Critère : un `usuario` reçoit 403 sur les deux. Un admin ne voit pas les salidas d’une autre agencia. L’Excel de l’informe refuse une période vide avec « Indique el período del informe antes de exportar. » Un compte `atencion_cliente` ouvert comme ficha técnico reçoit « Este usuario no es un técnico. »

## 7 — Export SQL

Flask : `GET /base-de-datos/exportar`, superadmin, fichier `backup_<YYYYmmdd_HHMMSS>.sql` produit par `tools/export_database_sql.py` (dump compatible HeidiSQL, `INSERT` échappés, pas un `mysqldump` du système).

React : la page Base de datos vérifie les tables. Elle ne télécharge pas le SQL.

À faire : porter la fonction d’export dans l’API, superadmin seulement, même nom de fichier, même en-tête de téléchargement. Ne pas journaliser l’URI ni le mot de passe. En cas d’échec, message « Error al exportar la base de datos: … » sans stack.

Critère : un admin reçoit 403. Le fichier commence par le même en-tête que le script Flask et contient les tables présentes, pas un sous-ensemble inventé.

## 8 — Sélecteur de langue

Flask : `GET /set_language/<langue>` enregistre la langue en session si elle est dans `LANGUAGES` (`es`, `fr`, `en`). L’UI passe par gettext. Le sélecteur est dans l’en-tête.

React : `apps/web/src/i18n.ts` charge déjà les catalogues et lit `localStorage` `fcc_lang`, défaut `es`. Aucun écran n’appelle la traduction : les chaînes sont écrites en dur.

À faire en deux temps, sinon le sélecteur ne change rien :

1. Le contrôle d’en-tête, trois langues, persistance `fcc_lang`, rechargement de la langue i18next. Défaut `es`.
2. Passer les libellés d’écran par `t()`, en commençant par la coquille (en-tête, sidebar, login, aide), puis les pages dans l’ordre du menu. Les mots métier restent des clés dont la valeur espagnole est le littéral déjà à l’écran : `Incidencias`, `Pendiente`, `Solucionadas`, `Bitrix`, `Usuarios`. On ne traduit pas ces littéraux en français dans l’interface espagnole.

Critère : au premier affichage, l’espagnol. Après choix `fr`, la coquille est en français et un rafraîchissement conserve le choix. `Pendiente` et `Solucionadas` ne deviennent pas « En attente » / « Résolues » sur l’écran espagnol.

## Après ces huit trous

Les huit trous sont dans le code depuis le 21 octobre 2026. La phase 9 est ouverte : copie MariaDB, comparaison écran par écran avec Flask, puis bascule. La bascule n’est pas faite.
