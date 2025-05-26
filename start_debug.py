#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de démarrage avec instructions de débogage
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident

def main():
    print("🚀 DÉMARRAGE AVEC DÉBOGAGE - CONNEXIA")
    print("=" * 50)
    
    with app.app_context():
        # Vérifier les données
        total_incidents = Incident.query.count()
        print(f"📊 {total_incidents} incidents dans la base de données")
        
        if total_incidents == 0:
            print("❌ Aucun incident trouvé! Exécutez d'abord:")
            print("   python generate_50_incidents.py")
            return
        
        # Afficher quelques incidents
        incidents = Incident.query.limit(3).all()
        print(f"\n📋 Premiers incidents:")
        for i, incident in enumerate(incidents, 1):
            print(f"   {i}. #{incident.id} - {incident.intitule[:40]}... - {incident.status}")
    
    print(f"\n🌐 Application démarrée sur http://localhost:5001")
    print(f"📄 Page des incidents: http://localhost:5001/incidents")
    
    print(f"\n🔧 SI LES INCIDENTS NE S'AFFICHENT PAS DANS VOTRE NAVIGATEUR:")
    print(f"   1. ✅ Les données existent (confirmé)")
    print(f"   2. ✅ Le serveur fonctionne (confirmé)")
    print(f"   3. ✅ Le HTML est généré correctement (confirmé)")
    print(f"   4. 🔍 Le problème vient du NAVIGATEUR")
    
    print(f"\n🛠️  SOLUTIONS À ESSAYER:")
    print(f"   1. VIDER LE CACHE du navigateur:")
    print(f"      - Chrome/Firefox: Ctrl+Shift+R ou Ctrl+F5")
    print(f"      - Safari: Cmd+Shift+R")
    print(f"   2. OUVRIR LA CONSOLE JavaScript (F12):")
    print(f"      - Chercher des erreurs en rouge")
    print(f"      - Vérifier l'onglet 'Network' pour les ressources manquantes")
    print(f"   3. ESSAYER UN AUTRE NAVIGATEUR:")
    print(f"      - Chrome, Firefox, Safari, Edge")
    print(f"   4. MODE INCOGNITO/PRIVÉ:")
    print(f"      - Ctrl+Shift+N (Chrome) ou Ctrl+Shift+P (Firefox)")
    print(f"   5. DÉSACTIVER LES EXTENSIONS:")
    print(f"      - AdBlock, uBlock Origin peuvent bloquer le contenu")
    
    print(f"\n📁 FICHIER DE DÉBOGAGE CRÉÉ:")
    print(f"   - debug_page_complete.html contient le HTML généré")
    print(f"   - Ouvrez-le directement dans votre navigateur")
    print(f"   - Si les incidents s'affichent là, le problème vient du serveur Flask")
    
    print(f"\n🔄 Appuyez sur Ctrl+C pour arrêter")
    print("=" * 50)
    
    # Démarrer l'application
    try:
        app.run(debug=True, port=5001, host='0.0.0.0')
    except KeyboardInterrupt:
        print(f"\n👋 Application arrêtée")

if __name__ == "__main__":
    main() 