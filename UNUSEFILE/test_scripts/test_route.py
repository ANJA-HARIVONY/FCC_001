#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour la route incidents
"""

import sys
import os
sys.path.insert(0, '.')

from app import app

def test_incidents_route():
    """Tester la route incidents directement"""
    
    with app.test_client() as client:
        print("🧪 Test de la route /incidents...")
        
        # Test de la route sans paramètres
        response = client.get('/incidents')
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Route accessible")
            
            # Vérifier le contenu
            content = response.get_data(as_text=True)
            
            # Chercher des éléments clés
            if 'incidents.items' in content:
                print("✅ Template utilise incidents.items")
            else:
                print("❌ Template n'utilise pas incidents.items")
            
            if 'Lista de las Incidencias' in content:
                print("✅ Titre trouvé")
            else:
                print("❌ Titre non trouvé")
            
            # Chercher des incidents dans le HTML
            if '<td><strong>#' in content:
                print("✅ Incidents trouvés dans le HTML")
                # Compter les incidents
                incident_count = content.count('<td><strong>#')
                print(f"   Nombre d'incidents affichés: {incident_count}")
            else:
                print("❌ Aucun incident trouvé dans le HTML")
            
            # Vérifier la pagination
            if 'pagination' in content:
                print("✅ Pagination trouvée")
            else:
                print("❌ Pagination non trouvée")
            
            # Vérifier les messages d'erreur
            if 'No hay incidentes registrados' in content:
                print("⚠️  Message 'Aucun incident' affiché")
            
            if 'No se encontraron incidentes' in content:
                print("⚠️  Message 'Aucun résultat' affiché")
            
            # Sauvegarder le contenu pour inspection
            with open('debug_incidents.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print("📄 Contenu sauvegardé dans debug_incidents.html")
            
        else:
            print(f"❌ Erreur HTTP: {response.status_code}")
            print(response.get_data(as_text=True))
        
        # Test avec paramètres
        print(f"\n🧪 Test avec paramètres...")
        response2 = client.get('/incidents?page=1&per_page=5')
        print(f"Status code avec paramètres: {response2.status_code}")
        
        if response2.status_code == 200:
            content2 = response2.get_data(as_text=True)
            incident_count2 = content2.count('<td><strong>#')
            print(f"Incidents avec per_page=5: {incident_count2}")

if __name__ == "__main__":
    test_incidents_route() 