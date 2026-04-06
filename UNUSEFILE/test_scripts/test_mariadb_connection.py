#!/usr/bin/env python3
"""
Script de test de connexion MariaDB
Usage: python test_mariadb_connection.py
"""

import sys

# Configuration de la base de données MariaDB
MARIADB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'toor',
    'database': 'fcc_001_db',
    'charset': 'utf8mb4'
}

def test_pymysql_import():
    """Test d'importation de PyMySQL"""
    try:
        import pymysql
        print("✅ PyMySQL disponible")
        return True
    except ImportError:
        print("❌ PyMySQL non disponible")
        print("💡 Installation requise: pip install PyMySQL")
        return False

def test_mariadb_server():
    """Test de connexion au serveur MariaDB"""
    try:
        import pymysql
        
        print("🔍 Test de connexion au serveur MariaDB...")
        connection = pymysql.connect(
            host=MARIADB_CONFIG['host'],
            user=MARIADB_CONFIG['user'],
            password=MARIADB_CONFIG['password'],
            charset=MARIADB_CONFIG['charset']
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ Connexion serveur réussie - Version: {version[0]}")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion serveur: {e}")
        return False

def test_database_access():
    """Test d'accès à la base de données spécifique"""
    try:
        import pymysql
        
        print(f"🔍 Test d'accès à la base de données '{MARIADB_CONFIG['database']}'...")
        
        # Test avec la base de données spécifique
        try:
            connection = pymysql.connect(**MARIADB_CONFIG)
            print(f"✅ Accès à la base de données '{MARIADB_CONFIG['database']}' réussi")
            connection.close()
            return True
        except pymysql.err.OperationalError as e:
            if "Unknown database" in str(e):
                print(f"⚠️  Base de données '{MARIADB_CONFIG['database']}' n'existe pas encore")
                print("💡 Elle sera créée lors de la migration")
                return True
            else:
                raise e
                
    except Exception as e:
        print(f"❌ Erreur d'accès à la base de données: {e}")
        return False

def test_create_database():
    """Test de création de base de données"""
    try:
        import pymysql
        
        print("🔍 Test de création de base de données...")
        
        connection = pymysql.connect(
            host=MARIADB_CONFIG['host'],
            user=MARIADB_CONFIG['user'],
            password=MARIADB_CONFIG['password'],
            charset=MARIADB_CONFIG['charset']
        )
        
        with connection.cursor() as cursor:
            # Test de création d'une base de données temporaire
            test_db = "test_migration_fcc"
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {test_db}")
            cursor.execute(f"DROP DATABASE {test_db}")
            print("✅ Permissions de création/suppression de base de données confirmées")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur lors du test de création de base de données: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🧪 Test de connexion MariaDB")
    print("=" * 40)
    print(f"Configuration:")
    print(f"  Host: {MARIADB_CONFIG['host']}")
    print(f"  User: {MARIADB_CONFIG['user']}")
    print(f"  Database: {MARIADB_CONFIG['database']}")
    print("=" * 40)
    
    tests = [
        ("PyMySQL Import", test_pymysql_import),
        ("Connexion Serveur", test_mariadb_server),
        ("Accès Base de Données", test_database_access),
        ("Permissions Création", test_create_database),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erreur inattendue dans {test_name}: {e}")
            results.append((test_name, False))
    
    # Résumé
    print("\n" + "=" * 40)
    print("📊 Résumé des tests:")
    
    all_passed = True
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 40)
    if all_passed:
        print("🎉 Tous les tests sont passés !")
        print("✅ Vous pouvez lancer la migration avec: python migrate_to_mariadb.py")
    else:
        print("⚠️  Certains tests ont échoué")
        print("💡 Vérifiez la configuration MariaDB avant de continuer")
        print("\n🔧 Vérifications suggérées:")
        print("1. MariaDB est-il démarré ?")
        print("2. Les credentials sont-ils corrects ?")
        print("3. PyMySQL est-il installé ? (pip install PyMySQL)")
        print("4. L'utilisateur a-t-il les permissions nécessaires ?")
    
    return all_passed

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        sys.exit(1) 