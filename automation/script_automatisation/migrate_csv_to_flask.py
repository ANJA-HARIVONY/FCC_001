#!/usr/bin/env python3
"""
Script de migration des données CSV vers Flask
Usage: python migrate_csv_to_flask.py
"""

import csv
import sys
import os
import re
from datetime import datetime
from collections import defaultdict

# Ajouter le répertoire actuel au path pour importer les modules Flask
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def extract_ville_from_address(address):
    """Extraire la ville depuis l'adresse"""
    # Patterns courants pour extraire la ville
    ville_patterns = [
        r'\b(MALABO)\b',
        r'\b(BATA)\b', 
        r'\b(SIPOPO)\b',
        r'\b(PARAISO)\b',
        r'\b(SAMPAKA)\b',
        r'\b(MOSTOLES)\b',
        r'\b(SEMU)\b',
        r'\b(CARACOLAS)\b',
        r'\b(BANAPA)\b',
        r'\b(ALCAIDE)\b',
        r'\b(KM5)\b',
        r'\b(KM4)\b',
        r'V\.?S\.?\s*([\w\s]+)',  # Viviendas Sociales
        r'BUENA ESPERANZA',
        r'SAN JUAN',
        r'SANTA MARIA',
        r'VICATANA',
        r'TIMBABE',
        r'PEREZ',
        r'BALLARES'
    ]
    
    address_upper = address.upper()
    
    for pattern in ville_patterns:
        match = re.search(pattern, address_upper)
        if match:
            if 'V.S' in pattern or 'V\.S' in pattern:
                return f"V.S {match.group(1).strip()}" if match.groups() else "VIVIENDAS SOCIALES"
            return match.group(0).strip()
    
    # Par défaut, essayer de prendre le premier mot
    words = address.upper().split()
    if words:
        return words[0]
    
    return "MALABO"  # Ville par défaut

def normalize_status(status):
    """Normaliser les statuts selon le modèle Flask"""
    status_mapping = {
        'Solucionada': 'Solucionadas',
        'Solucionadas': 'Solucionadas',
        'Pendiente': 'Pendiente',
        'Tarea Creada': 'Bitrix',
        'Bitrix': 'Bitrix'
    }
    return status_mapping.get(status, 'Pendiente')

def clean_phone_number(phone):
    """Nettoyer et normaliser les numéros de téléphone"""
    if not phone:
        return ""
    
    # Prendre le premier numéro si plusieurs sont séparés par '/' ou '-'
    phones = re.split(r'[/\-,;]', phone)
    main_phone = phones[0].strip()
    
    # Nettoyer les caractères non-numériques sauf espaces
    cleaned = re.sub(r'[^\d\s]', '', main_phone)
    cleaned = re.sub(r'\s+', '', cleaned)  # Supprimer tous les espaces
    
    return cleaned

def create_operators_mapping():
    """Créer un mapping des opérateurs avec téléphones fictifs"""
    return {
        'Crecensia': '222000001',
        'Estelina': '222000002', 
        'Juanita': '222000003'
    }

def migrate_csv_to_flask():
    """Migration principale des données CSV vers Flask"""
    print("🚀 MIGRATION CSV VERS FLASK")
    print("=" * 40)
    
    try:
        # Import Flask après avoir ajouté le path
        from app import app, db, Client, Operateur, Incident
        
        with app.app_context():
            print("📋 Connexion à la base de données Flask...")
            
            # Vérifier l'état initial
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count()
            incidents_count = Incident.query.count()
            
            print(f"📊 État initial:")
            print(f"  👥 Clients: {clients_count}")
            print(f"  🛠️  Opérateurs: {operateurs_count}")  
            print(f"  🎫 Incidents: {incidents_count}")
            
            # Lire et traiter le CSV
            print(f"\n📖 Lecture du fichier CSV...")
            
            clients_data = {}  # nom -> données consolidées
            operateurs_data = create_operators_mapping()
            incidents_data = []
            
            # Créer d'abord les opérateurs
            print(f"\n👥 Création des opérateurs...")
            operateurs_db = {}
            
            for nom_operateur, telephone in operateurs_data.items():
                # Vérifier si l'opérateur existe déjà
                operateur = Operateur.query.filter_by(nom=nom_operateur).first()
                if not operateur:
                    operateur = Operateur(nom=nom_operateur, telephone=telephone)
                    db.session.add(operateur)
                    db.session.flush()  # Pour obtenir l'ID
                    print(f"  ✅ Créé: {nom_operateur} (ID: {operateur.id})")
                else:
                    print(f"  💡 Existant: {nom_operateur} (ID: {operateur.id})")
                
                operateurs_db[nom_operateur] = operateur.id
            
            db.session.commit()
            
            # Lire le CSV pour extraire les clients uniques
            print(f"\n📋 Analyse des clients depuis CSV...")
            
            with open('data.csv', 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    client_name = row['name'].strip()
                    phone = clean_phone_number(row['phone'])
                    address = row['address'].strip()
                    
                    if client_name:
                        if client_name not in clients_data:
                            clients_data[client_name] = {
                                'phones': set(),
                                'addresses': set(),
                                'incidents': []
                            }
                        
                        clients_data[client_name]['phones'].add(phone)
                        clients_data[client_name]['addresses'].add(address)
                        
                        # Préparer les données d'incident
                        incident_data = {
                            'client_name': client_name,
                            'intitule': row['motivo'].strip(),
                            'observations': f"Incident migré depuis CSV. Bitrix: {row.get('bitrix', '')}".strip(),
                            'status': normalize_status(row['status'].strip()),
                            'operateur_name': row['usuario'].strip(),
                            'date_heure': row['date'].strip()
                        }
                        
                        clients_data[client_name]['incidents'].append(incident_data)
            
            # Créer les clients
            print(f"\n👤 Création des clients ({len(clients_data)} clients uniques)...")
            clients_db = {}
            clients_created = 0
            clients_existing = 0
            
            for client_name, data in clients_data.items():
                # Choisir le téléphone principal (le plus court/propre)
                phones_list = [p for p in data['phones'] if p]
                main_phone = min(phones_list, key=len) if phones_list else "000000000"
                
                # Choisir l'adresse principale (la plus courte)
                addresses_list = [a for a in data['addresses'] if a]
                main_address = min(addresses_list, key=len) if addresses_list else "Adresse non spécifiée"
                
                # Extraire la ville
                ville = extract_ville_from_address(main_address)
                
                # Vérifier si le client existe déjà
                client = Client.query.filter_by(nom=client_name).first()
                if not client:
                    client = Client(
                        nom=client_name,
                        telephone=main_phone,
                        adresse=main_address,
                        ville=ville,
                        ip_router="",  # Vide par défaut
                        ip_antea=""    # Vide par défaut
                    )
                    db.session.add(client)
                    db.session.flush()  # Pour obtenir l'ID
                    clients_created += 1
                    
                    if clients_created <= 10:  # Afficher les 10 premiers
                        print(f"  ✅ Créé: {client_name[:50]}... (ID: {client.id})")
                else:
                    clients_existing += 1
                    if clients_existing <= 5:  # Afficher les 5 premiers existants
                        print(f"  💡 Existant: {client_name[:50]}... (ID: {client.id})")
                
                clients_db[client_name] = client.id
            
            if clients_created > 10:
                print(f"  ... et {clients_created - 10} autres clients créés")
            
            print(f"  📊 Résumé clients: {clients_created} créés, {clients_existing} existants")
            
            db.session.commit()
            
            # Créer les incidents
            print(f"\n🎫 Création des incidents...")
            incidents_created = 0
            incidents_errors = 0
            
            for client_name, data in clients_data.items():
                client_id = clients_db.get(client_name)
                if not client_id:
                    continue
                
                for incident_data in data['incidents']:
                    try:
                        operateur_id = operateurs_db.get(incident_data['operateur_name'])
                        if not operateur_id:
                            incidents_errors += 1
                            continue
                        
                        # Parser la date
                        try:
                            date_obj = datetime.strptime(incident_data['date_heure'], '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            date_obj = datetime.now()
                        
                        # Vérifier si l'incident existe déjà (éviter les doublons)
                        existing = Incident.query.filter_by(
                            id_client=client_id,
                            intitule=incident_data['intitule'],
                            date_heure=date_obj
                        ).first()
                        
                        if not existing:
                            incident = Incident(
                                id_client=client_id,
                                intitule=incident_data['intitule'],
                                observations=incident_data['observations'],
                                status=incident_data['status'],
                                id_operateur=operateur_id,
                                date_heure=date_obj
                            )
                            db.session.add(incident)
                            incidents_created += 1
                            
                            if incidents_created <= 10:
                                print(f"  ✅ Incident {incidents_created}: {incident_data['intitule'][:40]}...")
                    
                    except Exception as e:
                        incidents_errors += 1
                        if incidents_errors <= 5:
                            print(f"  ❌ Erreur incident: {e}")
            
            if incidents_created > 10:
                print(f"  ... et {incidents_created - 10} autres incidents créés")
            
            print(f"  📊 Résumé incidents: {incidents_created} créés, {incidents_errors} erreurs")
            
            db.session.commit()
            
            # État final
            print(f"\n📊 État FINAL:")
            clients_final = Client.query.count()
            operateurs_final = Operateur.query.count()
            incidents_final = Incident.query.count()
            
            print(f"  👥 Clients: {clients_count} → {clients_final} (+{clients_final - clients_count})")
            print(f"  🛠️  Opérateurs: {operateurs_count} → {operateurs_final} (+{operateurs_final - operateurs_count})")
            print(f"  🎫 Incidents: {incidents_count} → {incidents_final} (+{incidents_final - incidents_count})")
            
            # Statistiques de migration
            print(f"\n🎯 RÉSUMÉ DE LA MIGRATION:")
            print("=" * 35)
            print(f"✅ Opérateurs ajoutés: {operateurs_final - operateurs_count}")
            print(f"✅ Clients ajoutés: {clients_created}")
            print(f"✅ Incidents ajoutés: {incidents_created}")
            print(f"⚠️  Erreurs incidents: {incidents_errors}")
            
            return True
            
    except FileNotFoundError:
        print("❌ Fichier 'data.csv' non trouvé!")
        return False
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("🔄 MIGRATION DES DONNÉES CSV")
    print("=" * 40)
    
    # Vérifier que la base est bien vide/prête
    response = input("⚠️  Cette migration va ajouter des données. Continuer ? (y/N): ")
    if response.lower() != 'y':
        print("❌ Migration annulée")
        return False
    
    success = migrate_csv_to_flask()
    
    if success:
        print(f"\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS !")
        print(f"📋 Prochaines étapes:")
        print("1. Vérifier l'application: python app.py")
        print("2. Contrôler les données migrées")
        print("3. Tester les fonctionnalités")
    else:
        print(f"\n❌ Échec de la migration")
    
    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Migration interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 