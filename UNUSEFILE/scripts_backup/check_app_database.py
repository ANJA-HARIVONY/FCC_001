#!/usr/bin/env python3
"""
Script pour vérifier quelle base de données l'application Flask utilise
Usage: python check_app_database.py
"""

import sys
import os
import sqlite3
import pymysql

# Ajouter le répertoire actuel au path pour importer les modules Flask
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_config():
    """Vérifier la configuration Flask"""
    try:
        print("📋 Vérification de la configuration Flask...")
        
        from config import Config
        
        db_uri = Config.SQLALCHEMY_DATABASE_URI
        print(f"🔗 SQLALCHEMY_DATABASE_URI: {db_uri}")
        
        if 'mysql' in db_uri or 'mariadb' in db_uri:
            return 'mariadb', db_uri
        elif 'sqlite' in db_uri:
            return 'sqlite', db_uri
        else:
            return 'unknown', db_uri
            
    except Exception as e:
        print(f"❌ Erreur lors de la lecture de la config: {e}")
        return None, None

def check_flask_app_data():
    """Vérifier les données via l'application Flask"""
    try:
        print("🔍 Vérification via l'application Flask...")
        
        # Importer et configurer l'app Flask
        from app import app, db, Client, Operateur, Incident
        
        with app.app_context():
            print(f"🔗 Base de données utilisée: {db.engine.url}")
            
            # Compter les enregistrements
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count()
            incidents_count = Incident.query.count()
            
            print(f"📊 Données dans l'application:")
            print(f"  👥 Clients: {clients_count}")
            print(f"  🛠️  Opérateurs: {operateurs_count}")
            print(f"  🎫 Incidents: {incidents_count}")
            print(f"  📈 Total: {clients_count + operateurs_count + incidents_count}")
            
            # Si il y a des données, afficher les 3 premiers de chaque
            if clients_count > 0:
                print(f"\n📋 Premiers clients:")
                clients = Client.query.limit(3).all()
                for client in clients:
                    print(f"  - {client.id}: {client.nom}")
            
            if operateurs_count > 0:
                print(f"\n👥 Premiers opérateurs:")
                operateurs = Operateur.query.limit(3).all()
                for operateur in operateurs:
                    print(f"  - {operateur.id}: {operateur.nom}")
            
            if incidents_count > 0:
                print(f"\n🎫 Premiers incidents:")
                incidents = Incident.query.limit(3).all()
                for incident in incidents:
                    print(f"  - {incident.id}: {incident.intitule}")
            
            return clients_count + operateurs_count + incidents_count
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification Flask: {e}")
        import traceback
        traceback.print_exc()
        return -1

def check_direct_mariadb():
    """Vérifier MariaDB directement"""
    try:
        print("\n🔍 Vérification directe MariaDB...")
        
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='toor',
            database='fcc_001_db',
            charset='utf8mb4'
        )
        
        total = 0
        with connection.cursor() as cursor:
            for table in ['client', 'operateur', 'incident']:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                total += count
                print(f"  📊 MariaDB {table}: {count}")
        
        connection.close()
        print(f"  📈 Total MariaDB: {total}")
        return total
        
    except Exception as e:
        print(f"❌ Erreur MariaDB: {e}")
        return -1

def check_direct_sqlite():
    """Vérifier SQLite directement"""
    try:
        print("\n🔍 Vérification directe SQLite...")
        
        if not os.path.exists('gestion_client.db'):
            print("  ⚠️  Fichier SQLite non trouvé")
            return 0
        
        connection = sqlite3.connect('gestion_client.db')
        cursor = connection.cursor()
        
        total = 0
        for table in ['client', 'operateur', 'incident']:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                total += count
                print(f"  📊 SQLite {table}: {count}")
            except sqlite3.OperationalError:
                print(f"  ⚠️  SQLite {table}: table inexistante")
        
        connection.close()
        print(f"  📈 Total SQLite: {total}")
        return total
        
    except Exception as e:
        print(f"❌ Erreur SQLite: {e}")
        return -1

def main():
    """Fonction principale de diagnostic"""
    print("🔍 DIAGNOSTIC APPLICATION FLASK")
    print("=" * 40)
    
    # 1. Vérifier la configuration
    db_type, db_uri = check_config()
    if db_type:
        print(f"⚙️  Configuration: {db_type.upper()}")
    
    # 2. Vérifier les données directement
    mariadb_total = check_direct_mariadb()
    sqlite_total = check_direct_sqlite()
    
    # 3. Vérifier via Flask
    print(f"\n{'='*40}")
    flask_total = check_flask_app_data()
    
    # 4. Analyse
    print(f"\n{'='*40}")
    print("📊 RÉSUMÉ DU DIAGNOSTIC:")
    print("-" * 25)
    print(f"🔧 Configuration: {db_type} ({db_uri[:50]}...)")
    print(f"💾 MariaDB direct: {mariadb_total} enregistrements")
    print(f"💾 SQLite direct: {sqlite_total} enregistrements")
    print(f"🌐 Flask app: {flask_total} enregistrements")
    
    # 5. Diagnostic
    print(f"\n🔍 DIAGNOSTIC:")
    if flask_total > 0:
        if db_type == 'mariadb' and mariadb_total == 0:
            print("❌ PROBLÈME: L'app affiche des données mais MariaDB est vide!")
            print("💡 Solutions possibles:")
            print("   1. L'app utilise SQLite au lieu de MariaDB")
            print("   2. Cache dans l'application")
            print("   3. Données hardcodées")
        elif db_type == 'sqlite' and sqlite_total == 0:
            print("❌ PROBLÈME: L'app affiche des données mais SQLite est vide!")
            print("💡 L'app pourrait utiliser des données en cache ou hardcodées")
        else:
            print("✅ Cohérent: L'app affiche des données de la base configurée")
    else:
        print("✅ L'application n'affiche aucune donnée (bases vides)")
    
    return flask_total == 0

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Diagnostic interrompu")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 