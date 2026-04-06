#!/usr/bin/env python3
"""
Script pour corriger le chemin Windows dans config.py
Usage: python fix_config_path.py
"""

import os

def fix_config_file():
    """Corriger le fichier config.py avec un chemin compatible Windows"""
    print("🔧 CORRECTION DU FICHIER CONFIG.PY")
    print("=" * 40)
    
    # Utiliser un chemin relatif qui fonctionne partout
    config_content = '''import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre-cle-secrete-ici'
    
    # Configuration de la base de données SQLite avec chemin relatif
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \\
        'sqlite:///instance/gestion_client.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True
    }
    
    # Configuration multilingue
    LANGUAGES = {
        'fr': 'Français',
        'es': 'Español', 
        'en': 'English'
    }
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # Configuration optimisée pour la production
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
'''
    
    try:
        with open('config.py', 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Fichier config.py corrigé")
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def ensure_instance_directory():
    """S'assurer que le dossier instance existe"""
    if not os.path.exists('instance'):
        os.makedirs('instance')
        print("✅ Dossier 'instance' créé")
    else:
        print("✅ Dossier 'instance' existe")

def test_app():
    """Tester l'application après correction"""
    print("\n🧪 TEST DE L'APPLICATION")
    print("=" * 30)
    
    try:
        import sys
        
        # Nettoyer les modules cachés
        modules_to_remove = [mod for mod in sys.modules.keys() if mod in ['app', 'config']]
        for mod in modules_to_remove:
            del sys.modules[mod]
        
        from app import app, db, Client, Operateur, Incident
        
        with app.app_context():
            # Tester la connexion
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"✅ Connexion réussie!")
            print(f"📊 Données:")
            print(f"   👥 Clients: {clients_count}")
            print(f"   🛠️  Opérateurs: {operateurs_count}")
            print(f"   🎫 Incidents: {incidents_count}")
            
            return True
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    print("🚑 CORRECTION RAPIDE CONFIG.PY")
    print("=" * 35)
    
    # 1. S'assurer que le dossier instance existe
    ensure_instance_directory()
    
    # 2. Corriger le fichier config.py
    if fix_config_file():
        # 3. Tester l'application
        if test_app():
            print(f"\n🎉 CORRECTION RÉUSSIE!")
            print("=" * 25)
            print("✅ Config.py corrigé")
            print("✅ Application fonctionnelle")
            print("🚀 Démarrez avec: python app.py")
        else:
            print(f"\n⚠️  Problème persistant")
    else:
        print(f"\n❌ Erreur lors de la correction")

if __name__ == "__main__":
    main() 