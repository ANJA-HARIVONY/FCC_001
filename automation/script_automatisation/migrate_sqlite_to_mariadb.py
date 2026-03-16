#!/usr/bin/env python3
"""
Script de migration complète de SQLite vers MariaDB
Usage: python migrate_sqlite_to_mariadb.py
"""

import sys
import os
import sqlite3
import pymysql
import json
from datetime import datetime

# Configuration MariaDB
MARIADB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'toor',
    'database': 'fcc_001_db',
    'charset': 'utf8mb4'
}

def test_mariadb_connection():
    """Tester la connexion à MariaDB"""
    print("🔗 TEST DE CONNEXION MARIADB")
    print("=" * 35)
    
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        print("✅ Connexion MariaDB réussie")
        
        cursor = connection.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"📊 Version MariaDB: {version}")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur connexion MariaDB: {e}")
        print("💡 Vérifiez que MariaDB est démarré et que les identifiants sont corrects")
        return False

def create_mariadb_database():
    """Créer la base de données MariaDB si elle n'existe pas"""
    print(f"\n🗄️  CRÉATION DE LA BASE DE DONNÉES MARIADB")
    print("=" * 45)
    
    try:
        # Connexion sans spécifier la base de données
        config_without_db = MARIADB_CONFIG.copy()
        del config_without_db['database']
        
        connection = pymysql.connect(**config_without_db)
        cursor = connection.cursor()
        
        # Créer la base de données si elle n'existe pas
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MARIADB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"✅ Base de données '{MARIADB_CONFIG['database']}' créée/vérifiée")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur création base: {e}")
        return False

def create_mariadb_tables():
    """Créer les tables dans MariaDB"""
    print(f"\n📋 CRÉATION DES TABLES MARIADB")
    print("=" * 35)
    
    tables_sql = {
        'client': '''
            CREATE TABLE IF NOT EXISTS client (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(100) NOT NULL,
                adresse VARCHAR(200) NOT NULL,
                ville VARCHAR(100) NOT NULL,
                ip_router VARCHAR(50),
                ip_antea VARCHAR(50),
                INDEX idx_nom (nom),
                INDEX idx_ville (ville),
                INDEX idx_telephone (telephone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ''',
        'operateur': '''
            CREATE TABLE IF NOT EXISTS operateur (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                INDEX idx_nom (nom)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ''',
        'incident': '''
            CREATE TABLE IF NOT EXISTS incident (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_client INT NOT NULL,
                intitule VARCHAR(200) NOT NULL,
                observations TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
                id_operateur INT NOT NULL,
                date_heure DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_client) REFERENCES client(id) ON DELETE CASCADE,
                FOREIGN KEY (id_operateur) REFERENCES operateur(id) ON DELETE RESTRICT,
                INDEX idx_status (status),
                INDEX idx_date (date_heure),
                INDEX idx_client (id_client),
                INDEX idx_operateur (id_operateur)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        '''
    }
    
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        cursor = connection.cursor()
        
        for table_name, sql in tables_sql.items():
            cursor.execute(sql)
            print(f"✅ Table '{table_name}' créée/vérifiée")
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur création tables: {e}")
        return False

def clear_mariadb_tables():
    """Vider les tables MariaDB avant migration"""
    print(f"\n🧹 VIDAGE DES TABLES MARIADB")
    print("=" * 30)
    
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        cursor = connection.cursor()
        
        # Désactiver temporairement les contraintes de clés étrangères
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Vider les tables dans l'ordre
        tables = ['incident', 'operateur', 'client']
        for table in tables:
            cursor.execute(f"TRUNCATE TABLE {table}")
            print(f"✅ Table '{table}' vidée")
        
        # Réactiver les contraintes
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur vidage tables: {e}")
        return False

def migrate_data_from_sqlite():
    """Migrer les données depuis SQLite vers MariaDB"""
    print(f"\n📦 MIGRATION DES DONNÉES SQLITE → MARIADB")
    print("=" * 45)
    
    sqlite_file = 'instance/gestion_client.db'
    
    if not os.path.exists(sqlite_file):
        print(f"❌ Fichier SQLite non trouvé: {sqlite_file}")
        return False
    
    try:
        # Connexion SQLite
        sqlite_conn = sqlite3.connect(sqlite_file)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connexion MariaDB
        mysql_conn = pymysql.connect(**MARIADB_CONFIG)
        mysql_cursor = mysql_conn.cursor()
        
        # 1. Migrer les clients
        print("👥 Migration des clients...")
        sqlite_cursor.execute("SELECT id, nom, telephone, adresse, ville, ip_router, ip_antea FROM client")
        clients = sqlite_cursor.fetchall()
        
        client_mapping = {}  # Ancien ID -> Nouvel ID
        for client in clients:
            old_id, nom, telephone, adresse, ville, ip_router, ip_antea = client
            
            sql = """INSERT INTO client (nom, telephone, adresse, ville, ip_router, ip_antea) 
                     VALUES (%s, %s, %s, %s, %s, %s)"""
            mysql_cursor.execute(sql, (nom, telephone, adresse, ville, ip_router, ip_antea))
            new_id = mysql_cursor.lastrowid
            client_mapping[old_id] = new_id
        
        print(f"✅ {len(clients)} clients migrés")
        
        # 2. Migrer les opérateurs
        print("🛠️  Migration des opérateurs...")
        sqlite_cursor.execute("SELECT id, nom, telephone FROM operateur")
        operateurs = sqlite_cursor.fetchall()
        
        operateur_mapping = {}  # Ancien ID -> Nouvel ID
        for operateur in operateurs:
            old_id, nom, telephone = operateur
            
            sql = "INSERT INTO operateur (nom, telephone) VALUES (%s, %s)"
            mysql_cursor.execute(sql, (nom, telephone))
            new_id = mysql_cursor.lastrowid
            operateur_mapping[old_id] = new_id
        
        print(f"✅ {len(operateurs)} opérateurs migrés")
        
        # 3. Migrer les incidents
        print("🎫 Migration des incidents...")
        sqlite_cursor.execute("SELECT id, id_client, intitule, observations, status, id_operateur, date_heure FROM incident")
        incidents = sqlite_cursor.fetchall()
        
        migrated_incidents = 0
        for incident in incidents:
            old_id, old_client_id, intitule, observations, status, old_operateur_id, date_heure = incident
            
            # Mapper les IDs
            new_client_id = client_mapping.get(old_client_id)
            new_operateur_id = operateur_mapping.get(old_operateur_id)
            
            if new_client_id and new_operateur_id:
                sql = """INSERT INTO incident (id_client, intitule, observations, status, id_operateur, date_heure) 
                         VALUES (%s, %s, %s, %s, %s, %s)"""
                mysql_cursor.execute(sql, (new_client_id, intitule, observations, status, new_operateur_id, date_heure))
                migrated_incidents += 1
            else:
                print(f"⚠️  Incident {old_id} ignoré (références manquantes)")
        
        print(f"✅ {migrated_incidents} incidents migrés")
        
        # Commit et fermeture
        mysql_conn.commit()
        
        sqlite_cursor.close()
        sqlite_conn.close()
        mysql_cursor.close()
        mysql_conn.close()
        
        print(f"\n🎉 MIGRATION RÉUSSIE!")
        print(f"   👥 Clients: {len(clients)}")
        print(f"   🛠️  Opérateurs: {len(operateurs)}")
        print(f"   🎫 Incidents: {migrated_incidents}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur migration: {e}")
        import traceback
        traceback.print_exc()
        return False

def update_config_for_mariadb():
    """Mettre à jour config.py pour utiliser MariaDB"""
    print(f"\n⚙️  MISE À JOUR DE LA CONFIGURATION")
    print("=" * 40)
    
    config_content = '''import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre-cle-secrete-ici'
    
    # Configuration de la base de données MariaDB
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \\
        'mysql+pymysql://root:toor@localhost/fcc_001_db?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # Configuration multilingue
    LANGUAGES = {
        'fr': 'Français',
        'es': 'Español', 
        'en': 'English'
    }
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # Configuration optimisée pour la production
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 40
    }

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
'''
    
    try:
        with open('config.py', 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Configuration mise à jour pour MariaDB")
        return True
    except Exception as e:
        print(f"❌ Erreur mise à jour config: {e}")
        return False

def test_flask_with_mariadb():
    """Tester l'application Flask avec MariaDB"""
    print(f"\n🧪 TEST DE L'APPLICATION AVEC MARIADB")
    print("=" * 40)
    
    try:
        # Nettoyer les modules cachés
        modules_to_remove = [mod for mod in sys.modules.keys() if mod in ['app', 'config']]
        for mod in modules_to_remove:
            del sys.modules[mod]
        
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app import app, db, Client, Operateur, Incident
        from config import Config
        
        print(f"📋 Configuration:")
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        with app.app_context():
            # Test de connexion
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"✅ Connexion Flask-MariaDB réussie!")
            print(f"📊 Données dans MariaDB:")
            print(f"   👥 Clients: {clients_count}")
            print(f"   🛠️  Opérateurs: {operateurs_count}")
            print(f"   🎫 Incidents: {incidents_count}")
            
            if clients_count > 0:
                # Test de page web
                with app.test_client() as client:
                    response = client.get('/')
                    if response.status_code == 200:
                        print(f"   🌐 Interface web: ✅ OK")
                        return True
                    else:
                        print(f"   ❌ Erreur interface: HTTP {response.status_code}")
                        return False
            else:
                print(f"   ⚠️  Aucune donnée trouvée")
                return False
            
    except Exception as e:
        print(f"❌ Erreur test Flask: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_sqlite_files():
    """Archiver les fichiers SQLite"""
    print(f"\n🗂️  ARCHIVAGE DES FICHIERS SQLITE")
    print("=" * 35)
    
    import shutil
    
    try:
        # Créer un dossier archive
        archive_dir = f"archive_sqlite_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(archive_dir, exist_ok=True)
        
        # Archiver tous les fichiers .db
        archived_files = 0
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.db'):
                    src = os.path.join(root, file)
                    dst = os.path.join(archive_dir, f"{root.replace('/', '_').replace('.', 'root')}_{file}")
                    shutil.copy2(src, dst)
                    print(f"📦 Archivé: {src} → {dst}")
                    archived_files += 1
        
        print(f"✅ {archived_files} fichiers SQLite archivés dans {archive_dir}")
        print("💡 Vous pouvez supprimer ces fichiers plus tard si tout fonctionne bien")
        return True
        
    except Exception as e:
        print(f"❌ Erreur archivage: {e}")
        return False

def main():
    print("🚀 MIGRATION COMPLÈTE SQLITE → MARIADB")
    print("=" * 45)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # 1. Tester la connexion MariaDB
    if not test_mariadb_connection():
        print("\n❌ Échec: Impossible de se connecter à MariaDB")
        print("💡 Vérifiez que MariaDB est démarré et les identifiants sont corrects")
        return False
    
    # 2. Créer la base de données
    if not create_mariadb_database():
        print("\n❌ Échec: Impossible de créer la base de données")
        return False
    
    # 3. Créer les tables
    if not create_mariadb_tables():
        print("\n❌ Échec: Impossible de créer les tables")
        return False
    
    # 4. Vider les tables (au cas où)
    if not clear_mariadb_tables():
        print("\n❌ Échec: Impossible de vider les tables")
        return False
    
    # 5. Migrer les données
    if not migrate_data_from_sqlite():
        print("\n❌ Échec: Impossible de migrer les données")
        return False
    
    # 6. Mettre à jour la configuration
    if not update_config_for_mariadb():
        print("\n❌ Échec: Impossible de mettre à jour la configuration")
        return False
    
    # 7. Tester l'application
    if not test_flask_with_mariadb():
        print("\n❌ Échec: L'application ne fonctionne pas avec MariaDB")
        return False
    
    # 8. Archiver SQLite
    cleanup_sqlite_files()
    
    # 9. Succès final
    print(f"\n🎉 MIGRATION RÉUSSIE!")
    print("=" * 25)
    print("✅ Données migrées vers MariaDB")
    print("✅ Configuration mise à jour")
    print("✅ Application fonctionnelle")
    print("✅ Fichiers SQLite archivés")
    print("\n🚀 Démarrez l'application avec:")
    print("   python app.py")
    print("   http://localhost:5001")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            print("\n💡 ACTIONS À VÉRIFIER:")
            print("   - MariaDB est-il démarré ?")
            print("   - Les identifiants sont-ils corrects ?")
            print("   - PyMySQL est-il installé ?")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️  Migration interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 