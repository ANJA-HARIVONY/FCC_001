#!/usr/bin/env python3
"""
Script de test pour la connexion MariaDB
"""

import os
import sys
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv('test.env')

def test_mariadb_connection():
    """Test la connexion à MariaDB avec diagnostic détaillé"""
    print("🔍 Test de connexion MariaDB")
    print("=" * 40)
    
    # Afficher la configuration
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = int(os.environ.get('DB_PORT', '3306'))
    DB_NAME = os.environ.get('DB_NAME', 'fcc_001_db')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    
    print(f"📋 Configuration:")
    print(f"   Host: {DB_HOST}")
    print(f"   Port: {DB_PORT}")
    print(f"   Database: {DB_NAME}")
    print(f"   User: {DB_USER}")
    print(f"   Password: {'***' if DB_PASSWORD else '(vide)'}")
    
    # Test 1: Import PyMySQL
    print(f"\n1. 📦 Test d'import PyMySQL...")
    try:
        import pymysql
        print(f"   ✅ PyMySQL version: {pymysql.__version__}")
    except ImportError as e:
        print(f"   ❌ PyMySQL non disponible: {e}")
        print(f"   💡 Installer avec: pip install pymysql")
        return False
    
    # Test 2: Connexion sans base de données
    print(f"\n2. 🔌 Test de connexion au serveur...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4',
            auth_plugin_map={'': 'mysql_native_password'},
            client_flag=pymysql.constants.CLIENT.PLUGIN_AUTH
        )
        print(f"   ✅ Connexion au serveur réussie")
        
        # Afficher les informations du serveur
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            print(f"   📊 Version du serveur: {version}")
            
            cursor.execute("SHOW DATABASES")
            databases = [row[0] for row in cursor.fetchall()]
            print(f"   📁 Bases disponibles: {', '.join(databases[:5])}{'...' if len(databases) > 5 else ''}")
        
        connection.close()
        
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        print(f"\n💡 Vérifications à faire:")
        print(f"   - MariaDB/MySQL est-il démarré ?")
        print(f"   - L'utilisateur '{DB_USER}' existe-t-il ?")
        print(f"   - Le mot de passe est-il correct ?")
        print(f"   - Le port {DB_PORT} est-il ouvert ?")
        return False
    
    # Test 3: Création de la base de données
    print(f"\n3. 🗄️  Test de création de base de données...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4',
            auth_plugin_map={'': 'mysql_native_password'}
        )
        
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            cursor.execute(f"USE `{DB_NAME}`")
            print(f"   ✅ Base de données '{DB_NAME}' créée/sélectionnée")
        
        connection.close()
        
    except Exception as e:
        print(f"   ❌ Erreur création base: {e}")
        return False
    
    # Test 4: Test SQLAlchemy
    print(f"\n4. 🔗 Test avec SQLAlchemy...")
    try:
        from sqlalchemy import create_engine, text
        
        # Construire l'URI de connexion
        uri = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4&sql_mode=TRADITIONAL'
        print(f"   🔗 URI: {uri.replace(DB_PASSWORD, '***' if DB_PASSWORD else '')}")
        
        engine = create_engine(uri)
        
        # Test de connexion
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 'SQLAlchemy OK' as test"))
            test_result = result.fetchone()[0]
            print(f"   ✅ SQLAlchemy: {test_result}")
        
    except Exception as e:
        print(f"   ❌ Erreur SQLAlchemy: {e}")
        return False
    
    print(f"\n" + "=" * 40)
    print(f"✅ 🎉 Tous les tests MariaDB sont passés !")
    print(f"🚀 La base de données est prête pour l'application")
    return True

if __name__ == '__main__':
    success = test_mariadb_connection()
    if not success:
        print(f"\n❌ Des erreurs ont été détectées.")
        print(f"💡 Conseils:")
        print(f"   1. Vérifiez que MariaDB/MySQL est installé et démarré")
        print(f"   2. Créez un utilisateur avec les bonnes permissions")
        print(f"   3. Modifiez les variables dans test.env si nécessaire")
        sys.exit(1)
    else:
        print(f"\n🚀 Vous pouvez maintenant démarrer l'application avec MariaDB") 