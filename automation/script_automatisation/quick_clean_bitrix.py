#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script rapide pour nettoyer uniquement le pattern "Incident migré depuis CSV. Bitrix: "
Garde seulement les chiffres après "Bitrix: "
"""

import re
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Configuration Flask
app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    observations = db.Column(db.Text)

def quick_clean():
    """
    Nettoyage rapide du pattern Bitrix
    """
    pattern_to_remove = ":"
    
    print("🔍 Recherche des incidents avec le pattern Bitrix...")
    
    with app.app_context():
        # Trouver tous les incidents avec ce pattern
        incidents = Incident.query.filter(
            Incident.observations.like(f'%{pattern_to_remove}%')
        ).all()
        
        if not incidents:
            print("✅ Aucun incident trouvé avec ce pattern.")
            return
        
        print(f"📊 Incidents trouvés: {len(incidents)}")
        
        # Afficher quelques exemples
        print("\n📋 Exemples (5 premiers):")
        for i, incident in enumerate(incidents[:5]):
            original = incident.observations
            # Extraire le numéro après "Bitrix: "
            match = re.search(r'Incident migré depuis CSV\. Bitrix: (\d+)', original)
            if match:
                new_value = match.group(1)
            else:
                new_value = original.replace(pattern_to_remove, "").strip()
            
            print(f"  ID {incident.id}:")
            print(f"    AVANT: {original}")
            print(f"    APRÈS: {new_value}")
            print()
        
        # Demander confirmation
        if len(sys.argv) > 1 and sys.argv[1] == '--force':
            confirm = 'oui'
        else:
            confirm = input(f"Procéder au nettoyage de {len(incidents)} incidents? (oui/non): ")
        
        if confirm.lower() not in ['oui', 'o', 'yes', 'y']:
            print("❌ Opération annulée.")
            return
        
        # Nettoyer
        cleaned_count = 0
        for incident in incidents:
            original = incident.observations
            
            # Utiliser regex pour extraire seulement le numéro
            match = re.search(r'Incident migré depuis CSV\. Bitrix: (\d+)', original)
            if match:
                # Garder seulement le numéro Bitrix
                incident.observations = match.group(1)
                cleaned_count += 1
                print(f"✅ ID {incident.id}: '{original}' → '{incident.observations}'")
            else:
                # Fallback: supprimer le pattern complètement
                new_obs = original.replace(pattern_to_remove, "").strip()
                if new_obs != original:
                    incident.observations = new_obs
                    cleaned_count += 1
                    print(f"✅ ID {incident.id}: Pattern supprimé")
        
        # Sauvegarder
        try:
            db.session.commit()
            print(f"\n💾 ✅ Nettoyage terminé!")
            print(f"📈 {cleaned_count} incidents nettoyés avec succès.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erreur lors de la sauvegarde: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("🧹 NETTOYAGE RAPIDE BITRIX")
    print("=" * 50)
    print("Supprime: 'Incident migré depuis CSV. Bitrix: '")
    print("Garde: Seulement les chiffres")
    print()
    
    quick_clean() 