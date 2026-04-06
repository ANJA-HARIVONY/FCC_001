#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour diagnostiquer le problème de pagination
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident, Client, Operateur

def test_pagination():
    """Tester la pagination des incidents"""
    
    with app.app_context():
        print("🔍 Test de la pagination des incidents...")
        
        # Vérifier les données
        total_incidents = Incident.query.count()
        total_clients = Client.query.count()
        total_operateurs = Operateur.query.count()
        
        print(f"📊 Données disponibles:")
        print(f"   - Incidents: {total_incidents}")
        print(f"   - Clients: {total_clients}")
        print(f"   - Opérateurs: {total_operateurs}")
        
        if total_incidents == 0:
            print("❌ Aucun incident trouvé!")
            return
        
        # Test de la pagination
        print(f"\n🧪 Test de pagination...")
        
        try:
            # Test avec paramètres par défaut
            page = 1
            per_page = 10
            
            query = Incident.query
            incidents_paginated = query.order_by(Incident.date_heure.desc()).paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            print(f"✅ Pagination réussie:")
            print(f"   - Total: {incidents_paginated.total}")
            print(f"   - Pages: {incidents_paginated.pages}")
            print(f"   - Page actuelle: {incidents_paginated.page}")
            print(f"   - Items sur cette page: {len(incidents_paginated.items)}")
            print(f"   - Has prev: {incidents_paginated.has_prev}")
            print(f"   - Has next: {incidents_paginated.has_next}")
            
            # Afficher quelques incidents
            print(f"\n📋 Premiers incidents:")
            for i, incident in enumerate(incidents_paginated.items[:5]):
                print(f"   {i+1}. #{incident.id} - {incident.intitule[:50]}... - {incident.status}")
                print(f"      Client: {incident.client.nom if incident.client else 'N/A'}")
                print(f"      Opérateur: {incident.operateur.nom if incident.operateur else 'N/A'}")
                print(f"      Date: {incident.date_heure}")
                print()
            
            # Test avec filtres
            print(f"🔍 Test avec filtre status='Solucionadas':")
            query_filtered = Incident.query.filter(Incident.status == 'Solucionadas')
            incidents_filtered = query_filtered.order_by(Incident.date_heure.desc()).paginate(
                page=1, 
                per_page=5, 
                error_out=False
            )
            
            print(f"   - Total Solucionadas: {incidents_filtered.total}")
            print(f"   - Items sur page 1: {len(incidents_filtered.items)}")
            
            # Test avec recherche
            print(f"🔍 Test avec recherche 'conexión':")
            query_search = Incident.query.filter(
                db.or_(
                    Incident.intitule.contains('conexión'),
                    Incident.observations.contains('conexión')
                )
            )
            incidents_search = query_search.order_by(Incident.date_heure.desc()).paginate(
                page=1, 
                per_page=5, 
                error_out=False
            )
            
            print(f"   - Total avec 'conexión': {incidents_search.total}")
            print(f"   - Items sur page 1: {len(incidents_search.items)}")
            
        except Exception as e:
            print(f"❌ Erreur lors de la pagination: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n✅ Test terminé!")

if __name__ == "__main__":
    test_pagination() 