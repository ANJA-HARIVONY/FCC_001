#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour nettoyer la colonne observations de la table incident
Supprime le texte "Incident migré depuis CSV. Bitrix: " en gardant uniquement les chiffres
"""

import re
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Configuration de l'application Flask pour accéder à la base de données
app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

# Modèle Incident (simplifié pour ce script)
class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    observations = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Incident {self.id}>'

def clean_observations():
    """
    Nettoie la colonne observations de tous les incidents
    Supprime "Incident migré depuis CSV. Bitrix: " et garde seulement les chiffres
    """
    print("🔍 Début du nettoyage de la colonne observations...")
    
    with app.app_context():
        try:
            # Compter le nombre total d'incidents
            total_incidents = Incident.query.count()
            print(f"📊 Total d'incidents dans la base: {total_incidents}")
            
            # Trouver les incidents avec le texte à nettoyer
            pattern_to_clean = "Incident migré depuis CSV. Bitrix: "
            incidents_to_clean = Incident.query.filter(
                Incident.observations.like(f'%{pattern_to_clean}%')
            ).all()
            
            print(f"🎯 Incidents à nettoyer trouvés: {len(incidents_to_clean)}")
            
            if len(incidents_to_clean) == 0:
                print("✅ Aucun incident à nettoyer trouvé.")
                return
            
            # Afficher quelques exemples avant nettoyage
            print("\n📋 Exemples d'observations avant nettoyage:")
            for i, incident in enumerate(incidents_to_clean[:5]):
                print(f"  ID {incident.id}: {incident.observations[:100]}...")
                if i >= 4:  # Limiter à 5 exemples
                    break
            
            # Demander confirmation
            response = input(f"\n❓ Voulez-vous procéder au nettoyage de {len(incidents_to_clean)} incidents? (oui/non): ")
            if response.lower() not in ['oui', 'o', 'yes', 'y']:
                print("❌ Opération annulée.")
                return
            
            # Compteurs pour le rapport
            cleaned_count = 0
            error_count = 0
            
            print("\n🧹 Début du nettoyage...")
            
            for incident in incidents_to_clean:
                try:
                    original_observation = incident.observations
                    
                    if original_observation and pattern_to_clean in original_observation:
                        # Extraire uniquement les chiffres après le pattern
                        # Rechercher le pattern et récupérer ce qui suit
                        match = re.search(rf'{re.escape(pattern_to_clean)}(\d+)', original_observation)
                        
                        if match:
                            # Garder seulement le numéro Bitrix
                            new_observation = match.group(1)
                        else:
                            # Si pas de chiffres trouvés, supprimer complètement le pattern
                            new_observation = original_observation.replace(pattern_to_clean, "").strip()
                        
                        # Mettre à jour l'incident
                        incident.observations = new_observation
                        cleaned_count += 1
                        
                        print(f"  ✅ ID {incident.id}: '{original_observation[:50]}...' → '{new_observation}'")
                
                except Exception as e:
                    error_count += 1
                    print(f"  ❌ Erreur pour l'incident ID {incident.id}: {str(e)}")
            
            # Sauvegarder les changements
            try:
                db.session.commit()
                print(f"\n💾 Changements sauvegardés avec succès!")
                print(f"📈 Résumé:")
                print(f"   - Incidents nettoyés: {cleaned_count}")
                print(f"   - Erreurs: {error_count}")
                print(f"   - Total traité: {len(incidents_to_clean)}")
                
                # Vérifier le résultat
                remaining_incidents = Incident.query.filter(
                    Incident.observations.like(f'%{pattern_to_clean}%')
                ).count()
                print(f"   - Incidents restants avec le pattern: {remaining_incidents}")
                
            except Exception as e:
                db.session.rollback()
                print(f"❌ Erreur lors de la sauvegarde: {str(e)}")
                
        except Exception as e:
            print(f"❌ Erreur générale: {str(e)}")

def preview_changes():
    """
    Aperçu des changements sans les appliquer
    """
    print("👀 Aperçu des changements (aucune modification ne sera appliquée)...")
    
    with app.app_context():
        try:
            pattern_to_clean = "Incident migré depuis CSV. Bitrix: "
            incidents_to_clean = Incident.query.filter(
                Incident.observations.like(f'%{pattern_to_clean}%')
            ).limit(10).all()  # Limiter à 10 pour l'aperçu
            
            print(f"🔍 Aperçu sur {len(incidents_to_clean)} premiers incidents:")
            
            for incident in incidents_to_clean:
                original = incident.observations
                
                # Simulation du nettoyage
                match = re.search(rf'{re.escape(pattern_to_clean)}(\d+)', original)
                if match:
                    new_observation = match.group(1)
                else:
                    new_observation = original.replace(pattern_to_clean, "").strip()
                
                print(f"\n  ID {incident.id}:")
                print(f"    AVANT: {original}")
                print(f"    APRÈS: {new_observation}")
                
        except Exception as e:
            print(f"❌ Erreur: {str(e)}")

def main():
    """
    Fonction principale avec menu
    """
    print("=" * 60)
    print("🧹 SCRIPT DE NETTOYAGE DES OBSERVATIONS")
    print("=" * 60)
    print()
    print("Ce script va nettoyer la colonne 'observations' de la table 'incident'")
    print("Il supprime le texte 'Incident migré depuis CSV. Bitrix: ' en gardant les chiffres")
    print()
    
    while True:
        print("\nOptions disponibles:")
        print("1. 👀 Aperçu des changements (sans modification)")
        print("2. 🧹 Nettoyer les observations")
        print("3. 🚪 Quitter")
        
        choice = input("\nVotre choix (1-3): ").strip()
        
        if choice == "1":
            preview_changes()
        elif choice == "2":
            clean_observations()
        elif choice == "3":
            print("👋 Au revoir!")
            break
        else:
            print("❌ Choix invalide. Veuillez choisir 1, 2 ou 3.")

if __name__ == "__main__":
    main() 