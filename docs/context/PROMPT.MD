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

**Statut : en attente de validation avant toute implémentation.**

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

- Enregistrer les activités clés de chaque utilisateur en base.

---

### 10.7 Interface attendue

- Page de **connexion** (email ou téléphone + mot de passe).
- Page de **gestion des utilisateurs** (admin uniquement) : liste, création, modification, désactivation.
- En session : afficher **avatar + nom** en haut à droite de l'interface.

---

### 10.8 Améliorations UX

#### Formulaires `nuevo incidencia` et `modificar incidencia`

- **Supprimer le champ `Operador`** de ces deux formulaires.
- L'opérateur est automatiquement l'**utilisateur connecté** (`current_user`) — affecté côté serveur à la création/modification, sans intervention de l'utilisateur.
- **À modifier** :
  - `presentation/templates/nuevo_incident.html` — retirer le `<select>` operador
  - `presentation/templates/modifier_incident.html` — retirer le `<select>` operador
  - `core/app.py` route `nouveau_incident` → `incident.id_operateur = current_user.id`
  - `core/app.py` route `modifier_incident` → `incident.id_operateur = current_user.id`

---

### 10.9 Plan d'implémentation détaillé

#### Phase 1 — Base de données (migrations)

##### Étape 1.1 — Table `ciudad`

```sql
CREATE TABLE ciudad (
  id      INTEGER      PRIMARY KEY AUTO_INCREMENT,
  nombre  VARCHAR(100) NOT NULL UNIQUE
);
INSERT INTO ciudad (nombre) VALUES ('Malabo'), ('Bata'), ('Mongomo');
```

##### Étape 1.2 — Table `agencia`

```sql
CREATE TABLE agencia (
  id         INTEGER      PRIMARY KEY AUTO_INCREMENT,
  nombre     VARCHAR(100) NOT NULL,
  id_ciudad  INTEGER      NOT NULL,
  FOREIGN KEY (id_ciudad) REFERENCES ciudad(id)
);
INSERT INTO agencia (nombre, id_ciudad) VALUES
  ('Malabo II Cede',    1),
  ('Afrimal',           1),
  ('Buena Esperanza 1', 1),
  ('Cocoteros',         2),
  ('Mongomo',           3);
```

##### Étape 1.3 — Modification de la table `operateur`

> **Note** : Tous les opérateurs existants sont actuellement à **Malabo**, agence **Malabo II Cede**.
> Les valeurs `DEFAULT 1` correspondent à `ciudad.id = 1` (Malabo) et `agencia.id = 1` (Malabo II Cede),
> ce qui les affecte automatiquement sans nécessiter de mise à jour manuelle.

```sql
-- Étape 1 : s'assurer que ciudad et agencia existent avant d'ajouter les FK
-- ciudad id=1 → Malabo  |  agencia id=1 → Malabo II Cede  (voir étapes 1.1 et 1.2)

ALTER TABLE operateur
  ADD COLUMN email             VARCHAR(255) UNIQUE,
  ADD COLUMN mot_de_passe_hash VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN id_ciudad         INTEGER      NOT NULL DEFAULT 1,  -- Malabo par défaut
  ADD COLUMN id_agencia        INTEGER      NOT NULL DEFAULT 1,  -- Malabo II Cede par défaut
  ADD COLUMN role              VARCHAR(20)  NOT NULL DEFAULT 'usuario',
  ADD COLUMN avatar_url        VARCHAR(500),
  ADD COLUMN actif             BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN cree_le           DATETIME     NOT NULL DEFAULT NOW(),
  ADD COLUMN modifie_le        DATETIME,
  ADD FOREIGN KEY (id_ciudad)  REFERENCES ciudad(id),
  ADD FOREIGN KEY (id_agencia) REFERENCES agencia(id);

-- Résultat : tous les opérateurs existants seront automatiquement
-- rattachés à ciudad=Malabo (id=1) et agencia=Malabo II Cede (id=1).
-- L'admin pourra ensuite modifier chaque opérateur si nécessaire.
```

##### Étape 1.4 — Modification de la table `client`

```sql
ALTER TABLE client
  ADD COLUMN id_ciudad INTEGER,
  ADD FOREIGN KEY (id_ciudad) REFERENCES ciudad(id);
```

##### Étape 1.5 — Table `audit_log` (traçabilité)

```sql
CREATE TABLE audit_log (
  id           INTEGER     PRIMARY KEY AUTO_INCREMENT,
  id_operateur INTEGER,
  action       VARCHAR(50) NOT NULL,
  detail       TEXT,
  ip_address   VARCHAR(45),
  date_heure   DATETIME    NOT NULL DEFAULT NOW(),
  FOREIGN KEY (id_operateur) REFERENCES operateur(id) ON DELETE SET NULL
);
```

**Fichier de migration Flask** : `migrations/versions/xxx_point10_users.py`

---

#### Phase 2 — Migration des données existantes

**Script `tools/migrate_users_data.py`** — exécuté une seule fois :

- **Clients → `id_ciudad`** :
  - Si `adresse` ou `ville` contient `"Bata"` (insensible à la casse) → `id_ciudad = 2`
  - Sinon → `id_ciudad = 1` (Malabo par défaut)

- **Opérateurs existants** :
  - Assigner par défaut `ciudad = Malabo`, `agencia = Malabo II Cede`
  - **Compte administrateur unique** — Anja (qui existe déja dans la base) :
    - `nom` : `Anja`
    - `email` : `anjaharivoni@mail.com`
    - `mot_de_passe_hash` : hash de `Malabo2026@#`
    - `role` : `admin`
  - **Autres opérateurs existants** : `mot_de_passe_hash` laissé vide (`''`) — ils ne peuvent pas se connecter tant que l'admin (Anja) ne leur définit pas un mot de passe via la page de gestion des utilisateurs.

---

#### Phase 3 — Backend Flask (`core/app.py`)

##### Étape 3.1 — Nouvelle dépendance

```
flask-login        (à ajouter dans requirements.txt)
werkzeug.security  (déjà présent dans Flask)
```

##### Étape 3.2 — Initialisation Flask-Login

```python
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
login_manager = LoginManager(app)
login_manager.login_view = 'login'
```

##### Étape 3.3 — Adaptation du modèle `Operateur` (UserMixin)

```python
from flask_login import UserMixin
class Operateur(UserMixin, db.Model):
    # + tous les nouveaux champs
    # méthode is_admin() via role == 'admin'
    # is_active via champ actif
```

##### Étape 3.4 — Nouvelles routes

| Route | Méthode | Accès | Description |
|-------|---------|-------|-------------|
| `/login` | GET / POST | Public | Page de connexion |
| `/logout` | GET | Connecté | Déconnexion |
| `/usuarios` | GET | Admin | Liste des utilisateurs |
| `/usuarios/nuevo` | GET / POST | Admin | Créer un utilisateur |
| `/usuarios/<id>/editar` | GET / POST | Admin | Modifier un utilisateur |
| `/usuarios/<id>/desactivar` | POST | Admin | Désactiver / activer |
| `/usuarios/<id>/avatar` | POST | Admin ou soi-même | Upload avatar |
| `/api/agencias/<id_ciudad>` | GET | Connecté | Agences d'une ville (AJAX) |

##### Étape 3.5 — Décorateur admin

```python
from functools import wraps
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated
```

##### Étape 3.6 — Filtrage des incidents (règle 10.4)

Modifier la route `/incidents` : si `current_user.role != 'admin'`, filtrer par :

```python
.filter(
    db.or_(
        Incident.id_operateur == current_user.id,
        Operateur.id_agencia  == current_user.id_agencia
    )
)
```

##### Étape 3.7 — Protection de toutes les routes existantes

Ajouter `@login_required` sur toutes les routes actuelles (dashboard, clients, incidents, etc.).

---

#### Phase 4 — Templates HTML

**Fichiers à créer :**

| Fichier | Description |
|---------|-------------|
| `presentation/templates/login.html` | Page de connexion (email ou téléphone + mot de passe) |
| `presentation/templates/usuarios.html` | Liste des utilisateurs (admin) |
| `presentation/templates/nuevo_usuario.html` | Formulaire création |
| `presentation/templates/editar_usuario.html` | Formulaire modification |

**Fichiers à modifier :**

| Fichier | Modification |
|---------|-------------|
| `presentation/templates/base.html` | Avatar + nom en haut à droite + bouton déconnexion |
| `presentation/templates/incidents.html` | Masquer filtre "tous opérateurs" pour utilisateur standard |
| `presentation/templates/nuevo_incident.html` | Supprimer le `<select>` Operador (§10.8) |
| `presentation/templates/modifier_incident.html` | Supprimer le `<select>` Operador (§10.8) |

**Zone session dans `base.html`** (haut à droite) :

```html
<div class="d-flex align-items-center gap-2">
  <img src="{{ current_user.avatar_url or url_for('static', filename='img/default_avatar.png') }}"
       class="rounded-circle" width="32" height="32">
  <span class="text-white small">{{ current_user.nom }}</span>
  <a href="{{ url_for('logout') }}" class="btn btn-sm btn-outline-danger ms-2">
    <i class="fas fa-sign-out-alt"></i> Salir
  </a>
</div>
```

---

#### Phase 5 — Upload Avatar

- Dossier de stockage : `presentation/static/avatars/`
- Formats acceptés : JPG, PNG, WEBP
- Taille max : 2 Mo
- Nom de fichier : `avatar_<id_operateur>.<ext>`
- Si pas d'avatar : `static/img/default_avatar.png`

---

#### Phase 6 — Traçabilité (audit)

Enregistrement automatique dans `audit_log` pour :

| Événement | Action enregistrée |
|-----------|-------------------|
| Connexion réussie | `LOGIN` |
| Déconnexion | `LOGOUT` |
| Création d'un incident | `CREATE_INCIDENT` |
| Modification d'un incident | `UPDATE_INCIDENT` |
| Suppression d'un incident | `DELETE_INCIDENT` |
| Création d'un client | `CREATE_CLIENT` |
| Modification d'un client | `UPDATE_CLIENT` |
| Suppression d'un client | `DELETE_CLIENT` |

---

#### Ordre d'exécution

```
1. Phase 1  — Migrations DB (tables + colonnes)
2. Phase 2  — Script de migration des données existantes
3. Phase 3  — Backend Flask (login, routes, filtrage)
4. Phase 4  — Templates HTML (+ suppression champ Operador §10.8)
5. Phase 5  — Upload avatar
6. Phase 6  — Traçabilité
7. Tests    — Vérification des accès par rôle
8. PROMPT.MD — Marquer le point 10 ✅ TERMINÉ
```

---

#### Résumé des fichiers à créer / modifier

| Action | Fichier |
|--------|---------|
| Créer | `tools/migrate_users_data.py` |
| Créer | `presentation/templates/login.html` |
| Créer | `presentation/templates/usuarios.html` |
| Créer | `presentation/templates/nuevo_usuario.html` |
| Créer | `presentation/templates/editar_usuario.html` |
| Créer | `presentation/static/avatars/` (dossier) |
| Modifier | `core/app.py` (modèles, routes, Flask-Login) |
| Modifier | `presentation/templates/base.html` |
| Modifier | `presentation/templates/incidents.html` |
| Modifier | `presentation/templates/nuevo_incident.html` (§10.8) |
| Modifier | `presentation/templates/modifier_incident.html` (§10.8) |
| Modifier | `requirements.txt` (+ `flask-login`) |

---
