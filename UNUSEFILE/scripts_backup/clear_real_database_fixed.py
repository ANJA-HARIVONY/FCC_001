#!/usr/bin/env python3
"""
Script pour vider la VRAIE base de données utilisée par Flask (version corrigée)
Usage: python clear_real_database_fixed.py
"""

import sys
import os
import sqlite3
from datetime import datetime

# Le fichier de base de données que Flask utilise réellement
REAL_SQLITE_PATH = 'instance/gestion_client.db'

def backup_real_db():
    """Créer une sauvegarde de la vraie base SQLite"""
    try:
        if os.path.exists(REAL_SQLITE_PATH):
            backup_name = f"instance/gestion_client_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            
            # Créer le dossier instance s'il n'existe pas
            os.makedirs('instance', exist_ok=True)
            
            # Copier le fichier
            import shutil
            shutil.copy2(REAL_SQLITE_PATH, backup_name)
            print(f"💾 Sauvegarde créée: {backup_name}")
            return backup_name
        else:
            print(f"⚠️  Fichier non trouvé: {REAL_SQLITE_PATH}")
            return None
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")
        return None

def check_real_db_content():
    """Vérifier le contenu de la vraie base"""
    try:
        if not os.path.exists(REAL_SQLITE_PATH):
            print(f"⚠️  Fichier non trouvé: {REAL_SQLITE_PATH}")
            return 0, 0, 0
        
        connection = sqlite3.connect(REAL_SQLITE_PATH)
        cursor = connection.cursor()
        
        # Compter les enregistrements
        cursor.execute("SELECT COUNT(*) FROM client")
        clients = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM operateur")
        operateurs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM incident")
        incidents = cursor.fetchone()[0]
        
        print(f"📊 Contenu de la vraie base:")
        print(f"  👥 Clients: {clients}")
        print(f"  🛠️  Opérateurs: {operateurs}")
        print(f"  🎫 Incidents: {incidents}")
        print(f"  📈 Total: {clients + operateurs + incidents}")
        
        connection.close()
        return clients, operateurs, incidents
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return 0, 0, 0

def clear_real_database():
    """Vider complètement la vraie base de données"""
    try:
        print(f"🗑️  Vidage de {REAL_SQLITE_PATH}...")
        
        if not os.path.exists(REAL_SQLITE_PATH):
            print(f"⚠️  Fichier non trouvé: {REAL_SQLITE_PATH}")
            return True
        
        connection = sqlite3.connect(REAL_SQLITE_PATH)
        cursor = connection.cursor()
        
        # Désactiver les contraintes de clés étrangères
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        # Vider les tables principales
        tables = ['incident', 'operateur', 'client']
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                before = cursor.fetchone()[0]
                
                cursor.execute(f"DELETE FROM {table}")
                
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                after = cursor.fetchone()[0]
                
                print(f"✅ Table '{table}': {before} → {after} enregistrements")
                
            except sqlite3.OperationalError as e:
                print(f"❌ Erreur avec '{table}': {e}")
        
        # Réinitialiser les séquences
        try:
            cursor.execute("DELETE FROM sqlite_sequence")
            print("✅ Séquences réinitialisées")
        except sqlite3.OperationalError:
            print("💡 Pas de séquences à réinitialiser")
        
        # Réactiver les contraintes
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Commit et fermer avant VACUUM
        connection.commit()
        connection.close()
        
        # Rouvrir pour VACUUM (doit être hors transaction)
        print("🔧 Compactage de la base...")
        connection = sqlite3.connect(REAL_SQLITE_PATH)
        connection.execute("VACUUM")
        connection.close()
        print("✅ Base compactée")
        
        print("🎉 Vraie base de données vidée !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def delete_and_recreate():
    """Alternative: supprimer et recréer le fichier"""
    try:
        print("🔄 Suppression et recréation du fichier...")
        
        # Supprimer le fichier existant
        if os.path.exists(REAL_SQLITE_PATH):
            os.remove(REAL_SQLITE_PATH)
            print(f"🗑️  Fichier supprimé: {REAL_SQLITE_PATH}")
        
        # Créer le dossier si nécessaire
        os.makedirs('instance', exist_ok=True)
        
        # Créer une nouvelle base vide avec la structure
        connection = sqlite3.connect(REAL_SQLITE_PATH)
        cursor = connection.cursor()
        
        # Recréer les tables
        print("📋 Recréation des tables...")
        
        cursor.execute("""
            CREATE TABLE client (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(100) NOT NULL,
                adresse VARCHAR(200) NOT NULL,
                ville VARCHAR(100) NOT NULL,
                ip_router VARCHAR(50),
                ip_antea VARCHAR(50)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE operateur (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(20) NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE incident (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_client INTEGER NOT NULL,
                intitule VARCHAR(200) NOT NULL,
                observations TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
                id_operateur INTEGER NOT NULL,
                date_heure DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_client) REFERENCES client(id),
                FOREIGN KEY (id_operateur) REFERENCES operateur(id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) PRIMARY KEY
            )
        """)
        
        connection.commit()
        connection.close()
        
        print("✅ Nouvelle base vide créée")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la recréation: {e}")
        return False

def main():
    """Fonction principale"""
    print("🎯 VIDAGE DE LA VRAIE BASE FLASK")
    print("=" * 40)
    print(f"📂 Fichier cible: {REAL_SQLITE_PATH}")
    
    # État avant
    print("\n📊 État AVANT vidage:")
    clients_before, operateurs_before, incidents_before = check_real_db_content()
    total_before = clients_before + operateurs_before + incidents_before
    
    if total_before == 0:
        print("\n💡 La vraie base est déjà vide !")
        return True
    
    # Sauvegarde
    print(f"\n💾 Création de la sauvegarde...")
    backup_file = backup_real_db()
    
    # Méthode 1: Tentative de vidage
    print(f"\n🗑️  MÉTHODE 1: Vidage...")
    print("=" * 25)
    success = clear_real_database()
    
    # Vérifier le résultat
    clients_after, operateurs_after, incidents_after = check_real_db_content()
    total_after = clients_after + operateurs_after + incidents_after
    
    # Si échec, essayer la méthode 2
    if not success or total_after > 0:
        print(f"\n🔄 MÉTHODE 2: Recréation...")
        print("=" * 25)
        success = delete_and_recreate()
        
        # Vérifier à nouveau
        clients_after, operateurs_after, incidents_after = check_real_db_content()
        total_after = clients_after + operateurs_after + incidents_after
    
    # Résumé final
    print(f"\n{'='*40}")
    if success and total_after == 0:
        print("🎉 SUCCÈS COMPLET !")
        print(f"✅ Clients: {clients_before} → {clients_after}")
        print(f"✅ Opérateurs: {operateurs_before} → {operateurs_after}")
        print(f"✅ Incidents: {incidents_before} → {incidents_after}")
        
        if backup_file:
            print(f"💾 Sauvegarde: {backup_file}")
        
        print(f"\n📋 Prochaines étapes:")
        print("1. Redémarrer l'application: python app.py")
        print("2. L'application devrait maintenant être vide !")
        print("3. Optionnel: Migrer vers MariaDB")
    else:
        print("❌ Le vidage a échoué")
        if total_after > 0:
            print(f"⚠️  Il reste {total_after} enregistrements")
    
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
        import traceback
        traceback.print_exc()
        sys.exit(1) 