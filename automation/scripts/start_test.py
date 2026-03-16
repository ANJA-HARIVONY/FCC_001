#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour démarrer l'application en mode test
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Incident

def main():
    print("🚀 Démarrage de l'application de test...")
    
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
    print(f"🔄 Appuyez sur Ctrl+C pour arrêter")
    
    # Démarrer l'application
    app.run(debug=True, port=5001, host='0.0.0.0')

if __name__ == "__main__":
    main() 