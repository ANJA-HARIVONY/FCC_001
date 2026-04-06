#!/usr/bin/env python3
"""
Script pour vider la base de données MariaDB
Usage: python clear_mariadb.py
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

def test_connection():
    """Test de la connexion avant de procéder"""
    try:
        print("🔍 Test de connexion à MariaDB...")
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ Connexion réussie - Version: {version[0]}")
        
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def get_table_counts():
    """Obtenir le nombre d'enregistrements dans chaque table"""
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        counts = {}
        
        with connection.cursor() as cursor:
            # Vérifier si les tables existent
            tables = ['client', 'operateur', 'incident']
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    counts[table] = cursor.fetchone()[0]
                except pymysql.err.ProgrammingError:
                    counts[table] = "n/a (table inexistante)"
        
        connection.close()
        return counts
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des tables: {e}")
        return {}

def create_backup():
    """Créer une sauvegarde avant vidage"""
    try:
        print("💾 Création d'une sauvegarde avant vidage...")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        backup_data = {}
        
        with connection.cursor() as cursor:
            tables = ['client', 'operateur', 'incident']
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT * FROM {table}")
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    
                    backup_data[table] = {
                        'columns': columns,
                        'data': rows
                    }
                except pymysql.err.ProgrammingError:
                    backup_data[table] = None
        
        connection.close()
        
        # Sauvegarder en JSON
        import json
        backup_file = f"mariadb_backup_before_clear_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Convertir les données en format JSON-serializable
        json_data = {}
        for table, content in backup_data.items():
            if content:
                json_data[table] = {
                    'columns': content['columns'],
                    'data': [list(row) for row in content['data']]
                }
            else:
                json_data[table] = None
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"✅ Sauvegarde créée: {backup_file}")
        return backup_file
        
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")
        return None

def clear_database():
    """Vider toutes les tables de la base de données"""
    try:
        print("🗑️  Vidage de la base de données...")
        
        connection = pymysql.connect(**MARIADB_CONFIG)
        
        with connection.cursor() as cursor:
            # Désactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Vider les tables dans l'ordre (à cause des clés étrangères)
            tables_to_clear = ['incident', 'operateur', 'client']
            
            for table in tables_to_clear:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table}")
                    print(f"✅ Table '{table}' vidée")
                except pymysql.err.ProgrammingError as e:
                    if "doesn't exist" in str(e):
                        print(f"⚠️  Table '{table}' n'existe pas")
                    else:
                        raise e
            
            # Réactiver les vérifications de clés étrangères
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            connection.commit()
        
        connection.close()
        print("✅ Base de données vidée avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du vidage: {e}")
        return False

def drop_database():
    """Supprimer complètement la base de données"""
    try:
        print(f"🗑️  Suppression de la base de données '{MARIADB_CONFIG['database']}'...")
        
        # Connexion sans spécifier la base de données
        connection = pymysql.connect(
            host=MARIADB_CONFIG['host'],
            user=MARIADB_CONFIG['user'],
            password=MARIADB_CONFIG['password'],
            charset=MARIADB_CONFIG['charset']
        )
        
        with connection.cursor() as cursor:
            cursor.execute(f"DROP DATABASE IF EXISTS {MARIADB_CONFIG['database']}")
            print(f"✅ Base de données '{MARIADB_CONFIG['database']}' supprimée")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la suppression de la base de données: {e}")
        return False

def main():
    """Fonction principale"""
    print("🗑️  Vidage de la Base de Données MariaDB")
    print("=" * 50)
    print(f"Base de données: {MARIADB_CONFIG['database']}")
    print(f"Serveur: {MARIADB_CONFIG['host']}")
    print("=" * 50)
    
    # Test de connexion
    if not test_connection():
        print("❌ Impossible de se connecter à MariaDB")
        return False
    
    # Obtenir les statistiques actuelles
    print("\n📊 État actuel de la base de données:")
    counts = get_table_counts()
    total_records = 0
    
    for table, count in counts.items():
        if isinstance(count, int):
            total_records += count
            print(f"  📋 {table}: {count} enregistrements")
        else:
            print(f"  ⚠️  {table}: {count}")
    
    if total_records == 0:
        print("\n💡 La base de données est déjà vide !")
        return True
    
    print(f"\n📈 Total: {total_records} enregistrements")
    
    # Choix du type de vidage
    print(f"\n❓ Que voulez-vous faire ?")
    print("1. Vider les tables (garder la structure)")
    print("2. Supprimer complètement la base de données")
    print("3. Annuler")
    
    while True:
        choice = input("\nVotre choix (1/2/3): ").strip()
        if choice in ['1', '2', '3']:
            break
        print("⚠️  Veuillez choisir 1, 2 ou 3")
    
    if choice == '3':
        print("⚠️  Opération annulée")
        return True
    
    # Confirmation de sécurité
    print(f"\n⚠️  ATTENTION: Cette opération est IRRÉVERSIBLE !")
    if choice == '1':
        print("📝 Action: Vider toutes les tables (structure conservée)")
    else:
        print("📝 Action: Supprimer complètement la base de données")
    
    print(f"🎯 Cible: {MARIADB_CONFIG['database']} ({total_records} enregistrements)")
    
    confirmation = input("\n❓ Tapez 'CONFIRMER' pour continuer: ").strip()
    if confirmation != 'CONFIRMER':
        print("⚠️  Opération annulée")
        return True
    
    # Créer une sauvegarde
    backup_file = create_backup()
    if not backup_file:
        print("❌ Impossible de créer une sauvegarde. Arrêt pour sécurité.")
        return False
    
    # Exécuter l'opération
    if choice == '1':
        success = clear_database()
    else:
        success = drop_database()
    
    if success:
        print(f"\n🎉 Opération terminée avec succès !")
        print(f"💾 Sauvegarde disponible: {backup_file}")
        
        if choice == '1':
            print(f"\n📋 Prochaines étapes:")
            print("1. La structure des tables est conservée")
            print("2. Vous pouvez relancer une migration: python migrate_to_mariadb.py")
            print("3. Ou importer de nouvelles données")
        else:
            print(f"\n📋 Prochaines étapes:")
            print("1. La base de données a été supprimée")
            print("2. Pour recréer: python migrate_to_mariadb.py")
            print("3. Ou créer manuellement la base de données")
    
    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Opération interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        sys.exit(1) 