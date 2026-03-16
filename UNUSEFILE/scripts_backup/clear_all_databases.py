#!/usr/bin/env python3
"""
Script pour vider TOUTES les bases de données (SQLite ET MariaDB)
Usage: python clear_all_databases.py
"""

import sys
import sqlite3
import pymysql
import os

# Configuration MariaDB
MARIADB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'toor',
    'database': 'fcc_001_db',
    'charset': 'utf8mb4'
}

SQLITE_DB_PATH = 'gestion_client.db'

def clear_sqlite():
    """Vider la base de données SQLite"""
    try:
        print("🗑️  Vidage de SQLite...")
        
        if not os.path.exists(SQLITE_DB_PATH):
            print(f"⚠️  Fichier SQLite non trouvé: {SQLITE_DB_PATH}")
            return True
        
        connection = sqlite3.connect(SQLITE_DB_PATH)
        cursor = connection.cursor()
        
        # Obtenir la liste des tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("💡 SQLite est déjà vide")
            connection.close()
            return True
        
        # Vider chaque table
        for table_tuple in tables:
            table_name = table_tuple[0]
            if table_name != 'sqlite_sequence':  # Table système
                cursor.execute(f"DELETE FROM {table_name}")
                print(f"✅ Table SQLite '{table_name}' vidée")
        
        # Réinitialiser les séquences
        cursor.execute("DELETE FROM sqlite_sequence")
        
        connection.commit()
        connection.close()
        print("✅ SQLite vidée avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du vidage SQLite: {e}")
        return False

def clear_mariadb():
    """Vider la base de données MariaDB"""
    try:
        print("🗑️  Vidage de MariaDB...")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            # Désactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Vider les tables
            tables = ['incident', 'operateur', 'client']
            
            for table in tables:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table}")
                    print(f"✅ Table MariaDB '{table}' vidée")
                except pymysql.err.ProgrammingError as e:
                    if "doesn't exist" in str(e):
                        print(f"⚠️  Table MariaDB '{table}' n'existe pas")
                    else:
                        print(f"❌ Erreur avec table '{table}': {e}")
            
            # Réactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            connection.commit()
        
        connection.close()
        print("✅ MariaDB vidée avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du vidage MariaDB: {e}")
        return False

def check_databases_status():
    """Vérifier l'état des deux bases de données"""
    print("📊 État des bases de données:")
    print("-" * 40)
    
    # Vérifier SQLite
    try:
        if os.path.exists(SQLITE_DB_PATH):
            connection = sqlite3.connect(SQLITE_DB_PATH)
            cursor = connection.cursor()
            
            total_sqlite = 0
            for table in ['client', 'operateur', 'incident']:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    total_sqlite += count
                    print(f"📋 SQLite {table}: {count} enregistrements")
                except sqlite3.OperationalError:
                    print(f"⚠️  SQLite {table}: table inexistante")
            
            connection.close()
            print(f"📈 Total SQLite: {total_sqlite} enregistrements")
        else:
            print("⚠️  Fichier SQLite non trouvé")
            total_sqlite = 0
    except Exception as e:
        print(f"❌ Erreur SQLite: {e}")
        total_sqlite = 0
    
    print("-" * 40)
    
    # Vérifier MariaDB
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        total_mariadb = 0
        with connection.cursor() as cursor:
            for table in ['client', 'operateur', 'incident']:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    total_mariadb += count
                    print(f"📋 MariaDB {table}: {count} enregistrements")
                except pymysql.err.ProgrammingError:
                    print(f"⚠️  MariaDB {table}: table inexistante")
        
        connection.close()
        print(f"📈 Total MariaDB: {total_mariadb} enregistrements")
    except Exception as e:
        print(f"❌ Erreur MariaDB: {e}")
        total_mariadb = 0
    
    print("-" * 40)
    return total_sqlite, total_mariadb

def main():
    """Fonction principale"""
    print("🧹 VIDAGE COMPLET - SQLite ET MariaDB")
    print("=" * 50)
    
    # État initial
    print("📊 État AVANT vidage:")
    sqlite_before, mariadb_before = check_databases_status()
    
    if sqlite_before == 0 and mariadb_before == 0:
        print("\n💡 Toutes les bases sont déjà vides !")
        return True
    
    print(f"\n🎯 VIDAGE EN COURS...")
    print("=" * 30)
    
    # Vider SQLite
    sqlite_success = clear_sqlite()
    
    # Vider MariaDB
    mariadb_success = clear_mariadb()
    
    # État final
    print(f"\n📊 État APRÈS vidage:")
    sqlite_after, mariadb_after = check_databases_status()
    
    # Résumé
    print("\n" + "=" * 50)
    if sqlite_success and mariadb_success:
        print("🎉 VIDAGE COMPLET TERMINÉ !")
        print(f"✅ SQLite: {sqlite_before} → {sqlite_after} enregistrements")
        print(f"✅ MariaDB: {mariadb_before} → {mariadb_after} enregistrements")
        
        if sqlite_after == 0 and mariadb_after == 0:
            print("\n🎯 SUCCÈS: Toutes les bases sont maintenant vides !")
        else:
            print("\n⚠️  ATTENTION: Il reste encore des données !")
            
        print(f"\n📋 Prochaines étapes:")
        print("1. Tester l'application: python app.py")
        print("2. Migrer depuis SQLite: python migrate_to_mariadb.py")
        print("3. Vérifier que l'application utilise bien MariaDB")
    else:
        print("❌ Certaines opérations ont échoué")
    
    return sqlite_success and mariadb_success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Opération interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 