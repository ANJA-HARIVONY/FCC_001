#!/usr/bin/env python3
"""
Script rapide pour vider la base de données MariaDB (sans confirmation)
Usage: python clear_mariadb_quick.py
"""

import sys
import pymysql
from datetime import datetime

# Configuration de la base de données MariaDB
MARIADB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'toor',
    'database': 'fcc_001_db',
    'charset': 'utf8mb4'
}

def clear_tables():
    """Vider toutes les tables rapidement"""
    try:
        print("🗑️  Vidage rapide de la base de données MariaDB...")
        print(f"🎯 Base de données: {MARIADB_CONFIG['database']}")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            # Désactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Vider les tables dans l'ordre
            tables = ['incident', 'operateur', 'client']
            
            for table in tables:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table}")
                    print(f"✅ Table '{table}' vidée")
                except pymysql.err.ProgrammingError as e:
                    if "doesn't exist" in str(e):
                        print(f"⚠️  Table '{table}' n'existe pas")
                    else:
                        print(f"❌ Erreur avec table '{table}': {e}")
            
            # Réactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            connection.commit()
        
        connection.close()
        print("🎉 Base de données vidée avec succès !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du vidage: {e}")
        return False

def main():
    """Fonction principale"""
    print("⚡ Vidage Rapide - Base de Données MariaDB")
    print("=" * 45)
    
    success = clear_tables()
    
    if success:
        print("\n📋 Prochaines étapes possibles:")
        print("1. Migrer depuis SQLite: python migrate_to_mariadb.py")
        print("2. Lancer l'application: python app.py")
        print("3. Importer de nouvelles données")
    
    return success

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