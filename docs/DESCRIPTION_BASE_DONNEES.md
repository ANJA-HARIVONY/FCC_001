# 🗄️ Description Détaillée de la Base de Données - FCC_001

## 📊 Vue d'Ensemble du Schéma

La base de données FCC_001 utilise une **architecture relationnelle** avec **4 tables principales** interconnectées pour gérer efficacement les clients, opérateurs, incidents et rapports IA.

### 🎯 Diagramme Entité-Relations (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     CLIENT      │       │    INCIDENT     │       │   OPERATEUR     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ 🔑 id (PK)      │◄──────│ 🔗 id_client(FK)│──────►│ 🔑 id (PK)      │
│ nom             │   1:N │ 🔗 id_operateur │   N:1 │ nom             │
│ telephone       │       │ intitule        │       │ telephone       │
│ adresse         │       │ observations    │       └─────────────────┘
│ ville           │       │ status          │
│ ip_router       │       │ date_heure      │
│ ip_antea        │       │ 🔑 id (PK)      │
└─────────────────┘       └─────────────────┘
                                   │
                                   │ (Référence)
                                   ▼
                          ┌─────────────────┐
                          │      ETAT       │
                          ├─────────────────┤
                          │ 🔑 id (PK)      │
                          │ titre           │
                          │ type_etat       │
                          │ periode_debut   │
                          │ periode_fin     │
                          │ contenu_ia      │
                          │ graphiques_data │
                          │ parametres      │
                          │ statut          │
                          │ utilisateur     │
                          │ hash_cache      │
                          │ date_creation   │
                          │ date_modification│
                          └─────────────────┘
```

## 🔧 Définitions Détaillées des Tables

### 1. 👥 Table CLIENT

#### Structure SQLAlchemy
```python
class Client(db.Model):
    __tablename__ = 'client'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Informations personnelles
    nom = db.Column(db.String(100), nullable=False, index=True)
    telephone = db.Column(db.String(100), nullable=False)
    
    # Informations géographiques
    adresse = db.Column(db.String(200), nullable=False)
    ville = db.Column(db.String(100), nullable=False, index=True)
    
    # Configuration réseau technique
    ip_router = db.Column(db.String(50), nullable=True)    # IPv4 du routeur
    ip_antea = db.Column(db.String(50), nullable=True)     # IPv4 de l'antenne
    
    # Relations
    incidents = db.relationship('Incident', backref='client', lazy=True, cascade='all, delete-orphan')
```

#### Structure SQL (MariaDB/MySQL)
```sql
CREATE TABLE client (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(100) NOT NULL,
    adresse VARCHAR(200) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    ip_router VARCHAR(50) NULL,
    ip_antea VARCHAR(50) NULL,
    
    -- Index pour performance
    INDEX idx_client_nom (nom),
    INDEX idx_client_ville (ville)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 📋 Contraintes et Validations
- **nom** : Obligatoire, indexé pour recherche rapide
- **telephone** : Obligatoire, format international recommandé
- **adresse** : Obligatoire, adresse complète du client
- **ville** : Obligatoire, indexé pour filtrage géographique
- **ip_router/ip_antea** : Optionnels, format IPv4 validé côté application
- **Cascade DELETE** : Suppression automatique des incidents liés

#### 💾 Exemple de Données
```json
{
    "id": 1,
    "nom": "010043 ROMUALDO ASUMU EDU ONGUENE",
    "telephone": "222687361",
    "adresse": "SANTA MARIA 3 PILAR MOMO",
    "ville": "SANTA MARIA 3 PILAR MOMO",
    "ip_router": "10.33.7.223",
    "ip_antea": "10.33.17.223"
}
```

### 2. 🔧 Table OPERATEUR

#### Structure SQLAlchemy
```python
class Operateur(db.Model):
    __tablename__ = 'operateur'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Informations personnelles
    nom = db.Column(db.String(100), nullable=False, index=True)
    telephone = db.Column(db.String(20), nullable=False)
    
    # Relations
    incidents = db.relationship('Incident', backref='operateur', lazy=True)
```

#### Structure SQL (MariaDB/MySQL)
```sql
CREATE TABLE operateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    
    -- Index pour performance
    INDEX idx_operateur_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 📋 Contraintes et Validations
- **nom** : Obligatoire, indexé pour recherche rapide
- **telephone** : Obligatoire, contact direct de l'opérateur
- **Pas de cascade DELETE** : Conservation de l'historique des incidents

#### 💾 Exemple de Données
```json
{
    "id": 1,
    "nom": "Cresencia",
    "telephone": "222000001"
}
```

### 3. 🚨 Table INCIDENT

#### Structure SQLAlchemy
```python
class Incident(db.Model):
    __tablename__ = 'incident'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Relations (clés étrangères)
    id_client = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False, index=True)
    id_operateur = db.Column(db.Integer, db.ForeignKey('operateur.id'), nullable=False, index=True)
    
    # Détails de l'incident
    intitule = db.Column(db.String(200), nullable=False)
    observations = db.Column(db.Text, nullable=True)
    
    # Workflow et statut
    status = db.Column(db.String(20), nullable=False, default='Pendiente', index=True)
    
    # Horodatage
    date_heure = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)
```

#### Structure SQL (MariaDB/MySQL)
```sql
CREATE TABLE incident (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT NOT NULL,
    intitule VARCHAR(200) NOT NULL,
    observations TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    id_operateur INT NOT NULL,
    date_heure DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Index pour performance
    INDEX idx_incident_client (id_client),
    INDEX idx_incident_operateur (id_operateur),
    INDEX idx_incident_status (status),
    INDEX idx_incident_date (date_heure),
    
    -- Clés étrangères avec cascade
    CONSTRAINT incident_ibfk_1 FOREIGN KEY (id_client) REFERENCES client(id) ON DELETE CASCADE,
    CONSTRAINT incident_ibfk_2 FOREIGN KEY (id_operateur) REFERENCES operateur(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 🏷️ Statuts Possibles
```python
STATUTS_INCIDENTS = {
    'Pendiente': {
        'description': 'Incident en attente de traitement',
        'color': 'warning',
        'icon': 'clock'
    },
    'Solucionadas': {
        'description': 'Incident résolu avec succès',
        'color': 'success',
        'icon': 'check-circle'
    },
    'Bitrix': {
        'description': 'Incident transféré vers système Bitrix',
        'color': 'info',
        'icon': 'external-link'
    }
}
```

#### 📋 Contraintes et Validations
- **id_client** : Obligatoire, référence vers table client
- **id_operateur** : Obligatoire, référence vers table operateur
- **intitule** : Obligatoire, titre descriptif de l'incident
- **status** : Valeurs contrôlées, indexé pour filtrage
- **date_heure** : Automatique à la création, indexé pour tri chronologique

#### 💾 Exemple de Données
```json
{
    "id": 1883,
    "id_client": 1421,
    "id_operateur": 3,
    "intitule": "MALA RED",
    "observations": "",
    "status": "Solucionadas",
    "date_heure": "2025-07-10T12:56:13"
}
```

### 4. 📊 Table ETAT (États IA)

#### Structure SQLAlchemy
```python
class Etat(db.Model):
    __tablename__ = 'etat'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Informations de base
    titre = db.Column(db.String(255), nullable=False, index=True)
    type_etat = db.Column(db.String(50), nullable=False, index=True)
    
    # Période d'analyse
    periode_debut = db.Column(db.Date, nullable=True, index=True)
    periode_fin = db.Column(db.Date, nullable=True, index=True)
    
    # Contenu IA et données
    contenu_ia = db.Column(db.Text, nullable=True)          # JSON string du contenu IA
    graphiques_data = db.Column(db.Text, nullable=True)     # JSON string des données graphiques
    parametres = db.Column(db.Text, nullable=True)          # JSON string des paramètres
    
    # État et gestion
    statut = db.Column(db.String(20), nullable=False, default='generated', index=True)
    utilisateur = db.Column(db.String(100), nullable=True)
    
    # Cache et performance
    hash_cache = db.Column(db.String(64), nullable=True, index=True)
    
    # Horodatage
    date_creation = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)
    date_modification = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
```

#### Structure SQL (MariaDB/MySQL)
```sql
CREATE TABLE etat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    type_etat VARCHAR(50) NOT NULL,
    periode_debut DATE NULL,
    periode_fin DATE NULL,
    contenu_ia TEXT NULL,
    graphiques_data LONGTEXT NULL CHECK (json_valid(graphiques_data)),
    parametres LONGTEXT NULL CHECK (json_valid(parametres)),
    statut VARCHAR(20) NOT NULL DEFAULT 'generated',
    utilisateur VARCHAR(100) NULL,
    hash_cache VARCHAR(64) NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Index pour performance
    INDEX ix_etat_titre (titre),
    INDEX ix_etat_type_etat (type_etat),
    INDEX ix_etat_periode_debut (periode_debut),
    INDEX ix_etat_periode_fin (periode_fin),
    INDEX ix_etat_statut (statut),
    INDEX ix_etat_hash_cache (hash_cache),
    INDEX ix_etat_date_creation (date_creation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 🎯 Types d'États
```python
TYPES_ETATS = {
    'summary': 'Résumé général des incidents',
    'analysis': 'Analyse détaillée des tendances',
    'trend': 'Analyse des tendances temporelles',
    'custom': 'Rapport personnalisé'
}
```

#### 📋 Contraintes et Validations
- **titre** : Obligatoire, indexé pour recherche
- **type_etat** : Obligatoire, valeurs contrôlées
- **contenu_ia** : JSON string du contenu généré par IA
- **statut** : États de génération (generating, generated, error)
- **hash_cache** : Pour éviter la régénération de rapports identiques

## 🔍 Index et Optimisations de Performance

### 📈 Index Automatiques (Clés Primaires)
- `client.id` (AUTO_INCREMENT)
- `operateur.id` (AUTO_INCREMENT)
- `incident.id` (AUTO_INCREMENT)
- `etat.id` (AUTO_INCREMENT)

### ⚡ Index Explicites pour Performance

#### Table CLIENT
```sql
CREATE INDEX idx_client_nom ON client(nom);           -- Recherche par nom
CREATE INDEX idx_client_ville ON client(ville);       -- Filtrage par ville
```

#### Table OPERATEUR
```sql
CREATE INDEX idx_operateur_nom ON operateur(nom);     -- Recherche par nom
```

#### Table INCIDENT
```sql
CREATE INDEX idx_incident_client ON incident(id_client);      -- Jointures client
CREATE INDEX idx_incident_operateur ON incident(id_operateur); -- Jointures opérateur
CREATE INDEX idx_incident_status ON incident(status);          -- Filtrage par statut
CREATE INDEX idx_incident_date ON incident(date_heure);        -- Tri chronologique
```

#### Table ETAT
```sql
CREATE INDEX ix_etat_titre ON etat(titre);                    -- Recherche par titre
CREATE INDEX ix_etat_type_etat ON etat(type_etat);           -- Filtrage par type
CREATE INDEX ix_etat_periode_debut ON etat(periode_debut);    -- Filtrage par période
CREATE INDEX ix_etat_periode_fin ON etat(periode_fin);       -- Filtrage par période
CREATE INDEX ix_etat_statut ON etat(statut);                 -- Filtrage par statut
CREATE INDEX ix_etat_hash_cache ON etat(hash_cache);         -- Cache lookup
CREATE INDEX ix_etat_date_creation ON etat(date_creation);   -- Tri chronologique
```

## 🔗 Relations et Contraintes d'Intégrité

### 🔄 Relations Principales

#### Client → Incidents (1:N)
```sql
-- Un client peut avoir plusieurs incidents
ALTER TABLE incident 
ADD CONSTRAINT incident_ibfk_1 
FOREIGN KEY (id_client) REFERENCES client(id) ON DELETE CASCADE;
```

#### Opérateur → Incidents (1:N)
```sql
-- Un opérateur peut traiter plusieurs incidents
ALTER TABLE incident 
ADD CONSTRAINT incident_ibfk_2 
FOREIGN KEY (id_operateur) REFERENCES operateur(id) ON DELETE CASCADE;
```

### 🛡️ Contraintes d'Intégrité

#### Contraintes NOT NULL
- **client.nom, telephone, adresse, ville** : Informations essentielles
- **operateur.nom, telephone** : Contact obligatoire
- **incident.id_client, intitule, status, date_heure** : Données critiques
- **etat.titre, type_etat, statut, date_creation** : Métadonnées obligatoires

#### Contraintes DEFAULT
```sql
-- Valeurs par défaut pour cohérence
incident.status DEFAULT 'Pendiente'
incident.date_heure DEFAULT CURRENT_TIMESTAMP
etat.statut DEFAULT 'generated'
etat.date_creation DEFAULT CURRENT_TIMESTAMP
etat.date_modification DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

## 🗄️ Configuration Multi-Environnement

### 🔧 SQLite (Développement)
```python
# Configuration pour développement local
SQLALCHEMY_DATABASE_URI = 'sqlite:///data/instance/gestion_client.db'

# Avantages:
# - Fichier unique portable
# - Zéro configuration
# - Parfait pour développement/test
# - Sauvegarde simple (copie fichier)
```

### 🏭 MariaDB/MySQL (Production)
```python
# Configuration pour production
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://user:password@host:port/fcc_001_db'

# Avantages:
# - Performance supérieure
# - Concurrence native
# - Fonctionnalités avancées (JSON, contraintes)
# - Scalabilité horizontale
```

### 🔄 Migration Automatique
```python
def setup_database_config():
    """Configure la base avec test de connexion et fallback"""
    try:
        # Test connexion MariaDB
        test_mysql_connection()
        print("✅ Connexion MariaDB établie")
    except Exception as e:
        print(f"⚠️ MariaDB indisponible: {e}")
        print("🔄 Basculement vers SQLite")
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gestion_client.db'
```

## 📊 Statistiques de Données (Production)

### 📈 Volume de Données Actuel
```sql
-- Statistiques approximatives basées sur les sauvegardes
SELECT 
    'Clients' as table_name, COUNT(*) as records FROM client
UNION ALL
SELECT 
    'Opérateurs' as table_name, COUNT(*) as records FROM operateur  
UNION ALL
SELECT 
    'Incidents' as table_name, COUNT(*) as records FROM incident
UNION ALL
SELECT 
    'États IA' as table_name, COUNT(*) as records FROM etat;

-- Résultats approximatifs:
-- Clients: ~1,421 enregistrements
-- Opérateurs: ~7 enregistrements  
-- Incidents: ~3,800+ enregistrements
-- États IA: ~8 enregistrements
```

### 📊 Répartition des Incidents par Statut
```sql
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM incident), 2) as percentage
FROM incident 
GROUP BY status 
ORDER BY count DESC;
```

## 🔧 Migrations et Évolution du Schéma

### 📝 Historique des Migrations

#### Migration 1: Ajout des champs IP
```python
# Fichier: 2adc92440c6c_ajout_des_champs_ip_router_et_ip_antea_.py
def upgrade():
    op.add_column('client', sa.Column('ip_router', sa.String(50), nullable=True))
    op.add_column('client', sa.Column('ip_antea', sa.String(50), nullable=True))
```

#### Migration 2: Ajout table États IA
```python
# Fichier: 20250801_133000_ajout_table_etat_ia.py
def upgrade():
    op.create_table('etat',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('titre', sa.String(length=255), nullable=False),
        # ... autres colonnes
    )
```

### 🔄 Commandes de Migration
```bash
# Génération d'une nouvelle migration
flask db migrate -m "Description du changement"

# Application des migrations
flask db upgrade

# Rollback si nécessaire
flask db downgrade
```

## 🛠️ Maintenance et Optimisation

### 🧹 Scripts de Nettoyage
```python
# Nettoyage des doublons clients
def clean_client_duplicates():
    duplicates = db.session.query(Client.nom, func.count(Client.id))\
        .group_by(Client.nom)\
        .having(func.count(Client.id) > 1).all()
```

### 📊 Analyse de Performance
```sql
-- Requêtes les plus fréquentes optimisées
EXPLAIN SELECT c.*, COUNT(i.id) as incident_count 
FROM client c 
LEFT JOIN incident i ON c.id = i.id_client 
GROUP BY c.id 
ORDER BY incident_count DESC;
```

### 💾 Stratégie de Sauvegarde
- **Sauvegarde automatique** : Scripts quotidiens
- **Export SQL** : Dumps complets avec structure + données
- **Sauvegarde différentielle** : Données modifiées uniquement
- **Archivage** : Conservation historique des incidents

---

## 🎯 Conclusion

La base de données FCC_001 présente une **architecture robuste et évolutive** avec :

### ✅ **Points Forts**
- **Modèle relationnel cohérent** avec intégrité référentielle
- **Index optimisés** pour les requêtes fréquentes
- **Support multi-environnement** (SQLite ↔ MariaDB)
- **Migrations versionnées** avec Alembic
- **Extensibilité** avec la table États IA

### 🚀 **Évolutions Possibles**
- **Partitioning** des incidents par date pour performance
- **Réplication** master-slave pour haute disponibilité
- **Cache Redis** pour requêtes fréquentes
- **Archivage automatique** des anciens incidents

*Cette architecture garantit la scalabilité, la performance et la maintenabilité de l'application FCC_001.*
