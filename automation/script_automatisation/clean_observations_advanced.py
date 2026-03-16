#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script avancé pour nettoyer la colonne observations de la table incident
Version avec sauvegarde automatique et gestion de multiples patterns
"""

import re
import json
import os
from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Configuration de l'application Flask
app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

# Modèle Incident complet
class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_client = db.Column(db.Integer, nullable=False)
    intitule = db.Column(db.String(200), nullable=False)
    observations = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default='Pendiente')
    id_operateur = db.Column(db.Integer, nullable=False)
    date_heure = db.Column(db.DateTime, nullable=False)
    
    def __repr__(self):
        return f'<Incident {self.id}>'

# Patterns de nettoyage configurables
CLEANING_PATTERNS = {
    'bitrix_migration': {
        'pattern': 'Incident migré depuis CSV. Bitrix: ',
        'description': 'Supprime le préfixe de migration Bitrix en gardant le numéro',
        'regex': r'Incident migré depuis CSV\. Bitrix: (\d+)',
        'replacement': r'\1'  # Garde seulement le numéro
    },
    'remove_migration_prefix': {
        'pattern': 'Incident migré depuis CSV.',
        'description': 'Supprime complètement le préfixe de migration',
        'regex': r'Incident migré depuis CSV\.\s*',
        'replacement': ''
    },
    'clean_empty_bitrix': {
        'pattern': 'Bitrix: ',
        'description': 'Supprime "Bitrix: " sans numéro qui suit',
        'regex': r'Bitrix:\s*$',
        'replacement': ''
    }
}

def create_backup():
    """
    Crée une sauvegarde des observations avant modification
    """
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"observations_backup_{timestamp}.json")
    
    print(f"💾 Création d'une sauvegarde...")
    
    with app.app_context():
        try:
            incidents = Incident.query.all()
            backup_data = []
            
            for incident in incidents:
                backup_data.append({
                    'id': incident.id,
                    'observations': incident.observations
                })
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Sauvegarde créée: {backup_file}")
            return backup_file
            
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde: {str(e)}")
            return None

def restore_backup(backup_file):
    """
    Restaure une sauvegarde
    """
    if not os.path.exists(backup_file):
        print(f"❌ Fichier de sauvegarde non trouvé: {backup_file}")
        return False
    
    print(f"🔄 Restauration depuis: {backup_file}")
    
    with app.app_context():
        try:
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            restored_count = 0
            for item in backup_data:
                incident = Incident.query.get(item['id'])
                if incident:
                    incident.observations = item['observations']
                    restored_count += 1
            
            db.session.commit()
            print(f"✅ Restauration réussie: {restored_count} incidents restaurés")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erreur lors de la restauration: {str(e)}")
            return False

def analyze_observations():
    """
    Analyse les observations pour identifier les patterns
    """
    print("🔍 Analyse des observations...")
    
    with app.app_context():
        try:
            incidents = Incident.query.all()
            
            patterns_found = {}
            total_incidents = len(incidents)
            
            for pattern_name, pattern_config in CLEANING_PATTERNS.items():
                pattern = pattern_config['pattern']
                count = 0
                
                for incident in incidents:
                    if incident.observations and pattern in incident.observations:
                        count += 1
                
                patterns_found[pattern_name] = {
                    'count': count,
                    'description': pattern_config['description'],
                    'pattern': pattern
                }
            
            print(f"\n📊 Analyse sur {total_incidents} incidents:")
            print("-" * 50)
            
            for pattern_name, info in patterns_found.items():
                print(f"📌 {pattern_name}:")
                print(f"   Description: {info['description']}")
                print(f"   Pattern: '{info['pattern']}'")
                print(f"   Incidents trouvés: {info['count']}")
                print()
            
            return patterns_found
            
        except Exception as e:
            print(f"❌ Erreur lors de l'analyse: {str(e)}")
            return {}

def clean_observations_by_pattern(pattern_name, preview_only=False):
    """
    Nettoie les observations selon un pattern spécifique
    """
    if pattern_name not in CLEANING_PATTERNS:
        print(f"❌ Pattern '{pattern_name}' non reconnu")
        return False
    
    pattern_config = CLEANING_PATTERNS[pattern_name]
    action = "Aperçu" if preview_only else "Nettoyage"
    
    print(f"🧹 {action} avec le pattern: {pattern_name}")
    print(f"📝 Description: {pattern_config['description']}")
    
    with app.app_context():
        try:
            # Chercher les incidents avec ce pattern
            pattern_text = pattern_config['pattern']
            incidents_to_clean = Incident.query.filter(
                Incident.observations.like(f'%{pattern_text}%')
            ).all()
            
            if not incidents_to_clean:
                print("✅ Aucun incident trouvé avec ce pattern")
                return True
            
            print(f"🎯 Incidents trouvés: {len(incidents_to_clean)}")
            
            if not preview_only:
                # Créer une sauvegarde avant modification
                backup_file = create_backup()
                if not backup_file:
                    print("❌ Impossible de créer la sauvegarde. Opération annulée.")
                    return False
            
            cleaned_count = 0
            
            for incident in incidents_to_clean:
                if incident.observations:
                    original = incident.observations
                    
                    # Appliquer la regex de nettoyage
                    new_observation = re.sub(
                        pattern_config['regex'], 
                        pattern_config['replacement'], 
                        original
                    ).strip()
                    
                    if original != new_observation:
                        if preview_only:
                            print(f"\n  ID {incident.id}:")
                            print(f"    AVANT: {original}")
                            print(f"    APRÈS: {new_observation}")
                        else:
                            incident.observations = new_observation
                            print(f"  ✅ ID {incident.id}: Nettoyé")
                        
                        cleaned_count += 1
            
            if not preview_only and cleaned_count > 0:
                db.session.commit()
                print(f"\n💾 {cleaned_count} incidents nettoyés et sauvegardés!")
            elif preview_only:
                print(f"\n👀 Aperçu terminé: {cleaned_count} incidents seraient modifiés")
            
            return True
            
        except Exception as e:
            if not preview_only:
                db.session.rollback()
            print(f"❌ Erreur: {str(e)}")
            return False

def interactive_cleaning():
    """
    Mode interactif pour le nettoyage
    """
    while True:
        print("\n" + "="*60)
        print("🧹 NETTOYAGE INTERACTIF DES OBSERVATIONS")
        print("="*60)
        
        # Analyser les patterns disponibles
        patterns_found = analyze_observations()
        
        if not any(info['count'] > 0 for info in patterns_found.values()):
            print("✅ Aucun pattern à nettoyer trouvé!")
            return
        
        print("Options disponibles:")
        option_num = 1
        pattern_options = {}
        
        for pattern_name, info in patterns_found.items():
            if info['count'] > 0:
                print(f"{option_num}. 🧹 Nettoyer '{pattern_name}' ({info['count']} incidents)")
                pattern_options[str(option_num)] = pattern_name
                option_num += 1
        
        print(f"{option_num}. 👀 Mode aperçu")
        print(f"{option_num + 1}. 🚪 Retour au menu principal")
        
        choice = input(f"\nVotre choix (1-{option_num + 1}): ").strip()
        
        if choice in pattern_options:
            # Nettoyage direct
            pattern_name = pattern_options[choice]
            if input(f"Confirmer le nettoyage de '{pattern_name}'? (oui/non): ").lower() in ['oui', 'o', 'yes', 'y']:
                clean_observations_by_pattern(pattern_name, preview_only=False)
        elif choice == str(option_num):
            # Mode aperçu
            print("\nChoisissez un pattern pour l'aperçu:")
            for num, pattern_name in pattern_options.items():
                print(f"{num}. {pattern_name}")
            
            preview_choice = input("Votre choix: ").strip()
            if preview_choice in pattern_options:
                clean_observations_by_pattern(pattern_options[preview_choice], preview_only=True)
        elif choice == str(option_num + 1):
            break
        else:
            print("❌ Choix invalide")

def list_backups():
    """
    Liste les sauvegardes disponibles
    """
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        print("📁 Aucun dossier de sauvegarde trouvé")
        return []
    
    backups = []
    for filename in os.listdir(backup_dir):
        if filename.startswith("observations_backup_") and filename.endswith(".json"):
            filepath = os.path.join(backup_dir, filename)
            timestamp = os.path.getmtime(filepath)
            backups.append({
                'filename': filename,
                'filepath': filepath,
                'timestamp': datetime.fromtimestamp(timestamp)
            })
    
    backups.sort(key=lambda x: x['timestamp'], reverse=True)
    
    print(f"💾 Sauvegardes disponibles ({len(backups)}):")
    for i, backup in enumerate(backups, 1):
        print(f"{i}. {backup['filename']} - {backup['timestamp'].strftime('%d/%m/%Y %H:%M:%S')}")
    
    return backups

def main():
    """
    Menu principal
    """
    print("=" * 60)
    print("🧹 SCRIPT AVANCÉ DE NETTOYAGE DES OBSERVATIONS")
    print("=" * 60)
    print()
    print("Ce script permet de nettoyer la colonne 'observations' avec:")
    print("• Sauvegarde automatique avant modification")
    print("• Aperçu des changements")
    print("• Restauration possible")
    print("• Patterns de nettoyage configurables")
    print()
    
    while True:
        print("\nMenu principal:")
        print("1. 🔍 Analyser les observations")
        print("2. 🧹 Nettoyage interactif")
        print("3. 👀 Aperçu global (tous les patterns)")
        print("4. 💾 Gérer les sauvegardes")
        print("5. 🚪 Quitter")
        
        choice = input("\nVotre choix (1-5): ").strip()
        
        if choice == "1":
            analyze_observations()
            
        elif choice == "2":
            interactive_cleaning()
            
        elif choice == "3":
            for pattern_name in CLEANING_PATTERNS.keys():
                print(f"\n--- Aperçu pour {pattern_name} ---")
                clean_observations_by_pattern(pattern_name, preview_only=True)
                
        elif choice == "4":
            # Menu de gestion des sauvegardes
            backups = list_backups()
            if backups:
                print("\n1. 🔄 Restaurer une sauvegarde")
                print("2. 📋 Voir les détails d'une sauvegarde")
                print("3. ← Retour")
                
                backup_choice = input("Choix: ").strip()
                
                if backup_choice == "1":
                    backup_num = input(f"Numéro de la sauvegarde à restaurer (1-{len(backups)}): ").strip()
                    try:
                        backup_idx = int(backup_num) - 1
                        if 0 <= backup_idx < len(backups):
                            if input("⚠️  Confirmer la restauration? (oui/non): ").lower() in ['oui', 'o']:
                                restore_backup(backups[backup_idx]['filepath'])
                        else:
                            print("❌ Numéro invalide")
                    except ValueError:
                        print("❌ Numéro invalide")
                        
        elif choice == "5":
            print("👋 Au revoir!")
            break
            
        else:
            print("❌ Choix invalide. Veuillez choisir 1-5.")

if __name__ == "__main__":
    main() 