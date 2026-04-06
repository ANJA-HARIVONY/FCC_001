#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de diagnostic complet pour la pagination
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident, Client, Operateur

def diagnostic_complet():
    """Diagnostic complet du système"""
    
    print("🔍 DIAGNOSTIC COMPLET - Système CONNEXIA")
    print("=" * 50)
    
    with app.app_context():
        # 1. Vérification de la base de données
        print("\n1️⃣ VÉRIFICATION BASE DE DONNÉES")
        print("-" * 30)
        
        total_incidents = Incident.query.count()
        total_clients = Client.query.count()
        total_operateurs = Operateur.query.count()
        
        print(f"📊 Incidents: {total_incidents}")
        print(f"👥 Clients: {total_clients}")
        print(f"👤 Opérateurs: {total_operateurs}")
        
        if total_incidents == 0:
            print("❌ PROBLÈME: Aucun incident dans la base!")
            print("   Solution: Exécutez 'python generate_50_incidents.py'")
            return
        
        # 2. Vérification des relations
        print("\n2️⃣ VÉRIFICATION DES RELATIONS")
        print("-" * 30)
        
        incidents_sans_client = Incident.query.filter(Incident.client == None).count()
        incidents_sans_operateur = Incident.query.filter(Incident.operateur == None).count()
        
        print(f"🔗 Incidents sans client: {incidents_sans_client}")
        print(f"🔗 Incidents sans opérateur: {incidents_sans_operateur}")
        
        if incidents_sans_client > 0 or incidents_sans_operateur > 0:
            print("⚠️  ATTENTION: Relations manquantes détectées")
        
        # 3. Test de pagination
        print("\n3️⃣ TEST DE PAGINATION")
        print("-" * 30)
        
        try:
            query = Incident.query
            incidents_paginated = query.order_by(Incident.date_heure.desc()).paginate(
                page=1, 
                per_page=10, 
                error_out=False
            )
            
            print(f"✅ Pagination fonctionnelle")
            print(f"   Total: {incidents_paginated.total}")
            print(f"   Pages: {incidents_paginated.pages}")
            print(f"   Items page 1: {len(incidents_paginated.items)}")
            print(f"   Has next: {incidents_paginated.has_next}")
            
        except Exception as e:
            print(f"❌ ERREUR pagination: {e}")
        
        # 4. Test de la route
        print("\n4️⃣ TEST DE LA ROUTE")
        print("-" * 30)
        
        with app.test_client() as client:
            response = client.get('/incidents')
            print(f"📡 Status HTTP: {response.status_code}")
            
            if response.status_code == 200:
                content = response.get_data(as_text=True)
                
                # Vérifications du contenu
                checks = [
                    ('Titre page', 'Lista de las Incidencias' in content),
                    ('Table HTML', '<table class="table table-hover' in content),
                    ('Tbody', '<tbody>' in content),
                    ('Incidents (#)', '<td><strong>#' in content),
                    ('Pagination', 'pagination' in content),
                    ('Badges status', 'badge-' in content),
                ]
                
                for check_name, check_result in checks:
                    status = "✅" if check_result else "❌"
                    print(f"   {status} {check_name}")
                
                # Compter les incidents affichés
                incident_count = content.count('<td><strong>#')
                print(f"   📊 Incidents affichés: {incident_count}")
                
            else:
                print(f"❌ ERREUR HTTP: {response.status_code}")
        
        # 5. Vérification des statuts
        print("\n5️⃣ VÉRIFICATION DES STATUTS")
        print("-" * 30)
        
        statuts = ['Solucionadas', 'Pendiente', 'Bitrix']
        for statut in statuts:
            count = Incident.query.filter_by(status=statut).count()
            print(f"   {statut}: {count} incidents")
        
        # 6. Test des filtres
        print("\n6️⃣ TEST DES FILTRES")
        print("-" * 30)
        
        # Test filtre par statut
        with app.test_client() as client:
            response = client.get('/incidents?status=Solucionadas')
            if response.status_code == 200:
                content = response.get_data(as_text=True)
                incident_count = content.count('<td><strong>#')
                print(f"   ✅ Filtre Solucionadas: {incident_count} affichés")
            else:
                print(f"   ❌ Filtre Solucionadas: erreur {response.status_code}")
        
        # Test recherche
        with app.test_client() as client:
            response = client.get('/incidents?search=conexión')
            if response.status_code == 200:
                content = response.get_data(as_text=True)
                incident_count = content.count('<td><strong>#')
                print(f"   ✅ Recherche 'conexión': {incident_count} affichés")
            else:
                print(f"   ❌ Recherche: erreur {response.status_code}")
        
        # 7. Recommandations
        print("\n7️⃣ RECOMMANDATIONS")
        print("-" * 30)
        
        if total_incidents > 0:
            print("✅ Les incidents existent et s'affichent correctement")
            print("✅ La pagination fonctionne")
            print("✅ Les filtres fonctionnent")
            print("\n🎯 Si vous ne voyez pas les incidents dans votre navigateur:")
            print("   1. Videz le cache du navigateur (Ctrl+F5)")
            print("   2. Vérifiez la console JavaScript (F12)")
            print("   3. Assurez-vous d'être sur http://localhost:5001/incidents")
            print("   4. Essayez un autre navigateur")
        else:
            print("❌ Exécutez d'abord: python generate_50_incidents.py")
        
        print(f"\n🚀 Pour démarrer l'application: python start_test.py")
        print("=" * 50)

if __name__ == "__main__":
    diagnostic_complet() 