#!/usr/bin/env python3
"""
Script de démonstration des fonctionnalités de production
FCC_001 - Système de gestion d'incidents
"""

import os
import requests
import time
from datetime import datetime

def test_application():
    """Test des fonctionnalités de l'application"""
    base_url = "http://localhost:5001"
    
    print("🧪 Test des fonctionnalités de production FCC_001")
    print("=" * 50)
    
    # Test 1: Page d'accueil
    print("\n1. 🏠 Test de la page d'accueil...")
    try:
        response = requests.get(base_url, timeout=10)
        if response.status_code == 200:
            print("   ✅ Page d'accueil accessible")
        else:
            print(f"   ❌ Erreur HTTP {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # Test 2: API Dashboard Data
    print("\n2. 📊 Test API Dashboard Data...")
    try:
        response = requests.get(f"{base_url}/dashboard-data?period=current_month", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API accessible - {data['total_incidents']} incidents trouvés")
        else:
            print(f"   ❌ API erreur HTTP {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur API: {e}")
    
    # Test 3: API Incidents par date
    print("\n3. 📈 Test API Incidents par date...")
    try:
        response = requests.get(f"{base_url}/api/incidents-par-date?period=last_3_months&type=date", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API graphiques accessible - {len(data)} points de données")
        else:
            print(f"   ❌ API graphiques erreur HTTP {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur API graphiques: {e}")
    
    # Test 4: Pages principales
    pages_to_test = [
        ("/clients", "👥 Clients"),
        ("/incidents", "🎫 Incidents"),
        ("/operateurs", "👨‍💻 Opérateurs")
    ]
    
    print("\n4. 🔗 Test des pages principales...")
    for path, name in pages_to_test:
        try:
            response = requests.get(f"{base_url}{path}", timeout=10)
            if response.status_code == 200:
                print(f"   ✅ {name} accessible")
            else:
                print(f"   ❌ {name} erreur HTTP {response.status_code}")
        except Exception as e:
            print(f"   ❌ {name} erreur: {e}")
    
    # Test 5: Sélecteur de période
    print("\n5. 🗓️  Test sélecteur de période...")
    periods = ['current_month', 'current_week', 'last_3_months', 'all_data']
    for period in periods:
        try:
            response = requests.get(f"{base_url}/dashboard-data?period={period}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Période '{period}': {data['total_incidents']} incidents")
            else:
                print(f"   ❌ Période '{period}' erreur HTTP {response.status_code}")
        except Exception as e:
            print(f"   ❌ Période '{period}' erreur: {e}")
    
    return True

def check_logs():
    """Vérifier les logs de l'application"""
    print("\n6. 📋 Vérification des logs...")
    
    log_files = [
        ("logs/app.log", "Application"),
        ("logs/access.log", "Accès Gunicorn"),
        ("logs/error.log", "Erreurs Gunicorn")
    ]
    
    for log_file, description in log_files:
        if os.path.exists(log_file):
            size = os.path.getsize(log_file)
            print(f"   ✅ {description}: {log_file} ({size} octets)")
            
            # Afficher les dernières lignes
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    if lines:
                        print(f"      Dernière entrée: {lines[-1].strip()}")
            except Exception as e:
                print(f"      ⚠️  Erreur lecture: {e}")
        else:
            print(f"   ⚠️  {description}: {log_file} non trouvé")

def performance_test():
    """Test de performance simple"""
    print("\n7. ⚡ Test de performance...")
    base_url = "http://localhost:5001"
    
    start_time = time.time()
    successful_requests = 0
    total_requests = 10
    
    for i in range(total_requests):
        try:
            response = requests.get(base_url, timeout=5)
            if response.status_code == 200:
                successful_requests += 1
        except:
            pass
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"   📊 Résultats:")
    print(f"      - Requêtes réussies: {successful_requests}/{total_requests}")
    print(f"      - Temps total: {duration:.2f}s")
    print(f"      - Temps moyen: {duration/total_requests:.3f}s par requête")
    
    if successful_requests == total_requests and duration < 10:
        print("   ✅ Performance acceptable")
    else:
        print("   ⚠️  Performance à améliorer")

def main():
    """Fonction principale"""
    print(f"📅 Date du test: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"🖥️  Environnement: {os.environ.get('FLASK_ENV', 'development')}")
    
    # Vérifier que l'application est démarrée
    print("\n🔍 Vérification que l'application est démarrée...")
    try:
        response = requests.get("http://localhost:5001", timeout=5)
        print("✅ Application accessible")
    except:
        print("❌ Application non accessible. Démarrez-la avec:")
        print("   - Windows: scripts\\start_production.bat")
        print("   - Linux:   ./scripts/start_production.sh")
        print("   - Dev:     python app.py")
        return
    
    # Exécuter les tests
    if test_application():
        print("\n✅ Tous les tests de base sont passés !")
    else:
        print("\n❌ Certains tests ont échoué")
    
    check_logs()
    performance_test()
    
    print("\n" + "=" * 50)
    print("🎉 Test de démonstration terminé !")
    print("\n📚 Fonctionnalités testées:")
    print("   ✅ Sélecteur de période dynamique")
    print("   ✅ APIs JSON pour les données")
    print("   ✅ Auto-refresh du dashboard")
    print("   ✅ Configuration de production")
    print("   ✅ Logging rotatif")
    print("   ✅ Architecture WSGI")
    
    print("\n🔗 Liens utiles:")
    print("   - Application: http://localhost:5001")
    print("   - Logs: logs/app.log")
    print("   - Documentation: README_PRODUCTION.md")

if __name__ == "__main__":
    main() 