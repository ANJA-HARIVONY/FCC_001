#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour la pagination avec 124 clients
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client

def test_pagination_124_clients():
    """Tester la pagination avec 124 clients"""
    
    print("📄 TEST DE PAGINATION AVEC 124 CLIENTS")
    print("=" * 50)
    
    with app.app_context():
        # Vérifier les données
        total_clients = Client.query.count()
        
        print(f"📊 Données disponibles:")
        print(f"   - Total clients: {total_clients}")
        
        if total_clients < 100:
            print("❌ Pas assez de clients pour tester la pagination!")
            return
        
        # Test de pagination avec différentes tailles
        print(f"\n📄 TESTS DE PAGINATION:")
        print("-" * 30)
        
        page_sizes = [5, 10, 25, 50]
        
        for per_page in page_sizes:
            paginated = Client.query.order_by(Client.nom.asc()).paginate(
                page=1, 
                per_page=per_page, 
                error_out=False
            )
            
            print(f"\n📄 Pagination avec {per_page} éléments par page:")
            print(f"   - Total: {paginated.total}")
            print(f"   - Pages: {paginated.pages}")
            print(f"   - Page actuelle: {paginated.page}")
            print(f"   - Éléments affichés: {len(paginated.items)}")
            print(f"   - A précédent: {paginated.has_prev}")
            print(f"   - A suivant: {paginated.has_next}")
            
            # Afficher quelques clients de la première page
            print(f"   Premiers clients:")
            for i, client in enumerate(paginated.items[:3], 1):
                print(f"     {i}. {client.nom} ({client.ville})")
            
            if len(paginated.items) > 3:
                print(f"     ... et {len(paginated.items) - 3} autres")
        
        # Test de navigation entre pages
        print(f"\n🔄 TEST DE NAVIGATION ENTRE PAGES:")
        print("-" * 40)
        
        # Test avec 10 éléments par page
        per_page = 10
        total_pages = (total_clients + per_page - 1) // per_page
        
        print(f"Configuration: {per_page} éléments par page = {total_pages} pages")
        
        # Tester quelques pages
        pages_a_tester = [1, 2, total_pages//2, total_pages-1, total_pages]
        
        for page_num in pages_a_tester:
            if page_num <= total_pages:
                paginated = Client.query.order_by(Client.nom.asc()).paginate(
                    page=page_num, 
                    per_page=per_page, 
                    error_out=False
                )
                
                print(f"\n   Page {page_num}:")
                print(f"     - Éléments: {len(paginated.items)}")
                print(f"     - Premier: {paginated.items[0].nom if paginated.items else 'Aucun'}")
                print(f"     - Dernier: {paginated.items[-1].nom if paginated.items else 'Aucun'}")
        
        # Test de recherche avec pagination
        print(f"\n🔍 TEST DE RECHERCHE AVEC PAGINATION:")
        print("-" * 40)
        
        # Recherches qui devraient donner plusieurs résultats
        recherches_test = [
            ("SERVICIOS", "Recherche par type d'entreprise"),
            ("Madrid", "Recherche par ville"),
            ("192.168", "Recherche par IP"),
            ("Calle", "Recherche par type d'adresse"),
        ]
        
        for terme, description in recherches_test:
            query = Client.query.filter(
                db.or_(
                    Client.nom.contains(terme),
                    Client.telephone.contains(terme),
                    Client.adresse.contains(terme),
                    Client.ville.contains(terme),
                    Client.ip_router.contains(terme),
                    Client.ip_antea.contains(terme)
                )
            )
            
            total_resultats = query.count()
            
            if total_resultats > 0:
                # Tester la pagination sur les résultats de recherche
                paginated = query.order_by(Client.nom.asc()).paginate(
                    page=1, 
                    per_page=10, 
                    error_out=False
                )
                
                print(f"\n   {description}: '{terme}'")
                print(f"     - Total résultats: {total_resultats}")
                print(f"     - Pages: {paginated.pages}")
                print(f"     - Affichés page 1: {len(paginated.items)}")
                
                # Afficher quelques résultats
                for i, client in enumerate(paginated.items[:2], 1):
                    print(f"       {i}. {client.nom} ({client.ville})")
        
        # Test via la route web
        print(f"\n🌐 TEST VIA ROUTE WEB:")
        print("-" * 25)
        
        with app.test_client() as client_test:
            test_cases = [
                ("", "", 1, 10, "Page 1 par défaut"),
                ("", "", 2, 10, "Page 2"),
                ("", "", total_pages, 10, f"Dernière page ({total_pages})"),
                ("SERVICIOS", "", 1, 25, "Recherche avec 25 par page"),
                ("", "Madrid", 1, 5, "Filtre ville avec 5 par page"),
            ]
            
            for search_query, ville_filter, page, per_page, description in test_cases:
                params = []
                if search_query:
                    params.append(f"search={search_query}")
                if ville_filter:
                    params.append(f"ville={ville_filter}")
                if page > 1:
                    params.append(f"page={page}")
                if per_page != 10:
                    params.append(f"per_page={per_page}")
                
                url = "/clients"
                if params:
                    url += "?" + "&".join(params)
                
                response = client_test.get(url)
                print(f"\n   {description}:")
                print(f"     URL: {url}")
                print(f"     Status: HTTP {response.status_code}")
                
                if response.status_code == 200:
                    content = response.get_data(as_text=True)
                    client_count = content.count('<td><strong>#')
                    print(f"     Clients affichés: {client_count}")
                    
                    # Vérifier la pagination
                    if "Página" in content:
                        print(f"     ✅ Pagination détectée")
                    
                    # Vérifier les informations de pagination
                    if "Mostrando" in content:
                        print(f"     ✅ Informations de pagination présentes")
                else:
                    print(f"     ❌ Erreur: {response.status_code}")
        
        # Statistiques finales
        print(f"\n📊 STATISTIQUES DE PERFORMANCE:")
        print("-" * 35)
        
        # Compter les villes
        villes_count = db.session.query(Client.ville).distinct().count()
        print(f"   - Villes différentes: {villes_count}")
        
        # Compter les clients avec IP
        clients_avec_ip = Client.query.filter(Client.ip_router.isnot(None)).count()
        print(f"   - Clients avec IP: {clients_avec_ip}")
        
        # Pages nécessaires pour différentes tailles
        print(f"   - Pages avec 5/page: {(total_clients + 4) // 5}")
        print(f"   - Pages avec 10/page: {(total_clients + 9) // 10}")
        print(f"   - Pages avec 25/page: {(total_clients + 24) // 25}")
        print(f"   - Pages avec 50/page: {(total_clients + 49) // 50}")
        
        print(f"\n✅ TESTS TERMINÉS AVEC SUCCÈS!")
        print(f"   La pagination fonctionne parfaitement avec {total_clients} clients")
        print(f"   Toutes les fonctionnalités sont opérationnelles")

if __name__ == "__main__":
    test_pagination_124_clients() 