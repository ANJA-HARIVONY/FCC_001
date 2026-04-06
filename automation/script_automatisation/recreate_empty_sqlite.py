#!/usr/bin/env python3
"""
Script pour recréer une base SQLite complètement vide
Usage: python recreate_empty_sqlite.py
"""

import sys
import sqlite3
import os
from datetime import datetime

SQLITE_DB_PATH = 'gestion_client.db'

def backup_current_db():
    """Créer une sauvegarde du fichier SQLite actuel"""
    try:
        if os.path.exists(SQLITE_DB_PATH):
            backup_name = f"gestion_client_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            os.rename(SQLITE_DB_PATH, backup_name)
            print(f"💾 Sauvegarde créée: {backup_name}")
            return backup_name
        else:
            print("⚠️  Aucun fichier SQLite à sauvegarder")
            return None
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde: {e}")
        return None

def create_empty_database():
    """Créer une nouvelle base SQLite vide avec la structure"""
    try:
        print("🏗️  Création d'une nouvelle base SQLite vide...")
        
        # Supprimer le fichier s'il existe encore
        if os.path.exists(SQLITE_DB_PATH):
            os.remove(SQLITE_DB_PATH)
        
        # Créer une nouvelle base
        connection = sqlite3.connect(SQLITE_DB_PATH)
        cursor = connection.cursor()
        
        # Créer la structure des tables (copié de votre modèle Flask)
        print("📋 Création de la table 'client'...")
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
        
        print("👥 Création de la table 'operateur'...")
        cursor.execute("""
            CREATE TABLE operateur (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR(100) NOT NULL,
                telephone VARCHAR(20) NOT NULL
            )
        """)
        
        print("🎫 Création de la table 'incident'...")
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
        
        # Créer la table alembic_version si nécessaire (pour les migrations Flask)
        print("⚙️  Création de la table 'alembic_version'...")
        cursor.execute("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) PRIMARY KEY
            )
        """)
        
        connection.commit()
        connection.close()
        
        print("✅ Base SQLite vide créée avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
        return False

def verify_empty_database():
    """Vérifier que la nouvelle base est bien vide"""
    try:
        print("🔍 Vérification de la nouvelle base...")
        
        connection = sqlite3.connect(SQLITE_DB_PATH)
        cursor = connection.cursor()
        
        # Vérifier les tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"📋 Tables créées: {len(tables)}")
        for table_tuple in tables:
            table_name = table_tuple[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"  📊 {table_name}: {count} enregistrements")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return False

def main():
    """Fonction principale"""
    print("🔄 RECRÉATION COMPLÈTE SQLite")
    print("=" * 35)
    
    print("📊 État avant recréation:")
    if os.path.exists(SQLITE_DB_PATH):
        try:
            connection = sqlite3.connect(SQLITE_DB_PATH)
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM client")
            clients = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM operateur")
            operateurs = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM incident")
            incidents = cursor.fetchone()[0]
            total = clients + operateurs + incidents
            print(f"📈 Total actuel: {total} enregistrements")
            connection.close()
        except Exception as e:
            print(f"❌ Impossible de lire la base actuelle: {e}")
    else:
        print("⚠️  Aucun fichier SQLite existant")
    
    print(f"\n🎯 RECRÉATION EN COURS...")
    print("=" * 25)
    
    # Étape 1: Sauvegarde
    backup_file = backup_current_db()
    
    # Étape 2: Créer nouvelle base vide
    if create_empty_database():
        # Étape 3: Vérifier
        verify_empty_database()
        
        print("\n" + "=" * 35)
        print("🎉 RECRÉATION TERMINÉE !")
        
        if backup_file:
            print(f"💾 Ancienne base sauvegardée: {backup_file}")
        
        print("✅ Nouvelle base SQLite créée et vide")
        print("\n📋 Prochaines étapes:")
        print("1. Tester l'application: python app.py")
        print("2. L'application devrait maintenant être vide")
        print("3. Optionnel: Migrer vers MariaDB")
        
        return True
    else:
        print("\n❌ Échec de la recréation")
        return False

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