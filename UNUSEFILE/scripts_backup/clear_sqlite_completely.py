#!/usr/bin/env python3
"""
Script pour vider complètement SQLite
Usage: python clear_sqlite_completely.py
"""

import sys
import sqlite3
import os

SQLITE_DB_PATH = 'gestion_client.db'

def clear_sqlite_completely():
    """Vider complètement la base SQLite"""
    try:
        print("🗑️  Vidage COMPLET de SQLite...")
        print(f"🎯 Fichier: {SQLITE_DB_PATH}")
        
        if not os.path.exists(SQLITE_DB_PATH):
            print(f"⚠️  Fichier SQLite non trouvé: {SQLITE_DB_PATH}")
            return True
        
        connection = sqlite3.connect(SQLITE_DB_PATH)
        cursor = connection.cursor()
        
        # Désactiver les contraintes de clés étrangères
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        # Obtenir toutes les tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
        tables = cursor.fetchall()
        
        print(f"📋 Tables trouvées: {len(tables)}")
        
        # Vider chaque table
        for table_tuple in tables:
            table_name = table_tuple[0]
            try:
                # Compter d'abord
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count_before = cursor.fetchone()[0]
                
                # Vider
                cursor.execute(f"DELETE FROM {table_name}")
                
                # Vérifier
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count_after = cursor.fetchone()[0]
                
                print(f"✅ Table '{table_name}': {count_before} → {count_after} enregistrements")
                
            except Exception as e:
                print(f"❌ Erreur avec table '{table_name}': {e}")
        
        # Réinitialiser les séquences si elles existent
        try:
            cursor.execute("DELETE FROM sqlite_sequence")
            print("✅ Séquences réinitialisées")
        except sqlite3.OperationalError:
            print("💡 Pas de table sqlite_sequence")
        
        # Réactiver les contraintes
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # VACUUM pour nettoyer complètement
        cursor.execute("VACUUM")
        print("✅ Base de données compactée (VACUUM)")
        
        connection.commit()
        connection.close()
        
        print("🎉 SQLite vidée avec succès !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du vidage SQLite: {e}")
        return False

def check_sqlite_status():
    """Vérifier l'état de SQLite"""
    try:
        if not os.path.exists(SQLITE_DB_PATH):
            print("⚠️  Fichier SQLite non trouvé")
            return 0
        
        connection = sqlite3.connect(SQLITE_DB_PATH)
        cursor = connection.cursor()
        
        # Obtenir toutes les tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
        tables = cursor.fetchall()
        
        total = 0
        print("📊 État de SQLite:")
        print("-" * 30)
        
        for table_tuple in tables:
            table_name = table_tuple[0]
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                total += count
                print(f"📋 {table_name}: {count} enregistrements")
            except Exception as e:
                print(f"❌ Erreur avec {table_name}: {e}")
        
        print(f"📈 Total: {total} enregistrements")
        connection.close()
        return total
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification SQLite: {e}")
        return -1

def main():
    """Fonction principale"""
    print("🧹 VIDAGE COMPLET SQLite")
    print("=" * 30)
    
    # État avant
    print("📊 État AVANT vidage:")
    total_before = check_sqlite_status()
    
    if total_before == 0:
        print("\n💡 SQLite est déjà vide !")
        return True
    elif total_before == -1:
        print("\n❌ Impossible de vérifier SQLite")
        return False
    
    print(f"\n🎯 VIDAGE EN COURS...")
    print("=" * 25)
    
    # Vider
    success = clear_sqlite_completely()
    
    # État après
    print(f"\n📊 État APRÈS vidage:")
    total_after = check_sqlite_status()
    
    # Résumé
    print("\n" + "=" * 30)
    if success and total_after == 0:
        print("🎉 SUCCÈS COMPLET !")
        print(f"✅ SQLite: {total_before} → {total_after} enregistrements")
        print("\n📋 Prochaines étapes:")
        print("1. Tester l'application: python app.py")
        print("2. L'application devrait maintenant être vide")
        print("3. Optionnel: Migrer vers MariaDB avec python migrate_to_mariadb.py")
    else:
        print("❌ Le vidage n'est pas complet !")
        if total_after > 0:
            print(f"⚠️  Il reste encore {total_after} enregistrements")
    
    return success and total_after == 0

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