#!/usr/bin/env python3
"""
Script de vérification des prérequis pour MariaDB
Usage: python check_mariadb_setup.py
"""

import sys
import os
import subprocess
from datetime import datetime

def check_mariadb_service():
    """Vérifier si MariaDB est en cours d'exécution"""
    print("🔍 VÉRIFICATION DU SERVICE MARIADB")
    print("=" * 35)
    
    try:
        # Sur Windows, vérifier le service MySQL/MariaDB
        result = subprocess.run(['sc', 'query', 'mysql'], 
                              capture_output=True, text=True, shell=True)
        
        if result.returncode == 0 and 'RUNNING' in result.stdout:
            print("✅ Service MariaDB en cours d'exécution")
            return True
        else:
            print("❌ Service MariaDB non démarré")
            print("💡 Démarrez MariaDB avec: net start mysql")
            return False
            
    except Exception as e:
        print(f"⚠️  Impossible de vérifier le service: {e}")
        print("💡 Vérifiez manuellement que MariaDB est démarré")
        return None

def check_pymysql_installation():
    """Vérifier si PyMySQL est installé"""
    print("\n📦 VÉRIFICATION DE PYMYSQL")
    print("=" * 30)
    
    try:
        import pymysql
        print(f"✅ PyMySQL installé: version {pymysql.__version__}")
        return True
    except ImportError:
        print("❌ PyMySQL non installé")
        print("💡 Installez avec: pip install pymysql")
        return False

def check_mariadb_connection():
    """Tester la connexion à MariaDB"""
    print("\n🔗 TEST DE CONNEXION MARIADB")
    print("=" * 35)
    
    try:
        import pymysql
        
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='toor',
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        
        print(f"✅ Connexion réussie")
        print(f"📊 Version: {version}")
        print(f"🗄️  Bases existantes: {len(databases)}")
        
        # Vérifier si la base fcc_001_db existe
        db_exists = any('fcc_001_db' in db for db in databases)
        if db_exists:
            print("✅ Base de données 'fcc_001_db' déjà présente")
        else:
            print("ℹ️  Base de données 'fcc_001_db' sera créée")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print("💡 Vérifiez les identifiants (host:localhost, user:root, password:toor)")
        return False

def check_sqlite_data():
    """Vérifier les données SQLite à migrer"""
    print("\n📊 VÉRIFICATION DES DONNÉES SQLITE")
    print("=" * 35)
    
    sqlite_file = 'instance/gestion_client.db'
    
    if not os.path.exists(sqlite_file):
        print(f"❌ Fichier SQLite non trouvé: {sqlite_file}")
        print("💡 Aucune donnée à migrer")
        return False
    
    try:
        import sqlite3
        
        conn = sqlite3.connect(sqlite_file)
        cursor = conn.cursor()
        
        # Vérifier les tables et compter les enregistrements
        tables = ['client', 'operateur', 'incident']
        data_found = False
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"📋 Table '{table}': {count} enregistrements")
                if count > 0:
                    data_found = True
            except:
                print(f"⚠️  Table '{table}' non trouvée")
        
        cursor.close()
        conn.close()
        
        if data_found:
            print("✅ Données SQLite trouvées pour migration")
        else:
            print("⚠️  Aucune donnée dans SQLite")
        
        return data_found
        
    except Exception as e:
        print(f"❌ Erreur lecture SQLite: {e}")
        return False

def check_disk_space():
    """Vérifier l'espace disque disponible"""
    print("\n💾 VÉRIFICATION DE L'ESPACE DISQUE")
    print("=" * 35)
    
    try:
        import shutil
        
        total, used, free = shutil.disk_usage('.')
        free_mb = free // (1024 * 1024)
        
        print(f"💽 Espace libre: {free_mb} MB")
        
        if free_mb > 100:  # Au moins 100 MB libre
            print("✅ Espace disque suffisant")
            return True
        else:
            print("⚠️  Espace disque faible")
            return False
            
    except Exception as e:
        print(f"⚠️  Impossible de vérifier l'espace: {e}")
        return None

def show_migration_summary():
    """Afficher un résumé avant migration"""
    print("\n📋 RÉSUMÉ DE LA MIGRATION")
    print("=" * 30)
    print("🎯 Objectif: Migrer de SQLite vers MariaDB")
    print("🗄️  Source: instance/gestion_client.db")
    print("🎯 Destination: MariaDB (fcc_001_db)")
    print("⚙️  Configuration: root:toor@localhost")
    print("\n📝 Étapes de migration:")
    print("   1. Création base MariaDB")
    print("   2. Création des tables")
    print("   3. Migration des données")
    print("   4. Mise à jour configuration")
    print("   5. Test de l'application")
    print("   6. Archivage SQLite")

def main():
    print("🔍 VÉRIFICATION DES PRÉREQUIS MARIADB")
    print("=" * 40)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    all_checks_passed = True
    
    # 1. Vérifier le service MariaDB
    service_status = check_mariadb_service()
    if service_status is False:
        all_checks_passed = False
    
    # 2. Vérifier PyMySQL
    if not check_pymysql_installation():
        all_checks_passed = False
    
    # 3. Tester la connexion MariaDB
    if not check_mariadb_connection():
        all_checks_passed = False
    
    # 4. Vérifier les données SQLite
    sqlite_data = check_sqlite_data()
    
    # 5. Vérifier l'espace disque
    check_disk_space()
    
    # Résumé final
    print(f"\n{'='*40}")
    if all_checks_passed:
        print("🎉 TOUS LES PRÉREQUIS SONT SATISFAITS!")
        print("✅ Prêt pour la migration")
        
        if sqlite_data:
            show_migration_summary()
            print(f"\n🚀 ÉTAPE SUIVANTE:")
            print("   python migrate_sqlite_to_mariadb.py")
        else:
            print("\n💡 NOTE: Aucune donnée SQLite à migrer")
            print("   L'application utilisera MariaDB directement")
    else:
        print("❌ CERTAINS PRÉREQUIS MANQUENT")
        print("\n🔧 ACTIONS REQUISES:")
        if service_status is False:
            print("   - Démarrer MariaDB: net start mysql")
        if not check_pymysql_installation():
            print("   - Installer PyMySQL: pip install pymysql")
        print("\n💡 Relancez ce script après corrections")
    
    return all_checks_passed

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print(f"\n✨ Système prêt pour MariaDB!")
        else:
            print(f"\n⚠️  Corrigez les problèmes avant de continuer")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Vérification interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 