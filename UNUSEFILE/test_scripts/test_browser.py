#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour simuler ce que voit le navigateur
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident

def test_browser_view():
    """Tester exactement ce que voit le navigateur"""
    
    print("🌐 TEST SIMULATION NAVIGATEUR")
    print("=" * 40)
    
    with app.test_client() as client:
        print("1️⃣ Test de la page incidents...")
        
        # Test de la route principale
        response = client.get('/incidents')
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.get_data(as_text=True)
            
            # Sauvegarder le HTML complet
            with open('debug_page_complete.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print("   ✅ Page sauvegardée dans debug_page_complete.html")
            
            # Analyser le contenu
            print("\n2️⃣ Analyse du contenu HTML...")
            
            # Vérifier les éléments clés
            checks = {
                'DOCTYPE': '<!DOCTYPE html>' in content,
                'HTML tag': '<html' in content,
                'HEAD section': '<head>' in content,
                'BODY section': '<body>' in content,
                'Bootstrap CSS': 'bootstrap' in content,
                'FontAwesome': 'fontawesome' in content or 'fa-' in content,
                'Title page': 'Lista de las Incidencias' in content,
                'Card container': 'card content-card' in content,
                'Table element': '<table class="table table-hover' in content,
                'Table header': '<thead>' in content,
                'Table body': '<tbody>' in content,
                'Incident rows': '<td><strong>#' in content,
                'Pagination': 'pagination' in content,
                'JavaScript': '<script>' in content,
            }
            
            for check_name, result in checks.items():
                status = "✅" if result else "❌"
                print(f"   {status} {check_name}")
            
            # Compter les incidents
            incident_count = content.count('<td><strong>#')
            print(f"\n   📊 Incidents trouvés dans HTML: {incident_count}")
            
            # Vérifier les erreurs JavaScript potentielles
            if 'incidents.items' in content:
                print("   ✅ Template utilise incidents.items")
            else:
                print("   ❌ Template n'utilise pas incidents.items")
            
            # Extraire un échantillon de la table
            if '<tbody>' in content and '</tbody>' in content:
                tbody_start = content.find('<tbody>')
                tbody_end = content.find('</tbody>') + 8
                tbody_content = content[tbody_start:tbody_end]
                
                print(f"\n3️⃣ Contenu de la table (extrait):")
                print("   " + "="*50)
                print("   " + tbody_content[:500] + "...")
                print("   " + "="*50)
            
            # Vérifier les conditions else
            if 'No hay incidentes registrados' in content:
                print("   ⚠️  Message 'Aucun incident' affiché")
            elif 'No se encontraron incidentes' in content:
                print("   ⚠️  Message 'Aucun résultat' affiché")
            else:
                print("   ✅ Pas de message d'erreur affiché")
            
        else:
            print(f"   ❌ Erreur HTTP: {response.status_code}")
            print(f"   Contenu: {response.get_data(as_text=True)}")
    
    # Test avec la base de données
    print(f"\n4️⃣ Vérification base de données...")
    with app.app_context():
        total = Incident.query.count()
        print(f"   Total incidents en DB: {total}")
        
        if total > 0:
            # Afficher les 3 premiers
            incidents = Incident.query.limit(3).all()
            print(f"   Premiers incidents:")
            for i, incident in enumerate(incidents, 1):
                print(f"     {i}. #{incident.id} - {incident.intitule[:30]}... - {incident.status}")
    
    print(f"\n🎯 CONCLUSION:")
    print(f"   - Si debug_page_complete.html contient les incidents, le problème vient du navigateur")
    print(f"   - Sinon, le problème vient du serveur Flask")
    print(f"   - Ouvrez debug_page_complete.html dans votre navigateur pour comparer")

if __name__ == "__main__":
    test_browser_view() 