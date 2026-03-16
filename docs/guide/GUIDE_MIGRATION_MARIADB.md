# Guide de Migration SQLite vers MariaDB

## Vue d'ensemble

Ce guide vous accompagne dans la migration de votre application Flask de SQLite vers MariaDB, avec les scripts automatisés fournis.

## Informations de Configuration

- **Serveur**: localhost
- **Utilisateur**: root
- **Mot de passe**: toor
- **Base de données**: fcc_001_db
- **Port**: 3306 (défaut MariaDB)
- **Charset**: utf8mb4

## Prérequis

### 1. Installation de MariaDB

#### Windows
```bash
# Télécharger et installer MariaDB depuis https://mariadb.org/download/
# Ou utiliser un gestionnaire de paquets comme Chocolatey
choco install mariadb
```

#### macOS
```bash
# Avec Homebrew
brew install mariadb
brew services start mariadb
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

### 2. Configuration de MariaDB

Sécurisez votre installation MariaDB :
```bash
sudo mysql_secure_installation
```

Connectez-vous et créez l'utilisateur (si nécessaire) :
```sql
mysql -u root -p

-- Créer l'utilisateur et la base de données (optionnel)
CREATE USER 'root'@'localhost' IDENTIFIED BY 'toor';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Processus de Migration

### Étape 1 : Installation des Dépendances

```bash
# Option 1: Script automatique
python install_mariadb_dependencies.py

# Option 2: Installation manuelle
pip install PyMySQL>=1.0.2
```

### Étape 2 : Test de Connexion

Avant de lancer la migration, testez votre configuration :

```bash
python test_mariadb_connection.py
```

Ce script vérifie :
- ✅ Disponibilité de PyMySQL
- ✅ Connexion au serveur MariaDB
- ✅ Accès à la base de données
- ✅ Permissions de création de base de données

### Étape 3 : Sauvegarde (Recommandé)

Créez une sauvegarde de votre base SQLite actuelle :

```bash
# Sauvegarde manuelle
cp gestion_client.db gestion_client_backup_$(date +%Y%m%d_%H%M%S).db

# Le script de migration créera aussi une sauvegarde JSON automatiquement
```

### Étape 4 : Migration

Lancez le script de migration principal :

```bash
python migrate_to_mariadb.py
```

Le script effectue automatiquement :

1. **Vérification des dépendances**
2. **Test de connexion MariaDB**
3. **Création de la base de données** `fcc_001_db`
4. **Création des tables** avec indexes optimisés
5. **Export des données SQLite**
6. **Import vers MariaDB** avec préservation des IDs
7. **Vérification de l'intégrité** des données
8. **Mise à jour de la configuration** Flask

### Étape 5 : Vérification

Après la migration, le script affiche un rapport de vérification :

```
📊 Résultats de la vérification:
--------------------------------------------------
✅ Clients: SQLite(150) -> MariaDB(150)
✅ Operateurs: SQLite(5) -> MariaDB(5)
✅ Incidents: SQLite(1250) -> MariaDB(1250)

🎉 Migration réussie ! Toutes les données ont été migrées correctement.
```

## Structure des Tables MariaDB

### Table `client`
```sql
CREATE TABLE client (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(100) NOT NULL,
    adresse VARCHAR(200) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    ip_router VARCHAR(50),
    ip_antea VARCHAR(50),
    INDEX idx_client_nom (nom),
    INDEX idx_client_ville (ville)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table `operateur`
```sql
CREATE TABLE operateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    INDEX idx_operateur_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table `incident`
```sql
CREATE TABLE incident (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT NOT NULL,
    intitule VARCHAR(200) NOT NULL,
    observations TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    id_operateur INT NOT NULL,
    date_heure DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_incident_client (id_client),
    INDEX idx_incident_operateur (id_operateur),
    INDEX idx_incident_status (status),
    INDEX idx_incident_date (date_heure),
    FOREIGN KEY (id_client) REFERENCES client(id) ON DELETE CASCADE,
    FOREIGN KEY (id_operateur) REFERENCES operateur(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Configuration Flask Mise à Jour

Le script met automatiquement à jour `config.py` avec :

```python
# Configuration de la base de données MariaDB
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
    'mysql+pymysql://root:toor@localhost/fcc_001_db'
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'connect_args': {'charset': 'utf8mb4'}
}
```

## Test de l'Application

Après la migration, testez votre application :

```bash
python app.py
```

Vérifiez que :
- ✅ L'application démarre sans erreur
- ✅ Les pages se chargent correctement
- ✅ Les données sont affichées
- ✅ Les fonctionnalités CRUD fonctionnent

## Optimisations MariaDB

### Configuration Recommandée (my.cnf)

```ini
[mysqld]
# Optimisations pour application Flask
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
query_cache_size = 32M
query_cache_type = 1

# Configuration UTF-8
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[mysql]
default-character-set = utf8mb4

[client]
default-character-set = utf8mb4
```

### Maintenance Régulière

```sql
-- Optimiser les tables
OPTIMIZE TABLE client, operateur, incident;

-- Analyser les performances
SHOW TABLE STATUS;

-- Vérifier l'usage des indexes
SHOW INDEX FROM incident;
```

## Sauvegardes et Restauration

### Sauvegarde MariaDB

```bash
# Sauvegarde complète
mysqldump -u root -ptoor fcc_001_db > backup_fcc_001_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde avec compression
mysqldump -u root -ptoor fcc_001_db | gzip > backup_fcc_001_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restauration

```bash
# Restauration depuis sauvegarde
mysql -u root -ptoor fcc_001_db < backup_fcc_001_20241201_143022.sql

# Restauration depuis fichier compressé
gunzip < backup_fcc_001_20241201_143022.sql.gz | mysql -u root -ptoor fcc_001_db
```

## Dépannage

### Problèmes Courants

#### 1. Erreur de Connexion
```
❌ Erreur de connexion MariaDB: (2003, "Can't connect to MySQL server on 'localhost'")
```
**Solution**: Vérifiez que MariaDB est démarré
```bash
# Windows
net start mariadb

# macOS/Linux
sudo systemctl start mariadb
# ou
brew services start mariadb
```

#### 2. Erreur d'Authentification
```
❌ Erreur de connexion MariaDB: (1045, "Access denied for user 'root'@'localhost'")
```
**Solution**: Vérifiez les credentials ou réinitialisez le mot de passe

#### 3. PyMySQL Non Trouvé
```
❌ PyMySQL non disponible
```
**Solution**: 
```bash
pip install PyMySQL>=1.0.2
```

#### 4. Problème d'Encoding
**Solution**: Assurez-vous que utf8mb4 est configuré partout

### Rollback vers SQLite

Si vous devez revenir à SQLite :

1. Restaurez l'ancien `config.py` :
```bash
# Les scripts créent des sauvegardes automatiquement
cp config_backup_YYYYMMDD_HHMMSS.py config.py
```

2. Utilisez la sauvegarde SQLite :
```bash
cp gestion_client_backup_YYYYMMDD_HHMMSS.db gestion_client.db
```

## Performance

### Comparaison SQLite vs MariaDB

| Aspect | SQLite | MariaDB |
|--------|--------|---------|
| **Concurrence** | Limitée | Excellente |
| **Performance** | Bonne pour <100k records | Excellente pour millions |
| **Maintenance** | Aucune | Optimisations périodiques |
| **Sauvegardes** | Copie de fichier | Outils dédiés |
| **Sécurité** | Fichier local | Authentification réseau |

### Métriques de Performance

Surveillez ces métriques après migration :
- Temps de réponse des pages
- Utilisation CPU/RAM
- Temps d'exécution des requêtes
- Nombre de connexions actives

## Support

En cas de problème :

1. Vérifiez les logs MariaDB
2. Consultez la documentation MariaDB
3. Utilisez les scripts de diagnostic fournis
4. Les sauvegardes permettent un rollback complet

---

**Note**: Cette migration améliore significativement les performances et la robustesse de votre application Flask, particulièrement pour les environnements de production avec plusieurs utilisateurs. 