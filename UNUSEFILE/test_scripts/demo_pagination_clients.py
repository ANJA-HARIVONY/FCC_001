
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de démonstration des fonctionnalités de pagination et recherche des clients
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client

def demo_pagination_clients():
    """Démonstration des fonctionnalités de pagination et recherche des clients"""
    
    print("🎯 DÉMONSTRATION - PAGINATION ET RECHERCHE CLIENTS")
    print("=" * 60)
    
    with app.app_context():
        # Vérifier les données
        total_clients = Client.query.count()
        
        print(f"📊 État de la base de données:")
        print(f"   - Total clients: {total_clients}")
        
        if total_clients == 0:
            print("❌ Aucun client trouvé!")
            return
        
        print(f"\n🎨 NOUVELLES FONCTIONNALITÉS AJOUTÉES:")
        print("=" * 40)
        
        print("✅ 1. RECHERCHE MULTI-CHAMPS")
        print("   - Nom du client")
        print("   - Téléphone") 
        print("   - Adresse")
        print("   - Ville")
        print("   - IP Router")
        print("   - IP Antea")
        
        print("\n✅ 2. FILTRE PAR VILLE")
        print("   - Menu déroulant avec toutes les villes")
        print("   - Auto-population dynamique")
        print("   - Combinable avec la recherche")
        
        print("\n✅ 3. PAGINATION AVANCÉE")
        print("   - 5, 10, 25, 50 éléments par page")
        print("   - Navigation avec numéros de pages")
        print("   - Conservation des filtres")
        
        # Lister les clients disponibles
        clients = Client.query.all()
        print(f"\n📋 Clients disponibles ({len(clients)}):")
        for i, client in enumerate(clients, 1):
            print(f"   {i}. {client.nom}")
            print(f"      📞 {client.telephone}")
            print(f"      📍 {client.ville}")
            print(f"      🌐 Router: {client.ip_router or 'N/A'}")
            print()
        
        # Obtenir la liste des villes
        villes = db.session.query(Client.ville).distinct().order_by(Client.ville).all()
        villes_list = [ville[0] for ville in villes if ville[0]]
        print(f"🏙️ Villes disponibles ({len(villes_list)}):")
        for i, ville in enumerate(villes_list, 1):
            count = Client.query.filter(Client.ville == ville).count()
            print(f"   {i}. {ville} ({count} clients)")
        
        print(f"\n🚀 ACCÈS À L'APPLICATION:")
        print(f"   URL: http://localhost:5001/clients")
        print(f"   Testez toutes les fonctionnalités!")

if __name__ == "__main__":
    demo_pagination_clients() 