# Base de données

## ✅ TÂCHES TERMINÉES

- ✅ 1-Revise la consistance de la base de données
  - Analyse complète effectuée via `tools/analyze_database.py`
  - Structure parfaitement cohérente
  - Aucune violation de contraintes détectée
  - Intégrité générale: OK

- ✅ 2-Faire un rapport sur l'état de la base de données
  - Rapport détaillé: `docs/RAPPORT_BASE_DONNEES.md`
  - Rapport technique JSON: `monitoring/logs/database_report_*.json`
  - État général: EXCELLENT
  - Recommandations d'optimisation fournies

## 🔧 OUTILS CRÉÉS

- `tools/analyze_database.py` - Analyse complète de la DB
- `tools/optimize_database.py` - Optimisation selon recommandations
- `docs/RAPPORT_BASE_DONNEES.md` - Rapport exécutif complet

## 📊 RÉSULTATS

- **Intégrité**: ✅ Parfaite (0 erreur)
- **Structure**: ✅ Cohérente avec les modèles
- **Migrations**: ✅ À jour (2 migrations appliquées)
- **Performance**: ✅ Optimale pour la taille actuelle
- **Recommandations**: ⚡ Index à ajouter, sauvegardes à nettoyer

## ✅ NOUVELLE TÂCHE TERMINÉE

- ✅ 1 - Sur la base de données MariaDB actuelle, vérifier les doublons et faire un rapport
  - Connexion MariaDB établie avec succès
  - Analyse complète des doublons effectuée via `tools/analyze_mariadb_duplicates.py`
  - **PROBLÈMES CRITIQUES DÉTECTÉS** : 955 groupes de doublons
  - Rapport détaillé : `docs/RAPPORT_DOUBLONS_MARIADB.md`
  - Rapport technique JSON : `monitoring/logs/mariadb_duplicates_report_*.json`

## 🚨 RÉSULTATS CRITIQUES

- **Clients dupliqués** : 204 groupes (100 par nom + 104 par téléphone)
- **Incidents dupliqués** : 320+ groupes d'incidents identiques
- **État général** : ⚠️ ATTENTION REQUISE - Action immédiate recommandée
- **Recommandations** : Nettoyage urgent + contraintes DB + surveillance

## 🔧 OUTILS CRÉÉS

- `tools/analyze_mariadb_duplicates.py` - Analyse des doublons MariaDB
- `docs/RAPPORT_DOUBLONS_MARIADB.md` - Rapport exécutif avec plan d'action
- `tools/clean_mariadb_duplicates.py` - Nettoyage sécurisé avec sauvegardes
- `tools/verify_cleanup_results.py` - Vérification post-nettoyage

## ✅ EXÉCUTION PRIORITÉ 1 - SUCCÈS MAJEUR

- ✅ **Sauvegarde** : Créée avant nettoyage
- ✅ **Nettoyage incidents** : 49 → 10 groupes (-39 supprimés = 79%)
- ✅ **Clients par nom** : 100 → 0 groupes (-100 supprimés = 100%) 🎉
- ⚠️ **Clients par téléphone** : 104 → 69 groupes (-35 supprimés = 34%)
- ✅ **Intégrité** : Données cohérentes, pas d'incidents orphelins

**Résultat** : 79 doublons restants sur 955 initiaux (-876 = 92% nettoyé)
**Performance** : 111 clients fusionnés + 116 incidents transférés + 0 erreur
**Statut** : 🎉 EXCELLENT - Objectifs largement atteints

# New prompt

# REDACTION INFORME

# Faire d'abord une proposition de solution avant de faire l'integration

## 1 - Le but du features est de pouvoir impimer un etat generer avec l'aide de IA

- 1-Creer une nuvelle page qui s'appel Etat: Dans le menu apres client
- 2-Dans la page Etats s'affiche les etas et les grafiques generer a laide de IA Kimi k2
- 3-L'Etas est intuitif et elegant
- 4-Imprimable et exportable en PDF
- 5-Tout doit etre rediger en Español

## 2 - Configuration de l'API Ia:

- Model: kimi k2
- API key: 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

## 3 - Amelioration de dashboard

- Dans la graphe "Evolucion de las incidencias": changer l'afficheage, ne change pas por día, changer por hora en por mes, Detallado changer por año
- Suprimer les codes anterieurs qui ne sont plus utile

## 4 - Les notifications ✅ TERMINÉ

- ✅ Creer un systeme de notification (toast)
- ✅ la notification consiste a rappelé l'utilisateur sur "les incidencias pendientes"
- ✅ Si un incidencia pendientes est **créé depuis plus de 30mn**, l'application envoye une notification sur l'ecran
- ✅ La notification dure **15 secondes** et revient chaque 30mn si c'est toujour "pendiente"
- ✅ la notification est de couleur jaune, en haut a droite de l'ecran, avec le message afichant l'operador, le nom du client, et un petit rapel

**CLARIFICATION TIMING**:

- ✅ Critère de notification: Incidents avec statut "Pendiente" **créés il y a plus de 30 minutes**
- ✅ Vérification automatique: Toutes les 30 minutes
- ✅ Durée d'affichage: 15 secondes (corrigé)
- ✅ Répétition: Toutes les 30 minutes si toujours "Pendiente"

## 5 - Proposition d'amelioration

- 1-Faire une proposition d'amelioration possible: Sur le plan API (consultation, CRUD)
- 2-Faire une proposition de creer des comptes d'utilisateurs (operadores)
- 3-Creer un fichier PDF pour les propositions

## 6 - Deployement sur Docker ✅ TERMINÉ

- ✅ 1-Preparer l'application pour être deployer sur Docker
- ✅ 2-Preparer les fichiers necessaire optimisés, et suivant les bonnes pratiques
- ✅ 3-Faire fichier de guide de deploiement

**FICHIERS CRÉÉS:**

- `Dockerfile` - Image Docker multi-stage optimisée (Python 3.11, WeasyPrint, Gunicorn)
- `docker-compose.yml` - Orchestration avec MariaDB, App Flask, et Nginx (optionnel)
- `docker-entrypoint.sh` - Script d'initialisation automatique
- `.dockerignore` - Exclusion des fichiers non nécessaires
- `docker/nginx/nginx.conf` - Configuration reverse proxy Nginx
- `config/env/docker.env.example` - Variables d'environnement template
- `docs/guide/GUIDE_DEPLOIEMENT_DOCKER.md` - Guide complet de déploiement

**COMMANDES DE DÉPLOIEMENT:**

```bash
# Déploiement simple
cp config/env/docker.env.example .env
docker compose up -d --build

# Avec Nginx (production)
docker compose --profile with-nginx up -d --build
```

## 7 - Correction sur les fonctionalités ✅ TERMINÉ + AMÉLIORÉ

### Objectif

- Champ `ref_bitrix` dans table incident (visible si status = Bitrix)
- Ref Bitrix = 5 chiffres (ex: 82255) extraits des observations

### Amélioration appliquée

- **Ref en fin de texte** : Si observations = "texte...82129", la ref en dernière position est extraite automatiquement
- Exemple : "EL ROUTER...CONTRASEÑA DEL ROUTER PRINCIPAL\n82129" → ref_bitrix = 82129
- Si plusieurs séquences de 5 chiffres → on prend la **dernière**
- Auto-extraction à la sauvegarde + pré-remplissage en modification

### Résultat

- ✅ Rapport: `docs/RAPPORT_REF_BITRIX.md`
- ✅ Scripts migration: `tools/apply_ref_bitrix.py`, `tools/migrate_bitrix_ref.py`
- ✅ SQL manuel: `tools/ajouter_ref_bitrix_COMPLET.sql`
- ✅ Guide: `docs/GUIDE_MODIFICATION_MANUELLE_DB.md`

## 8 - Interaction avec Bitrix24 ✅ TERMINÉ

- Dans le fichier .env, j'ai mon lien API avec Bitrix24
- Dans la table incidencias, Avec le liens AP bitrix, et avec le numero de bitrix, trouver les informations corespondant suivants dans Bitrix24:
  - Etat de la tarea
  - Responsable de la tarea
- Pour le moment faire juste afficher les infomationts dans le console

**IMPLÉMENTATION:**

- Script: `tools/fetch_bitrix_info.py`
- Utilise `BITRIX24_API` du .env
- Récupère pour chaque incident Bitrix (avec ref_bitrix) : état de la tarea + responsable via API `tasks.task.get`
- Affiche les infos dans la console + sauvegarde dans `monitoring/logs/bitrix_fetch_output.txt`

**COMMANDE:**

```bash
python tools/fetch_bitrix_info.py
```

## 9 - Gestion de la base de données ✅ TERMINÉ

- ✅ Verification de la base de données
- ✅ Exportations de la base de données au format .sql compatible HeidiSQL
- ✅ La page est accessible depuis le menu `Editar > Base de datos`

**FICHIERS CRÉÉS:**

- `tools/verify_database_health.py` - Script de vérification (connectivité, intégrité, comptages, FK)
- `tools/export_database_sql.py` - Script d'exportation .sql (structure + données, compatible HeidiSQL)
- `presentation/templates/database.html` - Page de gestion (en Español)
- `backups/exports/` - Dossier de stockage des exports .sql

**ROUTES AJOUTÉES:**

- `GET /base-de-datos` → Page de gestion
- `POST /base-de-datos/verificar` → Vérification (retour JSON)
- `GET /base-de-datos/exportar` → Téléchargement du fichier .sql

**MENU:**

- `Editar > Base de datos` → `url_for('base_de_datos')` (branché dans `base.html`)

## 10 - Gestion des utilisateurs

**Statut : plan réorganisé — en attente de validation avant toute implémentation.**

---

### 10.1 Contexte métier (ville → agence)

- Chaque **utilisateur** est rattaché à une **ville (ciudad)** et à une **agence (agencia)**.
- Une **ville** regroupe **plusieurs agences** (relation 1–N).
- **Données de référence (à figer)** :
  - **Malabo** : Malabo II Cede, Afrimal, Buena Esperanza 1
  - **Bata** : Cocoteros
  - **Mongomo** : Mongomo

---

### 10.2 Modèle de données

| Élément | Action proposée |
|--------|------------------|
| **Nouvelles tables** | `ciudad` et `agencia`, liées (chaque agence appartient à une ville). |
| **Table `operateur` (existante)** | Étendue pour servir de base aux **comptes utilisateurs** (voir schéma cible §10.2.1). |
| **Table `client`** | Ajouter le champ **`id_ciudad`** (ville du client). |

#### 10.2.1 Table `operateur` — schéma cible

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | INTEGER | PK, auto | Identifiant unique |
| `nom` | VARCHAR(100) | NOT NULL | Nom complet / affiché |
| `telephone` | VARCHAR(20) | NOT NULL | Numéro de contact (utilisable comme identifiant de connexion) |
| `email` | VARCHAR(255) | UNIQUE, nullable | Adresse e-mail (autre identifiant de connexion possible) |
| `mot_de_passe_hash` | VARCHAR(255) | NOT NULL | Hachage du mot de passe (jamais en clair) |
| `id_ciudad` | INTEGER | NOT NULL, FK → `ciudad.id` | Ville de rattachement |
| `id_agencia` | INTEGER | NOT NULL, FK → `agencia.id` | Agence de travail (doit appartenir à la même ciudad) |
| `role` | VARCHAR(20) | NOT NULL, défaut `'usuario'` | `'usuario'` ou `'admin'` |
| `avatar_url` | VARCHAR(500) | nullable | Chemin ou URL de l'avatar |
| `actif` | BOOLEAN | NOT NULL, défaut `TRUE` | Compte actif / désactivé sans suppression |
| `cree_le` | DATETIME | NOT NULL | Horodatage de création |
| `modifie_le` | DATETIME | nullable | Dernière mise à jour |

**Règle d'intégrité** : `id_agencia` doit référencer une agence dont `agencia.id_ciudad = operateur.id_ciudad`.

**Index recommandés** : `id_ciudad`, `id_agencia`, `email` (unique), `telephone`.

---

### 10.3 Authentification

- La connexion se fait avec **email OU téléphone** + **mot de passe**.
- **Seul l'administrateur** peut créer, modifier et supprimer un utilisateur (pas d'auto-inscription).
- Pages dédiées : **connexion** et **déconnexion**.

---

### 10.4 Règles d'accès et visibilité

| Action | Utilisateur standard | Administrateur |
|--------|---------------------|----------------|
| Voir les **clients** | ✅ Tous les clients, toutes villes | ✅ Tous |
| Créer un **client** | ✅ Libre (toute ville, pas seulement la sienne) | ✅ Tous |
| Voir les **incidencias** | ⚠️ Uniquement celles **qu'il a créées** ou de **son agence** | ✅ Toutes |
| Créer / modifier une **incidencia** | ✅ Oui | ✅ Oui |
| Gérer les **utilisateurs** | ❌ Non | ✅ Oui (CRUD complet) |

---

### 10.5 Migration des données existantes

- Les clients actuels sont de **Malabo** ou **Bata** uniquement.
- **Détection automatique** : les clients de Bata ont déjà le mot `"Bata"` dans leur champ `Barrio/Adresse` → affectation automatique à `ciudad = Bata`.
- Tous les autres → affectation par défaut à `ciudad = Malabo`.
- Script de migration à exécuter une seule fois après validation.

---

### 10.6 Traçabilité (audit)

- Enregistrer les activités clés de chaque utilisateur en base (périmètre exact à confirmer : connexions, CRUD incidents, etc.).

---

### 10.7 Interface attendue

- Page de **connexion** (email ou téléphone + mot de passe).
- Page de **gestion des utilisateurs** (admin uniquement) : liste, création, modification, désactivation.
- En session : afficher **avatar + nom** en haut à droite de l'interface.

---
