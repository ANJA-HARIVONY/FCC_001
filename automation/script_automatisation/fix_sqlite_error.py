#!/usr/bin/env python3
"""
Script pour corriger l'erreur SQLite "unable to open database file"
Usage: python fix_sqlite_error.py
"""

import sys
import os
import sqlite3
import shutil
from datetime import datetime

def check_permissions_and_paths():
    """Vérifier les permissions et chemins"""
    print("🔍 DIAGNOSTIC DES PERMISSIONS ET CHEMINS")
    print("=" * 45)
    
    # Vérifier le répertoire courant
    current_dir = os.getcwd()
    print(f"📁 Répertoire courant: {current_dir}")
    
    # Vérifier le dossier instance
    instance_dir = os.path.join(current_dir, 'instance')
    print(f"📁 Dossier instance: {instance_dir}")
    
    if not os.path.exists(instance_dir):
        print("❌ Le dossier 'instance' n'existe pas")
        try:
            os.makedirs(instance_dir)
            print("✅ Dossier 'instance' créé")
        except Exception as e:
            print(f"❌ Erreur création dossier: {e}")
            return False
    else:
        print("✅ Dossier 'instance' existe")
    
    # Vérifier les permissions du dossier instance
    if os.access(instance_dir, os.W_OK):
        print("✅ Permissions d'écriture sur 'instance': OK")
    else:
        print("❌ Pas de permissions d'écriture sur 'instance'")
        return False
    
    # Vérifier le fichier de base de données
    db_file = os.path.join(instance_dir, 'gestion_client.db')
    print(f"📄 Fichier DB: {db_file}")
    
    if os.path.exists(db_file):
        print("✅ Fichier de base de données existe")
        print(f"📊 Taille: {os.path.getsize(db_file)} bytes")
        
        if os.access(db_file, os.R_OK):
            print("✅ Permissions de lecture: OK")
        else:
            print("❌ Pas de permissions de lecture")
            return False
            
        if os.access(db_file, os.W_OK):
            print("✅ Permissions d'écriture: OK")
        else:
            print("❌ Pas de permissions d'écriture")
            return False
    else:
        print("❌ Fichier de base de données n'existe pas")
        return False
    
    return True

def test_direct_sqlite_connection():
    """Tester la connexion SQLite directe"""
    print(f"\n🔗 TEST DE CONNEXION SQLITE DIRECTE")
    print("=" * 40)
    
    db_file = 'instance/gestion_client.db'
    
    try:
        # Test avec chemin relatif
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM client")
        client_count = cursor.fetchone()[0]
        print(f"✅ Connexion directe réussie")
        print(f"📊 Clients trouvés: {client_count}")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Erreur connexion directe: {e}")
        return False

def fix_database_path():
    """Corriger le chemin de la base de données"""
    print(f"\n🔧 CORRECTION DU CHEMIN DE BASE DE DONNÉES")
    print("=" * 45)
    
    # Obtenir le chemin absolu
    current_dir = os.getcwd()
    abs_db_path = os.path.join(current_dir, 'instance', 'gestion_client.db')
    
    print(f"📍 Chemin absolu: {abs_db_path}")
    
    # Modifier la configuration pour utiliser le chemin absolu
    config_content = f'''import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre-cle-secrete-ici'
    
    # Configuration de la base de données SQLite avec chemin absolu
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \\
        'sqlite:///{abs_db_path}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {{
        'pool_recycle': 300,
        'pool_pre_ping': True
    }}
    
    # Configuration multilingue
    LANGUAGES = {{
        'fr': 'Français',
        'es': 'Español', 
        'en': 'English'
    }}
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # Configuration optimisée pour la production
    SQLALCHEMY_ENGINE_OPTIONS = {{
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }}

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {{
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}}
'''
    
    try:
        with open('config.py', 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Configuration mise à jour avec chemin absolu")
        return True
    except Exception as e:
        print(f"❌ Erreur mise à jour config: {e}")
        return False

def test_flask_connection():
    """Tester la connexion Flask après correction"""
    print(f"\n🌐 TEST DE CONNEXION FLASK")
    print("=" * 35)
    
    try:
        # Recharger les modules
        if 'app' in sys.modules:
            del sys.modules['app']
        if 'config' in sys.modules:
            del sys.modules['config']
        
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app import app, db, Client, Operateur, Incident
        from config import Config
        
        print(f"📋 Nouvelle configuration:")
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        with app.app_context():
            # Test de connexion
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"✅ Connexion Flask réussie!")
            print(f"📊 Données disponibles:")
            print(f"   👥 Clients: {clients_count}")
            print(f"   🛠️  Opérateurs: {operateurs_count}")
            print(f"   🎫 Incidents: {incidents_count}")
            
            return True
            
    except Exception as e:
        print(f"❌ Erreur connexion Flask: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🚑 CORRECTION DE L'ERREUR SQLITE")
    print("=" * 40)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # 1. Vérifier permissions et chemins
    step1 = check_permissions_and_paths()
    
    # 2. Tester connexion SQLite directe
    step2 = test_direct_sqlite_connection()
    
    # 3. Corriger le chemin si nécessaire
    if step1 and step2:
        step3 = fix_database_path()
        
        # 4. Tester Flask après correction
        if step3:
            step4 = test_flask_connection()
            
            if step4:
                print(f"\n🎉 CORRECTION RÉUSSIE!")
                print("=" * 25)
                print("✅ Erreur SQLite corrigée")
                print("✅ Application prête à démarrer")
                print("🚀 Commande: python app.py")
            else:
                print(f"\n⚠️  Problème persistant avec Flask")
        else:
            print(f"\n❌ Erreur lors de la correction du chemin")
    else:
        print(f"\n❌ Problèmes de base détectés")
        print("💡 Solutions:")
        print("   - Vérifiez les permissions du dossier")
        print("   - Vérifiez que le fichier DB existe")
        print("   - Lancez en tant qu'administrateur si nécessaire")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Correction interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 