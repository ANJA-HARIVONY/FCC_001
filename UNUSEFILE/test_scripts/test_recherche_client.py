#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour la recherche sur le nom du client
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident, Client

def test_recherche_client():
    """Tester la recherche sur le nom du client"""
    
    print("🔍 TEST DE RECHERCHE SUR LE NOM DU CLIENT")
    print("=" * 50)
    
    with app.app_context():
        # Vérifier les données
        total_incidents = Incident.query.count()
        total_clients = Client.query.count()
        
        print(f"📊 Données disponibles:")
        print(f"   - Incidents: {total_incidents}")
        print(f"   - Clients: {total_clients}")
        
        if total_incidents == 0:
            print("❌ Aucun incident trouvé!")
            return
        
        # Lister les clients disponibles
        print(f"\n👥 Clients disponibles:")
        clients = Client.query.all()
        for i, client in enumerate(clients, 1):
            incidents_count = Incident.query.filter_by(id_client=client.id).count()
            print(f"   {i}. {client.nom} ({incidents_count} incidents)")
        
        # Test de recherche sur différents clients
        test_searches = [
            "SERVICIOS",  # Partie du nom "SERVICIOS INTEGRALES"
            "TECH",       # Partie du nom "TECH SOLUTIONS"
            "GLOBAL",     # Partie du nom "GLOBAL NETWORKS"
            "DIGITAL",    # Partie du nom "DIGITAL CORP"
            "servicios",  # Test insensible à la casse
            "tech",       # Test insensible à la casse
        ]
        
        print(f"\n🧪 Tests de recherche:")
        
        for search_term in test_searches:
            print(f"\n   🔍 Recherche: '{search_term}'")
            
            # Test avec la nouvelle logique
            query = Incident.query.join(Client).filter(
                db.or_(
                    Incident.intitule.contains(search_term),
                    Incident.observations.contains(search_term),
                    Client.nom.contains(search_term)
                )
            )
            
            results = query.all()
            print(f"      Résultats: {len(results)} incidents trouvés")
            
            if results:
                # Afficher les premiers résultats
                for i, incident in enumerate(results[:3], 1):
                    print(f"        {i}. #{incident.id} - {incident.client.nom} - {incident.intitule[:40]}...")
                
                if len(results) > 3:
                    print(f"        ... et {len(results) - 3} autres")
        
        # Test via la route web
        print(f"\n🌐 Test via route web:")
        
        with app.test_client() as client_test:
            test_cases = [
                ("SERVICIOS", "Recherche SERVICIOS"),
                ("TECH", "Recherche TECH"),
                ("conexión", "Recherche dans intitulé"),
            ]
            
            for search_query, description in test_cases:
                response = client_test.get(f'/incidents?search={search_query}')
                print(f"   {description}: HTTP {response.status_code}")
                
                if response.status_code == 200:
                    content = response.get_data(as_text=True)
                    incident_count = content.count('<td><strong>#')
                    print(f"      → {incident_count} incidents affichés")
                else:
                    print(f"      → Erreur: {response.status_code}")
        
        print(f"\n✅ Test terminé!")

if __name__ == "__main__":
    test_recherche_client() 