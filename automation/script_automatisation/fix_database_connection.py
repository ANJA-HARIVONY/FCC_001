#!/usr/bin/env python3
"""
Script pour corriger la connexion à la base de données
Usage: python fix_database_connection.py
"""

import sys
import os
from datetime import datetime

# Ajouter le répertoire actuel au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def ensure_instance_directory():
    """S'assurer que le dossier instance existe"""
    if not os.path.exists('instance'):
        os.makedirs('instance')
        print("✅ Dossier 'instance' créé")
    else:
        print("✅ Dossier 'instance' existe déjà")

def test_database_connection():
    """Tester la connexion à la base de données avec la nouvelle configuration"""
    print("\n🔗 TEST DE CONNEXION À LA BASE DE DONNÉES")
    print("=" * 45)
    
    try:
        from app import app, db, Client, Operateur, Incident
        from config import Config
        
        print(f"📋 Configuration actuelle:")
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        with app.app_context():
            # Test de connexion avec la nouvelle méthode SQLAlchemy 2.0
            with db.engine.connect() as connection:
                result = connection.execute(db.text('SELECT 1'))
                print("✅ Connexion à la base de données réussie")
            
            # Vérifier les tables
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 Tables trouvées: {tables}")
            
            # Compter les enregistrements
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"\n📈 Données disponibles:")
            print(f"   👥 Clients: {clients_count}")
            print(f"   🛠️  Opérateurs: {operateurs_count}")
            print(f"   🎫 Incidents: {incidents_count}")
            
            if clients_count > 0:
                print("\n✅ SUCCÈS: La base de données contient des données!")
                
                # Afficher quelques exemples
                print(f"\n📋 Exemples de données:")
                
                client_sample = Client.query.first()
                print(f"   👤 Premier client: {client_sample.nom}")
                
                operateur_sample = Operateur.query.first()
                print(f"   🛠️  Premier opérateur: {operateur_sample.nom}")
                
                incident_sample = Incident.query.first()
                print(f"   🎫 Premier incident: {incident_sample.intitule}")
                
                return True
            else:
                print("\n⚠️  Base de données vide")
                return False
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_app_startup():
    """Vérifier que l'application peut démarrer correctement"""
    print(f"\n🚀 VÉRIFICATION DU DÉMARRAGE DE L'APPLICATION")
    print("=" * 50)
    
    try:
        from app import app
        
        with app.app_context():
            # Simuler une requête vers la page dashboard
            with app.test_client() as client:
                response = client.get('/')
                
                if response.status_code == 200:
                    print("✅ Page d'accueil accessible")
                    
                    # Vérifier que la réponse contient des données
                    response_data = response.get_data(as_text=True)
                    if 'dashboard' in response_data.lower():
                        print("✅ Template dashboard chargé")
                    
                    return True
                else:
                    print(f"❌ Erreur HTTP: {response.status_code}")
                    return False
                    
    except Exception as e:
        print(f"❌ Erreur démarrage application: {e}")
        return False

def main():
    print("🔧 CORRECTION DE LA CONNEXION BASE DE DONNÉES")
    print("=" * 55)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # 1. S'assurer que le dossier instance existe
    ensure_instance_directory()
    
    # 2. Tester la connexion à la base de données
    db_ok = test_database_connection()
    
    # 3. Vérifier le démarrage de l'application
    app_ok = verify_app_startup()
    
    # 4. Conclusions
    print(f"\n🎯 RÉSULTATS")
    print("=" * 20)
    
    if db_ok and app_ok:
        print("✅ SUCCÈS: Application prête à utiliser!")
        print("🌐 Vous pouvez maintenant démarrer l'application:")
        print("   python app.py")
        print("   Puis ouvrir: http://localhost:5001")
    elif db_ok and not app_ok:
        print("⚠️  Base de données OK, mais problème application")
        print("🔍 Vérifiez les templates et les routes Flask")
    else:
        print("❌ Problèmes détectés")
        print("💡 Solutions possibles:")
        print("   1. Re-migrer les données: python migrate_csv_to_flask.py")
        print("   2. Vérifier la configuration dans config.py")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Correction interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 