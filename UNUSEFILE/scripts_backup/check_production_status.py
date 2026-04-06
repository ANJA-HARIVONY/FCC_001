#!/usr/bin/env python3
"""
Script pour vérifier le statut de l'application en production
Usage: python check_production_status.py
"""

import os
import sys
import requests
import psutil
import json
from datetime import datetime

def check_process():
    """Vérifier si l'application tourne"""
    print("🔍 VÉRIFICATION DU PROCESSUS")
    print("=" * 35)
    
    # Vérifier le fichier PID
    if os.path.exists('app_production.pid'):
        try:
            with open('app_production.pid', 'r') as f:
                pid = int(f.read().strip())
            
            if psutil.pid_exists(pid):
                process = psutil.Process(pid)
                print(f"✅ Application en cours (PID: {pid})")
                print(f"   📊 CPU: {process.cpu_percent():.1f}%")
                print(f"   💾 Mémoire: {process.memory_info().rss // 1024 // 1024} MB")
                print(f"   ⏰ Démarré: {datetime.fromtimestamp(process.create_time()).strftime('%H:%M:%S')}")
                return True
            else:
                print(f"❌ PID {pid} n'existe plus")
                os.remove('app_production.pid')
                return False
                
        except Exception as e:
            print(f"❌ Erreur de lecture PID: {e}")
            return False
    else:
        print("❌ Fichier PID non trouvé")
        return False

def check_port():
    """Vérifier le port 5001"""
    print("\n🔍 VÉRIFICATION DU PORT 5001")
    print("=" * 30)
    
    for conn in psutil.net_connections():
        if conn.laddr.port == 5001 and conn.status == 'LISTEN':
            print(f"✅ Port 5001 en écoute (PID: {conn.pid})")
            return True
    
    print("❌ Port 5001 non en écoute")
    return False

def check_health():
    """Vérifier l'endpoint de santé"""
    print("\n🔍 VÉRIFICATION DE L'API DE SANTÉ")
    print("=" * 35)
    
    try:
        response = requests.get('http://localhost:5001/health', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Application responsive")
            print(f"   📊 Statut: {data['status']}")
            print(f"   🗄️  Base de données: {data['database']}")
            print(f"   👥 Clients: {data['clients']}")
            print(f"   🎫 Incidents: {data['incidents']}")
            print(f"   📅 Version: {data['version']}")
            return True
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connexion refusée - Application non accessible")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def check_metrics():
    """Vérifier les métriques"""
    print("\n🔍 VÉRIFICATION DES MÉTRIQUES")
    print("=" * 30)
    
    try:
        response = requests.get('http://localhost:5001/metrics', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Métriques disponibles")
            print(f"   👥 Total clients: {data['total_clients']}")
            print(f"   🛠️  Total opérateurs: {data['total_operateurs']}")
            print(f"   🎫 Total incidents: {data['total_incidents']}")
            print(f"   📊 Incidents ce mois: {data['incidents_ce_mois']}")
            print(f"   ✅ Résolus ce mois: {data['incidents_resolus_ce_mois']}")
            
            if data['incidents_ce_mois'] > 0:
                taux = round((data['incidents_resolus_ce_mois'] / data['incidents_ce_mois']) * 100, 1)
                print(f"   📈 Taux de résolution: {taux}%")
            
            return True
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def check_logs():
    """Vérifier les logs"""
    print("\n🔍 VÉRIFICATION DES LOGS")
    print("=" * 25)
    
    log_files = [
        'logs/startup.log',
        'logs/application.log'
    ]
    
    for log_file in log_files:
        if os.path.exists(log_file):
            size = os.path.getsize(log_file)
            modified = datetime.fromtimestamp(os.path.getmtime(log_file))
            print(f"✅ {log_file}: {size} bytes - {modified.strftime('%H:%M:%S')}")
            
            # Afficher les dernières lignes
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    if lines:
                        last_line = lines[-1].strip()
                        print(f"   📝 Dernière ligne: {last_line[:80]}...")
            except:
                pass
        else:
            print(f"❌ {log_file}: Non trouvé")

def test_dashboard():
    """Tester l'accès au tableau de bord"""
    print("\n🔍 TEST DU TABLEAU DE BORD")
    print("=" * 25)
    
    try:
        response = requests.get('http://localhost:5001/', timeout=10)
        
        if response.status_code == 200:
            print("✅ Tableau de bord accessible")
            
            # Vérifier la présence du graphique
            if 'incidents-par-date' in response.text:
                print("✅ Script de graphique présent")
            else:
                print("⚠️  Script de graphique absent")
                
            # Vérifier la taille de la réponse
            size_kb = len(response.content) // 1024
            print(f"📊 Taille de la page: {size_kb} KB")
            
            return True
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def show_summary():
    """Afficher le résumé"""
    print("\n" + "=" * 50)
    print("📋 RÉSUMÉ DE L'APPLICATION EN PRODUCTION")
    print("=" * 50)
    print("🌐 URL: http://localhost:5001")
    print("📊 Health Check: http://localhost:5001/health")
    print("📈 Métriques: http://localhost:5001/metrics")
    print("🗂️  Logs: logs/startup.log et logs/application.log")
    
    if os.path.exists('app_production.pid'):
        with open('app_production.pid', 'r') as f:
            pid = f.read().strip()
        print(f"🆔 PID: {pid}")
    
    print("=" * 50)

def main():
    """Fonction principale"""
    print("🎯 VÉRIFICATION DE L'APPLICATION EN PRODUCTION")
    print("=" * 50)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # Tests
    tests = [
        ("Processus", check_process),
        ("Port", check_port),
        ("Santé", check_health),
        ("Métriques", check_metrics),
        ("Logs", check_logs),
        ("Tableau de bord", test_dashboard)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Erreur dans {name}: {e}")
            results.append((name, False))
    
    # Résumé
    print("\n📊 RÉSULTATS DES TESTS")
    print("=" * 25)
    
    passed = 0
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Score: {passed}/{len(results)} tests passés")
    
    if passed == len(results):
        print("🎉 APPLICATION EN PRODUCTION FONCTIONNELLE!")
    elif passed >= len(results) - 1:
        print("⚠️  Application majoritairement fonctionnelle")
    else:
        print("❌ Problèmes détectés - Vérification nécessaire")
    
    show_summary()

if __name__ == "__main__":
    main() 