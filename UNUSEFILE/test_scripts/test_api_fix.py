#!/usr/bin/env python3
"""
Script pour tester la correction de l'API des incidents par date
Usage: python test_api_fix.py
"""

import sys
import os
import requests
import json
from datetime import datetime

# Ajouter le répertoire actuel au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_api_incidents_par_date():
    """Tester l'API des incidents par date"""
    print("🧪 TEST DE L'API DES INCIDENTS PAR DATE")
    print("=" * 45)
    
    base_url = "http://localhost:5001"
    
    # Test des différents types d'affichage
    test_urls = [
        f"{base_url}/api/incidents-par-date?type=date",
        f"{base_url}/api/incidents-par-date?type=hour", 
        f"{base_url}/api/incidents-par-date?type=datetime",
        f"{base_url}/api/incidents-par-date"  # Par défaut
    ]
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n📊 Test {i}: {url}")
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Succès - {len(data)} points de données")
                
                if data and len(data) > 0:
                    print(f"   📅 Premier point: {data[0]}")
                    print(f"   📅 Dernier point: {data[-1]}")
                    
                    # Vérifier la structure des données
                    for point in data[:3]:  # Vérifier les 3 premiers
                        if 'date' in point and 'count' in point:
                            print(f"   ✓ Structure valide: {point}")
                        else:
                            print(f"   ❌ Structure invalide: {point}")
                            break
                else:
                    print("   ℹ️  Aucune donnée retournée")
                    
            else:
                print(f"❌ Erreur HTTP {response.status_code}")
                print(f"   Réponse: {response.text[:200]}...")
                
        except requests.exceptions.ConnectionError:
            print("❌ Erreur de connexion - L'application n'est pas démarrée")
        except requests.exceptions.Timeout:
            print("❌ Timeout de la requête")
        except Exception as e:
            print(f"❌ Erreur: {e}")

def test_dashboard_access():
    """Tester l'accès au tableau de bord"""
    print("\n🏠 TEST D'ACCÈS AU TABLEAU DE BORD")
    print("=" * 35)
    
    try:
        response = requests.get("http://localhost:5001/", timeout=10)
        
        if response.status_code == 200:
            print("✅ Tableau de bord accessible")
            
            # Vérifier si le contenu contient les éléments attendus
            content = response.text
            if "incidents-par-date" in content:
                print("✅ Script de graphique trouvé dans la page")
            else:
                print("⚠️  Script de graphique non trouvé")
                
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_with_flask_app():
    """Test direct avec l'application Flask"""
    print("\n🔧 TEST DIRECT AVEC FLASK")
    print("=" * 30)
    
    try:
        from app import app, db, Incident
        from sqlalchemy import func
        
        with app.app_context():
            print("✅ Application Flask chargée")
            
            # Test de la requête de base
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            incidents = db.session.query(
                func.date(Incident.date_heure), func.count(Incident.id)
            ).filter(
                func.extract('month', Incident.date_heure) == current_month,
                func.extract('year', Incident.date_heure) == current_year
            ).group_by(func.date(Incident.date_heure)).order_by(func.date(Incident.date_heure)).all()
            
            print(f"📊 {len(incidents)} groupes de dates trouvés")
            
            if incidents:
                for date_obj, count in incidents[:5]:  # Afficher les 5 premiers
                    if hasattr(date_obj, 'strftime'):
                        formatted_date = date_obj.strftime('%d/%m')
                        print(f"   📅 {formatted_date}: {count} incidents")
                    else:
                        print(f"   📅 {date_obj}: {count} incidents")
            else:
                print("   ℹ️  Aucun incident trouvé pour ce mois")
                
    except Exception as e:
        print(f"❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("🔍 DIAGNOSTIC DE LA CORRECTION API")
    print("=" * 50)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    # Tests
    test_with_flask_app()
    test_api_incidents_par_date()
    test_dashboard_access()
    
    print("\n" + "=" * 50)
    print("✅ Tests terminés")
    
    print("\n💡 RECOMMANDATIONS:")
    print("1. Redémarrer l'application Flask si elle était en cours")
    print("2. Actualiser la page du tableau de bord")
    print("3. Vérifier que la courbe s'affiche maintenant")

if __name__ == "__main__":
    main() 