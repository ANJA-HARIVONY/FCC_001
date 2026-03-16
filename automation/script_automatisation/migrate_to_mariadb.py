#!/usr/bin/env python3
"""
Script de migration de SQLite vers MariaDB
Usage: python migrate_to_mariadb.py
"""

import os
import sys
import sqlite3
import pymysql
from datetime import datetime
import json

# Configuration de la base de données MariaDB
MARIADB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'toor',
    'database': 'fcc_001_db',
    'charset': 'utf8mb4'
}

SQLITE_DB_PATH = 'gestion_client.db'

def test_mariadb_connection():
    """Test de la connexion MariaDB"""
    try:
        print("🔍 Test de la connexion MariaDB...")
        connection = pymysql.connect(
            host=MARIADB_CONFIG['host'],
            user=MARIADB_CONFIG['user'],
            password=MARIADB_CONFIG['password'],
            charset=MARIADB_CONFIG['charset']
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ Connexion MariaDB réussie - Version: {version[0]}")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion MariaDB: {e}")
        return False

def create_database():
    """Création de la base de données MariaDB"""
    try:
        print(f"🏗️  Création de la base de données '{MARIADB_CONFIG['database']}'...")
        
        connection = pymysql.connect(
            host=MARIADB_CONFIG['host'],
            user=MARIADB_CONFIG['user'],
            password=MARIADB_CONFIG['password'],
            charset=MARIADB_CONFIG['charset']
        )
        
        with connection.cursor() as cursor:
            # Création de la base de données
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MARIADB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ Base de données '{MARIADB_CONFIG['database']}' créée/vérifiée")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la création de la base de données: {e}")
        return False

def create_tables():
    """Création des tables MariaDB"""
    try:
        print("🏗️  Création des tables MariaDB...")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            # Table client
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS client (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nom VARCHAR(100) NOT NULL,
                    telephone VARCHAR(100) NOT NULL,
                    adresse VARCHAR(200) NOT NULL,
                    ville VARCHAR(100) NOT NULL,
                    ip_router VARCHAR(50),
                    ip_antea VARCHAR(50),
                    INDEX idx_client_nom (nom),
                    INDEX idx_client_ville (ville)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Table operateur
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS operateur (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nom VARCHAR(100) NOT NULL,
                    telephone VARCHAR(20) NOT NULL,
                    INDEX idx_operateur_nom (nom)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Table incident
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS incident (
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            connection.commit()
            print("✅ Tables MariaDB créées avec succès")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")
        return False

def export_sqlite_data():
    """Export des données depuis SQLite"""
    try:
        print("📤 Export des données SQLite...")
        
        if not os.path.exists(SQLITE_DB_PATH):
            print(f"❌ Fichier SQLite non trouvé: {SQLITE_DB_PATH}")
            return None
        
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        sqlite_conn.row_factory = sqlite3.Row
        
        data = {}
        
        # Export des clients
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT * FROM client ORDER BY id")
        data['clients'] = [dict(row) for row in cursor.fetchall()]
        print(f"📋 {len(data['clients'])} clients exportés")
        
        # Export des opérateurs
        cursor.execute("SELECT * FROM operateur ORDER BY id")
        data['operateurs'] = [dict(row) for row in cursor.fetchall()]
        print(f"👥 {len(data['operateurs'])} opérateurs exportés")
        
        # Export des incidents
        cursor.execute("SELECT * FROM incident ORDER BY id")
        data['incidents'] = [dict(row) for row in cursor.fetchall()]
        print(f"🎫 {len(data['incidents'])} incidents exportés")
        
        sqlite_conn.close()
        
        # Sauvegarde en JSON pour sécurité
        backup_file = f"sqlite_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"💾 Sauvegarde créée: {backup_file}")
        
        return data
    except Exception as e:
        print(f"❌ Erreur lors de l'export SQLite: {e}")
        return None

def import_to_mariadb(data):
    """Import des données vers MariaDB"""
    try:
        print("📥 Import des données vers MariaDB...")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            # Désactiver les vérifications de clés étrangères temporairement
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Vider les tables existantes
            cursor.execute("TRUNCATE TABLE incident")
            cursor.execute("TRUNCATE TABLE operateur")
            cursor.execute("TRUNCATE TABLE client")
            
            # Import des clients
            print("📋 Import des clients...")
            for client in data['clients']:
                cursor.execute("""
                    INSERT INTO client (id, nom, telephone, adresse, ville, ip_router, ip_antea)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    client['id'], client['nom'], client['telephone'],
                    client['adresse'], client['ville'], client['ip_router'], client['ip_antea']
                ))
            
            # Import des opérateurs
            print("👥 Import des opérateurs...")
            for operateur in data['operateurs']:
                cursor.execute("""
                    INSERT INTO operateur (id, nom, telephone)
                    VALUES (%s, %s, %s)
                """, (operateur['id'], operateur['nom'], operateur['telephone']))
            
            # Import des incidents
            print("🎫 Import des incidents...")
            for incident in data['incidents']:
                cursor.execute("""
                    INSERT INTO incident (id, id_client, intitule, observations, status, id_operateur, date_heure)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    incident['id'], incident['id_client'], incident['intitule'],
                    incident['observations'], incident['status'], incident['id_operateur'],
                    incident['date_heure']
                ))
            
            # Réactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            # Ajuster les auto_increment
            cursor.execute("SELECT MAX(id) FROM client")
            max_client_id = cursor.fetchone()[0] or 0
            cursor.execute(f"ALTER TABLE client AUTO_INCREMENT = {max_client_id + 1}")
            
            cursor.execute("SELECT MAX(id) FROM operateur")
            max_operateur_id = cursor.fetchone()[0] or 0
            cursor.execute(f"ALTER TABLE operateur AUTO_INCREMENT = {max_operateur_id + 1}")
            
            cursor.execute("SELECT MAX(id) FROM incident")
            max_incident_id = cursor.fetchone()[0] or 0
            cursor.execute(f"ALTER TABLE incident AUTO_INCREMENT = {max_incident_id + 1}")
            
            connection.commit()
            print("✅ Import MariaDB terminé avec succès")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'import MariaDB: {e}")
        return False

def verify_migration():
    """Vérification de la migration"""
    try:
        print("🔍 Vérification de la migration...")
        
        # Vérification SQLite
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        sqlite_counts = {}
        
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM client")
        sqlite_counts['clients'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM operateur")
        sqlite_counts['operateurs'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM incident")
        sqlite_counts['incidents'] = cursor.fetchone()[0]
        
        sqlite_conn.close()
        
        # Vérification MariaDB
        mariadb_conn = pymysql.connect(**MARIADB_CONFIG)
        mariadb_counts = {}
        
        with mariadb_conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM client")
            mariadb_counts['clients'] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM operateur")
            mariadb_counts['operateurs'] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM incident")
            mariadb_counts['incidents'] = cursor.fetchone()[0]
        
        mariadb_conn.close()
        
        # Comparaison
        print("\n📊 Résultats de la vérification:")
        print("-" * 50)
        for table in ['clients', 'operateurs', 'incidents']:
            sqlite_count = sqlite_counts[table]
            mariadb_count = mariadb_counts[table]
            status = "✅" if sqlite_count == mariadb_count else "❌"
            print(f"{status} {table.capitalize()}: SQLite({sqlite_count}) -> MariaDB({mariadb_count})")
        
        total_match = all(sqlite_counts[t] == mariadb_counts[t] for t in sqlite_counts)
        
        if total_match:
            print("\n🎉 Migration réussie ! Toutes les données ont été migrées correctement.")
        else:
            print("\n⚠️  Attention ! Certaines données ne correspondent pas.")
        
        return total_match
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return False

def update_config_file():
    """Mise à jour du fichier de configuration"""
    try:
        print("⚙️  Mise à jour de la configuration...")
        
        # Sauvegarde de l'ancien config
        if os.path.exists('config.py'):
            backup_config = f"config_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
            os.rename('config.py', backup_config)
            print(f"💾 Sauvegarde de config.py -> {backup_config}")
        
        # Création du nouveau fichier de configuration
        config_content = f"""import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre-cle-secrete-ici'
    
    # Configuration de la base de données MariaDB
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \\
        'mysql+pymysql://root:toor@localhost/fcc_001_db?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {{
        'pool_recycle': 300,
        'pool_pre_ping': True
    }}
    
    # Configuration multilingue
    LANGUAGES = {{
        'fr': 'Français',
        'es': 'Español', 
        'en': 'English'
    }}
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # Configuration optimisée pour la production
    SQLALCHEMY_ENGINE_OPTIONS = {{
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }}

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {{
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}}
"""
        
        with open('config.py', 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        print("✅ Configuration mise à jour pour MariaDB")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour de la configuration: {e}")
        return False

def install_dependencies():
    """Installation des dépendances MariaDB"""
    try:
        print("📦 Vérification des dépendances...")
        
        # Vérifier si pymysql est installé
        try:
            import pymysql
            print("✅ PyMySQL déjà installé")
        except ImportError:
            print("⚠️  PyMySQL non trouvé")
            print("📝 Ajout de PyMySQL aux requirements...")
            
            # Ajouter PyMySQL aux requirements
            with open('requirements.txt', 'r') as f:
                requirements = f.read()
            
            if 'pymysql' not in requirements.lower():
                with open('requirements.txt', 'a') as f:
                    f.write('\\nPyMySQL>=1.0.2\\n')
                print("✅ PyMySQL ajouté aux requirements.txt")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des dépendances: {e}")
        return False

def main():
    """Fonction principale de migration"""
    print("🚀 Début de la migration SQLite -> MariaDB")
    print("=" * 50)
    
    # 1. Vérifier les dépendances
    if not install_dependencies():
        return False
    
    # 2. Test de connexion MariaDB
    if not test_mariadb_connection():
        print("💡 Assurez-vous que MariaDB est démarré et que les credentials sont corrects")
        return False
    
    # 3. Création de la base de données
    if not create_database():
        return False
    
    # 4. Création des tables
    if not create_tables():
        return False
    
    # 5. Export des données SQLite
    data = export_sqlite_data()
    if not data:
        return False
    
    # 6. Import vers MariaDB
    if not import_to_mariadb(data):
        return False
    
    # 7. Vérification
    if not verify_migration():
        return False
    
    # 8. Mise à jour de la configuration
    if not update_config_file():
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Migration terminée avec succès !")
    print("\n📋 Prochaines étapes:")
    print("1. Installer PyMySQL si nécessaire: pip install PyMySQL")
    print("2. Redémarrer votre application Flask")
    print("3. Tester toutes les fonctionnalités")
    print("4. Les sauvegardes ont été créées pour sécurité")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\\n⚠️  Migration interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\\n❌ Erreur inattendue: {e}")
        sys.exit(1) 