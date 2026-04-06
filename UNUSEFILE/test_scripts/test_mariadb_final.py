#!/usr/bin/env python3
"""
Test final de l'application avec MariaDB
Usage: python test_mariadb_final.py
"""

import sys
import os
import pymysql
import requests
import time
from datetime import datetime

# Ajouter le répertoire actuel au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_mariadb_direct():
    """Test direct de MariaDB"""
    print("🔗 TEST DIRECT MARIADB")
    print("=" * 25)
    
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='toor',
            database='fcc_001_db',
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # Compter les données
        cursor.execute("SELECT COUNT(*) FROM client")
        clients_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM operateur")
        operateurs_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM incident")
        incidents_count = cursor.fetchone()[0]
        
        print(f"✅ Connexion MariaDB directe réussie")
        print(f"📊 Données en base:")
        print(f"   👥 Clients: {clients_count}")
        print(f"   🛠️  Opérateurs: {operateurs_count}")
        print(f"   🎫 Incidents: {incidents_count}")
        
        cursor.close()
        connection.close()
        return True, (clients_count, operateurs_count, incidents_count)
        
    except Exception as e:
        print(f"❌ Erreur MariaDB: {e}")
        return False, (0, 0, 0)

def test_flask_app():
    """Test de l'application Flask"""
    print(f"\n🌐 TEST APPLICATION FLASK")
    print("=" * 30)
    
    try:
        from app import app, db, Client, Operateur, Incident
        from config import Config
        
        print(f"📋 Configuration Flask:")
        print(f"   URI: {Config.SQLALCHEMY_DATABASE_URI}")
        
        with app.app_context():
            # Test de connexion via SQLAlchemy
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"✅ Connexion Flask-SQLAlchemy réussie")
            print(f"📊 Données via Flask:")
            print(f"   👥 Clients: {clients_count}")
            print(f"   🛠️  Opérateurs: {operateurs_count}")
            print(f"   🎫 Incidents: {incidents_count}")
            
            return True, (clients_count, operateurs_count, incidents_count)
            
    except Exception as e:
        print(f"❌ Erreur Flask: {e}")
        import traceback
        traceback.print_exc()
        return False, (0, 0, 0)

def test_web_interface():
    """Test de l'interface web"""
    print(f"\n🌍 TEST INTERFACE WEB")
    print("=" * 25)
    
    base_url = "http://localhost:5001"
    endpoints = [
        "/",
        "/clients", 
        "/operateurs",
        "/incidents",
        "/api/clients-search",
        "/api/incidents-par-date"
    ]
    
    results = []
    
    for endpoint in endpoints:
        try:
            url = base_url + endpoint
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ {endpoint}: OK (HTTP 200)")
                results.append(True)
            else:
                print(f"⚠️  {endpoint}: HTTP {response.status_code}")
                results.append(False)
                
        except requests.exceptions.ConnectionError:
            print(f"❌ {endpoint}: Connexion impossible")
            results.append(False)
        except Exception as e:
            print(f"❌ {endpoint}: {str(e)[:50]}...")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print(f"\n📊 Taux de réussite: {success_rate:.1f}%")
    
    return success_rate > 80

def test_sample_queries():
    """Test de quelques requêtes échantillons"""
    print(f"\n🔍 TEST REQUÊTES ÉCHANTILLONS")
    print("=" * 35)
    
    try:
        from app import app, db, Client, Operateur, Incident
        
        with app.app_context():
            # Test 1: Rechercher des clients
            clients_malabo = Client.query.filter(Client.ville.contains('MALABO')).limit(5).all()
            print(f"🏙️  Clients à Malabo: {len(clients_malabo)}")
            
            # Test 2: Incidents récents
            recent_incidents = Incident.query.order_by(Incident.date_heure.desc()).limit(10).all()
            print(f"🎫 Incidents récents: {len(recent_incidents)}")
            
            # Test 3: Statistiques par statut
            status_counts = db.session.query(
                Incident.status, 
                db.func.count(Incident.id)
            ).group_by(Incident.status).all()
            
            print(f"📊 Répartition par statut:")
            for status, count in status_counts:
                print(f"   {status}: {count}")
            
            return True
            
    except Exception as e:
        print(f"❌ Erreur requêtes: {e}")
        return False

def main():
    print("🧪 TEST FINAL DE L'APPLICATION MARIADB")
    print("=" * 45)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    all_tests = []
    
    # 1. Test MariaDB direct
    mariadb_ok, mariadb_data = test_mariadb_direct()
    all_tests.append(mariadb_ok)
    
    # 2. Test Flask
    flask_ok, flask_data = test_flask_app()
    all_tests.append(flask_ok)
    
    # Vérifier la cohérence des données
    if mariadb_ok and flask_ok:
        if mariadb_data == flask_data:
            print(f"\n✅ COHÉRENCE DES DONNÉES: PARFAITE")
        else:
            print(f"\n⚠️  INCOHÉRENCE: MariaDB {mariadb_data} vs Flask {flask_data}")
    
    # 3. Test interface web (optionnel)
    print(f"\n⏳ Attente de 3 secondes pour que l'app démarre...")
    time.sleep(3)
    
    web_ok = test_web_interface()
    all_tests.append(web_ok)
    
    # 4. Test requêtes
    queries_ok = test_sample_queries()
    all_tests.append(queries_ok)
    
    # Résumé final
    success_count = sum(all_tests)
    total_tests = len(all_tests)
    
    print(f"\n{'='*45}")
    print(f"📊 RÉSULTATS FINAUX")
    print(f"=" * 20)
    print(f"✅ Tests réussis: {success_count}/{total_tests}")
    
    if success_count == total_tests:
        print(f"🎉 MIGRATION PARFAITEMENT RÉUSSIE!")
        print(f"✅ SQLite → MariaDB: SUCCÈS TOTAL")
        print(f"✅ Application opérationnelle")
        print(f"✅ {flask_data[0]} clients migrés")
        print(f"✅ {flask_data[1]} opérateurs migrés") 
        print(f"✅ {flask_data[2]} incidents migrés")
        print(f"\n🌐 Application disponible sur:")
        print(f"   http://localhost:5001")
        return True
    else:
        print(f"⚠️  {total_tests - success_count} test(s) échoué(s)")
        print(f"💡 Vérifiez les erreurs ci-dessus")
        return False

if __name__ == "__main__":
    try:
        success = main()
        print(f"\n{'🎉 SUCCÈS' if success else '⚠️  ATTENTION'}: Migration vers MariaDB")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrompu")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 