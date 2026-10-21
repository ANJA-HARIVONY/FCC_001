# Liste de vérification — Flask vers React

Date : 21 octobre 2026. Référence visuelle et métier : Flask (`python start_app.py`, http://localhost:5001). Réécriture : http://localhost:5173 (API sur le port 4000, même MariaDB).

Les écrans existent. Aucune ligne n’est plus « Absent ». La comparaison visuelle et les totaux face à Flask restent la phase 9.

Comparer chaque écran avec le même compte, sur les trois rôles quand le menu change : `usuario`, `admin`, `superadmin`. Libellés en espagnol, tels qu’à l’écran. Le menu `Operadores` n’est pas à recréer.

Légende :

- **À comparer** : la page React existe. Le visuel, les filtres, l’ordre et les droits restent à valider face au Flask.
- **Écart connu** : la page existe, un morceau du Flask manque encore dans le code.
- **Absent** : pas de route React.
- **Hors périmètre** : décision déjà prise, ne pas le remettre.

## Coquille

| Écran | Flask | React | Rôle | État | Mise à niveau |
|---|---|---|---|---|---|
| Login | `/login` | `/login` | public | À comparer | Email, téléphone ou nom ; compte `actif=false` refusé ; `next` même hôte |
| Session | alerte 2 min, ping | en-tête | connecté | À comparer | 12 h, inactivité 30 min |
| Langue | `/set_language/<langue>` | en-tête, `fcc_lang` | connecté | À comparer | Sélecteur es / fr / en. La coquille passe par `t()`. Les pages métier restent en espagnol en dur |
| Recherche | `/recherche` | `/buscar` | connecté | À comparer | Résultats clients et incidencias |
| Cloche commentaires | en-tête | en-tête | connecté | À comparer | Liste, lien vers la fiche, marquer lu |
| Toast Pendiente > 30 min | `/api/incidents-pendientes` | en-tête | connecté | À comparer | Toast et son, visibilité 10.4, une Pendiente de 10 min exclue |
| Ayuda | `/aide` | `/ayuda` | connecté | À comparer | Deux sommaires ; Materiales et Instalaciones pour admin ; Usuarios, Trazabilidad, Base de datos pour superadmin |
| 403 / 404 | templates | pages | — | À comparer | Un `usuario` sur `/materiales` ou `/usuarios` doit voir 403 |

## Principal

| Écran | Flask | React | Rôle | État | Mise à niveau |
|---|---|---|---|---|---|
| Dashboard | `/` | `/` | tous | À comparer | Périodes, mémoriser / réinitialiser, KPI, graphiques, 5 clients, instalaciones del día, filtre superadmin, nota del día |
| Incidencias | `/incidents` | `/incidencias` | tous | À comparer | Liste, filtres, pagination, visibilité agencia + ciudad, Excel de la page, lecture Bitrix |
| Nouvelle incidencia | `/incidents/nouveau` | `/incidencias/nueva` | tous | À comparer | Client de la ciudad (sauf superadmin) ; statuts `Pendiente`, `Solucionadas`, `Bitrix` |
| Fiche incidencia | `/incidents/<id>/fiche_incident` | `/incidencias/:id` | tous | À comparer | Commentaire ≤ 1000 car., historique de statut, lecture Bitrix (cache, statut `5`) |
| Modifier incidencia | `/incidents/<id>/modifier` | `/incidencias/:id/editar` | qui peut voir | À comparer | Créateur immuable ; `ref_bitrix` max 10 chiffres |
| Clientes | `/clients` | `/clientes` | tous | À comparer | Liste partagée, recherche, copie, Excel de la page, impression, Verificar |
| Nouveau client | `/clients/nouveau` | `/clientes/nuevo` | tous | À comparer | `particular` par défaut ; l’adresse crée le sitio actif |
| Modifier client | `/clients/<id>/modifier` | `/clientes/:id/editar` | tous | À comparer | Corrige le sitio actif, ne crée pas un second sitio actif |
| Fiche client | `/clients/<id>/fiche` | `/clientes/:id` | tous | À comparer | GPS admin, incidencias liées, impression, Verificar, fotos (max 10), RADIUS en lecture |
| Traslado | `/clients/<id>/traslado` | `/clientes/:id/traslado` | admin | À comparer | Ferme le sitio, en crée un, instalación `tipo=traslado`, lignes `reutilizado` / `retirado` |
| Informes | `/etats` | `/informes` | tous | À comparer | 20 récents, visibilité `agence_id`, suppression |
| Générer un informe | `/etats/generer` | `/informes/nuevo` | tous | À comparer | Texte local en espagnol si la clé est absente. Branche Gemini présente ; les prompts restent à comparer au Flask |
| Détail informe | `/etats/<id>` | `/informes/:id` | tous | À comparer | Régénérer, supprimer, export JSON, Excel d’un informe `generated` |

## Materiales (admin et superadmin)

| Écran | Flask | React | État | Mise à niveau |
|---|---|---|---|---|
| Hub | `/materiales` | `/materiales` | À comparer | Catálogo, salidas et informe liés |
| Catálogo | `/materiales/catalogo` | `/materiales/catalogo` | À comparer | Référentiel partagé, photo, tri tipo / nombre / modelo (vides en tête) |
| Salidas | `/materiales/salidas` | `/materiales/salidas` | À comparer | Les 3 types, colonne Estado masquée, scope agencia + ciudad, Excel de la page |
| Nouvelle salida | `/materiales/salida/nueva` | `/materiales/salidas/nueva` | À comparer | Modale : seulement `uso_interno` et `incidencia`. `instalacion` passe par Nueva instalación |
| Fiche salida | `/materiales/salidas/<id>` | `/materiales/salidas/:id` | À comparer | Ver, et le lien vers l’édition |
| Modifier salida | `/materiales/salidas/<id>/modificar` | `/materiales/salidas/:id/editar` | À comparer | `tipo_salida` figé ; état `registrada` → `modificada` |
| Informe de materiales | `/materiales/informe` | `/materiales/informe` | À comparer | HTML filtré + Excel de toutes les lignes filtrées |
| Ficha técnico | `/tecnicos/<id>/ficha` | `/tecnicos/:id/ficha` | À comparer | Scope agencia + ciudad. Un compte `atencion_cliente` est refusé |

## Instalaciones (admin et superadmin)

| Écran | Flask | React | État | Mise à niveau |
|---|---|---|---|---|
| Hub | `/instalaciones` | `/instalaciones` | À comparer | Filtres, pagination, Ver, Modificar, Copiar, Eliminar |
| Nueva instalación | `/instalaciones/nueva` | `/instalaciones/nueva` | À comparer | Lignes facultatives, première salida `instalacion` dans le même enregistrement |
| Détail | `/instalaciones/<id>` | `/instalaciones/:id` | À comparer | Terminar, reabrir, lignes de matériel et de traslado |
| Modifier | `/instalaciones/<id>/modificar` | `/instalaciones/:id/editar` | À comparer | Client, sitio et tipo non modifiables. Un `traslado` ne se supprime pas |

GPS et fotos restent sur la fiche client, pas sur ce hub.

## Cuenta et administration

| Écran | Flask | React | Rôle | État | Mise à niveau |
|---|---|---|---|---|---|
| Perfil | `/perfil` | `/perfil` | tous | À comparer | Nom, téléphone, mot de passe, avatar |
| Usuarios | `/usuarios` | `/usuarios` | superadmin | À comparer | Liste, création, édition, désactivation, lien ficha, avatar |
| Nouveau / éditer usuario | `/usuarios/nuevo`, `/usuarios/<id>/editar` | `/usuarios/nuevo`, `/usuarios/:id/editar` | superadmin | À comparer | Rôle `usuario` / `admin` / `superadmin`, catégorie `atencion_cliente` / `tecnico` |
| Ficha atención al cliente | `/atencion-cliente/<id>/ficha` | `/atencion-cliente/:id/ficha` | admin | À comparer | Retard Flask (Bitrix → Solucionadas), pagination 50 (max 200), Excel de toutes les lignes filtrées |
| Trazabilidad | `/audit-log` | `/trazabilidad` | superadmin | À comparer | 30 jours, filtre utilisateur, export texte |
| Base de datos | `/base-de-datos` | `/base-de-datos` | superadmin | À comparer | Vérification et export SQL HeidiSQL |
| Operadores | `/operateurs` | — | — | Hors périmètre | Les comptes passent par Usuarios |

## Suite

La mise à niveau du code est faite. Il reste la comparaison de chaque ligne « À comparer » avec Flask, desktop et mobile, sur les trois rôles. C’est la phase 9.
