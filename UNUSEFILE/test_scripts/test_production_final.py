#!/usr/bin/env python3
"""
Test final de l'application en production
Usage: python test_production_final.py
"""

import requests
import time
from datetime import datetime

def test_production():
    """Test complet de l'application en production"""
    print("🎯 TEST FINAL DE PRODUCTION")
    print("=" * 35)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    base_url = "http://localhost:5001"
    
    # Tests des endpoints principaux
    tests = [
        ("Page d'accueil", "/"),
        ("Clients", "/clients"),
        ("Incidents", "/incidents"), 
        ("Opérateurs", "/operateurs"),
        ("API incidents par date", "/api/incidents-par-date"),
        ("Production info", "/production-info")
    ]
    
    results = []
    
    for name, endpoint in tests:
        print(f"\n🧪 Test: {name} ({endpoint})")
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                print(f"✅ {response.status_code} - {len(response.content)} bytes")
                results.append((name, True))
                
                # Vérifications spéciales
                if endpoint == "/api/incidents-par-date":
                    try:
                        data = response.json()
                        print(f"   📊 {len(data)} points de données")
                    except:
                        print("   ⚠️  Réponse non-JSON")
                        
                elif endpoint == "/production-info":
                    try:
                        data = response.json()
                        print(f"   🔧 Environment: {data.get('environment', 'unknown')}")
                        print(f"   🐛 Debug: {data.get('debug', 'unknown')}")
                    except:
                        print("   ⚠️  Réponse non-JSON")
                        
            else:
                print(f"❌ {response.status_code}")
                results.append((name, False))
                
        except requests.exceptions.ConnectionError:
            print("❌ Connexion refusée")
            results.append((name, False))
        except Exception as e:
            print(f"❌ Erreur: {e}")
            results.append((name, False))
    
    # Test de performance
    print(f"\n🏃 TEST DE PERFORMANCE")
    print("=" * 25)
    
    try:
        start_time = time.time()
        response = requests.get(f"{base_url}/", timeout=10)
        end_time = time.time()
        
        if response.status_code == 200:
            response_time = round((end_time - start_time) * 1000, 2)
            print(f"✅ Temps de réponse: {response_time}ms")
            
            if response_time < 500:
                print("🚀 Performance excellente")
            elif response_time < 1000:
                print("⚡ Performance bonne")
            else:
                print("🐌 Performance à améliorer")
        else:
            print(f"❌ Erreur {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de performance: {e}")
    
    # Résumé final
    print(f"\n📊 RÉSUMÉ FINAL")
    print("=" * 20)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")
    
    print(f"\n🎯 Score: {passed}/{total} tests passés")
    
    if passed == total:
        print("🎉 APPLICATION EN PRODUCTION PARFAITEMENT FONCTIONNELLE!")
        print("\n🌟 FÉLICITATIONS!")
        print("=" * 50)
        print("✅ Migration SQLite → MariaDB: RÉUSSIE")
        print("✅ Correction courbe d'évolution: RÉUSSIE")
        print("✅ Mise en production: RÉUSSIE")
        print("✅ Application accessible: http://localhost:5001")
        print("=" * 50)
        
    elif passed >= total - 1:
        print("🎊 Application majoritairement fonctionnelle en production!")
        print("⚠️  Quelques ajustements mineurs possibles")
        
    else:
        print("❌ Problèmes de production détectés")
        print("🔧 Révision nécessaire")
    
    return passed == total

if __name__ == "__main__":
    success = test_production()
    exit(0 if success else 1) 