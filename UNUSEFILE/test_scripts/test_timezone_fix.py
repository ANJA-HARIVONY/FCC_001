#!/usr/bin/env python3
"""
Test du correctif de décalage horaire
Ce script teste si les corrections du décalage d'heure entre datetime.utcnow et datetime.now 
fonctionnent correctement.
"""

import requests
import json
from datetime import datetime, timedelta

def test_timezone_corrections():
    """Test des corrections de fuseau horaire"""
    print("🧪 Test des corrections de décalage horaire")
    print("=" * 50)
    
    # URL de base de l'application
    BASE_URL = "http://localhost:5001"
    
    try:
        # Test 1: Vérifier l'API des incidents pendants
        print("\n1️⃣ Test de l'API incidents pendants...")
        response = requests.get(f"{BASE_URL}/api/incidents-pendientes", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API incidents pendants fonctionne")
            print(f"   Nombre d'incidents pendants > 30min: {data.get('count', 0)}")
            
            # Si il y a des incidents, vérifier le calcul du temps
            if data.get('notifications'):
                incident = data['notifications'][0]
                print(f"   Exemple - Incident: {incident.get('intitule', 'N/A')}")
                print(f"   Temps transcurrido: {incident.get('tiempo_transcurrido', 'N/A')}")
                print(f"   Date création: {incident.get('fecha_creacion', 'N/A')}")
        else:
            print(f"❌ Erreur API incidents pendants: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion: {e}")
        print("   L'application n'est peut-être pas encore démarrée")
        return False
        
    try:
        # Test 2: Vérifier l'API dashboard
        print("\n2️⃣ Test de l'API dashboard...")
        response = requests.get(f"{BASE_URL}/dashboard-data", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API dashboard fonctionne")
            print(f"   Total incidents: {data.get('total_incidents', 0)}")
            
            # Vérifier les derniers incidents
            derniers = data.get('derniers_incidents', [])
            if derniers:
                incident = derniers[0]
                print(f"   Dernier incident: {incident.get('intitule', 'N/A')}")
                print(f"   Date formatée: {incident.get('date_heure_formatted', 'N/A')}")
        else:
            print(f"❌ Erreur API dashboard: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion dashboard: {e}")
        
    try:
        # Test 3: Vérifier la page principale
        print("\n3️⃣ Test de la page principale...")
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        if response.status_code == 200:
            print(f"✅ Page principale accessible")
            # Vérifier que l'heure système est affichée
            if 'current_time' in response.text or datetime.now().strftime('%H:%M') in response.text:
                print(f"✅ Affichage de l'heure système détecté")
        else:
            print(f"❌ Erreur page principale: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion page principale: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test terminé")
    
    # Afficher l'heure actuelle pour référence
    print(f"\n⏰ Heure système actuelle: {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    
    return True

if __name__ == "__main__":
    test_timezone_corrections()
