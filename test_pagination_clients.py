#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour la pagination et recherche des clients
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client

def test_pagination_clients():
    """Tester la pagination et recherche des clients"""
    
    print("🔍 TEST DE PAGINATION ET RECHERCHE - CLIENTS")
    print("=" * 50)
    
    with app.app_context():
        # Vérifier les données
        total_clients = Client.query.count()
        
        print(f"📊 Données disponibles:")
        print(f"   - Clients: {total_clients}")
        
        if total_clients == 0:
            print("❌ Aucun client trouvé!")
            return
        
        # Lister les clients disponibles
        print(f"\n👥 Clients disponibles:")
        clients = Client.query.all()
        for i, client in enumerate(clients, 1):
            print(f"   {i}. {client.nom} - {client.ville} - {client.telephone}")
        
        # Obtenir la liste des villes
        villes = db.session.query(Client.ville).distinct().order_by(Client.ville).all()
        villes_list = [ville[0] for ville in villes if ville[0]]
        print(f"\n🏙️ Villes disponibles: {', '.join(villes_list)}")
        
        # Test de recherche sur différents champs
        test_searches = [
            ("SERVICIOS", "Recherche par nom"),
            ("MINISTERIO", "Recherche par nom"),
            ("ELISEO", "Recherche par nom"),
            ("240", "Recherche par téléphone"),
            ("192.168", "Recherche par IP"),
            ("Malabo", "Recherche par ville"),
            ("Calle", "Recherche par adresse"),
        ]
        
        print(f"\n🧪 Tests de recherche:")
        
        for search_term, description in test_searches:
            print(f"\n   🔍 {description}: '{search_term}'")
            
            # Test avec la nouvelle logique
            query = Client.query.filter(
                db.or_(
                    Client.nom.contains(search_term),
                    Client.telephone.contains(search_term),
                    Client.adresse.contains(search_term),
                    Client.ville.contains(search_term),
                    Client.ip_router.contains(search_term),
                    Client.ip_antea.contains(search_term)
                )
            )
            
            results = query.all()
            print(f"      Résultats: {len(results)} clients trouvés")
            
            if results:
                for client in results:
                    print(f"        - {client.nom} ({client.ville})")
        
        # Test de pagination
        print(f"\n📄 Test de pagination:")
        
        page_sizes = [5, 10, 25]
        for per_page in page_sizes:
            paginated = Client.query.order_by(Client.nom.asc()).paginate(
                page=1, 
                per_page=per_page, 
                error_out=False
            )
            
            print(f"   Page 1 avec {per_page} éléments:")
            print(f"      - Total: {paginated.total}")
            print(f"      - Pages: {paginated.pages}")
            print(f"      - Éléments affichés: {len(paginated.items)}")
            print(f"      - A suivant: {paginated.has_next}")
        
        # Test via la route web
        print(f"\n🌐 Test via route web:")
        
        with app.test_client() as client_test:
            test_cases = [
                ("", "", "Page par défaut"),
                ("SERVICIOS", "", "Recherche SERVICIOS"),
                ("", "Malabo", "Filtre ville Malabo"),
                ("240", "", "Recherche téléphone"),
                ("192.168", "", "Recherche IP"),
            ]
            
            for search_query, ville_filter, description in test_cases:
                params = []
                if search_query:
                    params.append(f"search={search_query}")
                if ville_filter:
                    params.append(f"ville={ville_filter}")
                
                url = "/clients"
                if params:
                    url += "?" + "&".join(params)
                
                response = client_test.get(url)
                print(f"   {description}: HTTP {response.status_code}")
                
                if response.status_code == 200:
                    content = response.get_data(as_text=True)
                    client_count = content.count('<td><strong>#')
                    print(f"      → {client_count} clients affichés")
                    
                    # Vérifier la pagination
                    if "Página" in content:
                        print(f"      → Pagination détectée")
                    
                    # Vérifier les filtres
                    if search_query and search_query in content:
                        print(f"      → Terme de recherche conservé")
                else:
                    print(f"      → Erreur: {response.status_code}")
        
        print(f"\n✅ Test terminé!")

if __name__ == "__main__":
    test_pagination_clients() 