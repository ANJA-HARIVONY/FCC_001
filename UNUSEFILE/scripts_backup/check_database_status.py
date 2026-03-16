#!/usr/bin/env python3
"""
Script de diagnostic complet de la base de données
Usage: python check_database_status.py
"""

import sys
import os
import sqlite3
from datetime import datetime

# Ajouter le répertoire actuel au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_flask_app_database():
    """Vérifier la base de données utilisée par Flask"""
    print("🔍 DIAGNOSTIC DE LA BASE DE DONNÉES FLASK")
    print("=" * 50)
    
    try:
        from app import app, db, Client, Operateur, Incident
        from config import Config
        
        print(f"📋 Configuration de base de données:")
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        with app.app_context():
            try:
                # Tester la connexion
                db.engine.execute('SELECT 1')
                print("✅ Connexion à la base de données réussie")
                
                # Vérifier les tables
                inspector = db.inspect(db.engine)
                tables = inspector.get_table_names()
                print(f"📊 Tables trouvées: {tables}")
                
                # Compter les enregistrements
                clients_count = Client.query.count()
                operateurs_count = Operateur.query.count() 
                incidents_count = Incident.query.count()
                
                print(f"\n📈 Nombre d'enregistrements:")
                print(f"   👥 Clients: {clients_count}")
                print(f"   🛠️  Opérateurs: {operateurs_count}")
                print(f"   🎫 Incidents: {incidents_count}")
                
                if clients_count == 0:
                    print("\n⚠️  PROBLÈME DÉTECTÉ: Base de données vide!")
                    return False
                else:
                    print("\n✅ Base de données contient des données")
                    
                    # Afficher quelques exemples
                    print(f"\n📋 Exemples de données:")
                    
                    if clients_count > 0:
                        client_sample = Client.query.first()
                        print(f"   👤 Premier client: {client_sample.nom}")
                    
                    if operateurs_count > 0:
                        operateur_sample = Operateur.query.first()
                        print(f"   🛠️  Premier opérateur: {operateur_sample.nom}")
                    
                    if incidents_count > 0:
                        incident_sample = Incident.query.first()
                        print(f"   🎫 Premier incident: {incident_sample.intitule}")
                    
                    return True
                
            except Exception as e:
                print(f"❌ Erreur de connexion à la base de données: {e}")
                return False
                
    except ImportError as e:
        print(f"❌ Erreur d'import des modules Flask: {e}")
        return False

def check_sqlite_files():
    """Vérifier tous les fichiers SQLite dans le projet"""
    print(f"\n🔍 RECHERCHE DES FICHIERS SQLITE")
    print("=" * 40)
    
    sqlite_files = []
    
    # Chercher dans le répertoire courant
    for file in os.listdir('.'):
        if file.endswith('.db'):
            sqlite_files.append(file)
    
    # Chercher dans le dossier instance
    if os.path.exists('instance'):
        for file in os.listdir('instance'):
            if file.endswith('.db'):
                sqlite_files.append(f"instance/{file}")
    
    print(f"📁 Fichiers SQLite trouvés: {len(sqlite_files)}")
    
    for db_file in sqlite_files:
        print(f"\n📄 Analyse de {db_file}:")
        try:
            if os.path.exists(db_file):
                size = os.path.getsize(db_file)
                print(f"   📊 Taille: {size} bytes")
                
                # Ouvrir et analyser
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # Lister les tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                print(f"   📋 Tables: {[table[0] for table in tables]}")
                
                # Compter les données dans chaque table
                for table in tables:
                    table_name = table[0]
                    if table_name != 'sqlite_sequence':  # Ignorer les tables système
                        try:
                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            count = cursor.fetchone()[0]
                            print(f"   📊 {table_name}: {count} enregistrements")
                        except:
                            print(f"   ❌ Erreur lecture {table_name}")
                
                conn.close()
            else:
                print(f"   ❌ Fichier non trouvé")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")

def check_csv_data():
    """Vérifier le fichier CSV source"""
    print(f"\n🔍 VÉRIFICATION DU FICHIER CSV")
    print("=" * 35)
    
    if os.path.exists('data.csv'):
        try:
            with open('data.csv', 'r', encoding='utf-8') as f:
                lines = f.readlines()
                print(f"✅ Fichier data.csv trouvé")
                print(f"📊 Nombre de lignes: {len(lines)}")
                print(f"📋 En-têtes: {lines[0].strip()}")
                return True
        except Exception as e:
            print(f"❌ Erreur lecture CSV: {e}")
            return False
    else:
        print(f"❌ Fichier data.csv non trouvé!")
        return False

def main():
    print("🚀 DIAGNOSTIC COMPLET DE L'APPLICATION")
    print("=" * 55)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # 1. Vérifier la base de données Flask
    db_ok = check_flask_app_database()
    
    # 2. Vérifier tous les fichiers SQLite
    check_sqlite_files()
    
    # 3. Vérifier le fichier CSV
    csv_ok = check_csv_data()
    
    # 4. Conclusions et recommandations
    print(f"\n💡 CONCLUSIONS ET RECOMMANDATIONS")
    print("=" * 40)
    
    if not db_ok:
        print("❌ PROBLÈME: Base de données vide ou inaccessible")
        
        if csv_ok:
            print("✅ SOLUTION: Re-migrer les données depuis data.csv")
            print("   Commande: python migrate_csv_to_flask.py")
        else:
            print("❌ PROBLÈME: Pas de données source disponible")
            print("   Vous devez récupérer le fichier data.csv")
    else:
        print("✅ Base de données semble correcte")
        print("🔍 Le problème pourrait être ailleurs:")
        print("   - Vérifiez les logs de l'application")
        print("   - Vérifiez les templates Flask")
        print("   - Vérifiez la configuration de l'application")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Diagnostic interrompu")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 