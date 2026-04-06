#!/usr/bin/env python3
"""
Script pour analyser les données CSV avant migration
Usage: python analyze_csv_data.py
"""

import csv
import sys
from collections import defaultdict, Counter
from datetime import datetime

def analyze_csv_data():
    """Analyser le fichier CSV pour comprendre les données"""
    print("📊 ANALYSE DES DONNÉES CSV")
    print("=" * 50)
    
    try:
        with open('data.csv', 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Compteurs et collections
            total_rows = 0
            clients_uniques = {}  # nom -> {phone, address, ...}
            operateurs_uniques = set()
            status_counts = Counter()
            problemes_types = Counter()
            dates_range = []
            errors = []
            
            print("🔍 Lecture des données...")
            
            for row_num, row in enumerate(reader, 1):
                total_rows += 1
                
                try:
                    # Extraire les données principales
                    client_name = row['name'].strip()
                    phone = row['phone'].strip()
                    address = row['address'].strip()
                    motivo = row['motivo'].strip()
                    usuario = row['usuario'].strip()
                    date_str = row['date'].strip()
                    status = row['status'].strip()
                    
                    # Analyser les clients uniques
                    if client_name:
                        if client_name not in clients_uniques:
                            clients_uniques[client_name] = {
                                'phones': set(),
                                'addresses': set(),
                                'first_seen': row_num
                            }
                        clients_uniques[client_name]['phones'].add(phone)
                        clients_uniques[client_name]['addresses'].add(address)
                    
                    # Analyser les opérateurs
                    if usuario:
                        operateurs_uniques.add(usuario)
                    
                    # Analyser les statuts
                    status_counts[status] += 1
                    
                    # Analyser les types de problèmes
                    if motivo:
                        problemes_types[motivo] += 1
                    
                    # Analyser les dates
                    if date_str:
                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                            dates_range.append(date_obj)
                        except ValueError:
                            errors.append(f"Ligne {row_num}: Format de date invalide '{date_str}'")
                    
                except Exception as e:
                    errors.append(f"Ligne {row_num}: Erreur de traitement - {e}")
            
            # Afficher les résultats
            print(f"\n📈 RÉSULTATS DE L'ANALYSE:")
            print(f"{'='*40}")
            print(f"📋 Total d'enregistrements: {total_rows}")
            print(f"👥 Clients uniques: {len(clients_uniques)}")
            print(f"🛠️  Opérateurs uniques: {len(operateurs_uniques)}")
            print(f"❌ Erreurs détectées: {len(errors)}")
            
            # Détails des opérateurs
            print(f"\n👥 OPÉRATEURS TROUVÉS:")
            for i, operateur in enumerate(sorted(operateurs_uniques), 1):
                print(f"  {i}. {operateur}")
            
            # Détails des statuts
            print(f"\n📊 RÉPARTITION DES STATUTS:")
            for status, count in status_counts.most_common():
                percentage = (count / total_rows) * 100
                print(f"  📋 {status}: {count} ({percentage:.1f}%)")
            
            # Types de problèmes les plus fréquents
            print(f"\n🎫 TOP 10 DES PROBLÈMES:")
            for motivo, count in problemes_types.most_common(10):
                percentage = (count / total_rows) * 100
                print(f"  🔧 {motivo}: {count} ({percentage:.1f}%)")
            
            # Période couverte
            if dates_range:
                print(f"\n📅 PÉRIODE COUVERTE:")
                min_date = min(dates_range)
                max_date = max(dates_range)
                print(f"  📅 Du {min_date.strftime('%d/%m/%Y %H:%M')}")
                print(f"  📅 Au {max_date.strftime('%d/%m/%Y %H:%M')}")
                print(f"  ⏱️  Durée: {(max_date - min_date).days} jours")
            
            # Problèmes détectés
            if errors:
                print(f"\n⚠️  PROBLÈMES DÉTECTÉS:")
                for error in errors[:10]:  # Afficher seulement les 10 premiers
                    print(f"  ❌ {error}")
                if len(errors) > 10:
                    print(f"  ... et {len(errors) - 10} autres erreurs")
            
            # Analyse des clients avec données multiples
            print(f"\n🔍 ANALYSE DES CLIENTS:")
            clients_multiples_phones = 0
            clients_multiples_addresses = 0
            
            for name, data in clients_uniques.items():
                if len(data['phones']) > 1:
                    clients_multiples_phones += 1
                if len(data['addresses']) > 1:
                    clients_multiples_addresses += 1
            
            print(f"  📞 Clients avec plusieurs téléphones: {clients_multiples_phones}")
            print(f"  🏠 Clients avec plusieurs adresses: {clients_multiples_addresses}")
            
            # Exemples de clients problématiques
            if clients_multiples_phones > 0:
                print(f"\n📞 EXEMPLES DE CLIENTS AVEC PLUSIEURS TÉLÉPHONES:")
                count = 0
                for name, data in clients_uniques.items():
                    if len(data['phones']) > 1 and count < 5:
                        print(f"  👤 {name}: {', '.join(data['phones'])}")
                        count += 1
            
            # Recommandations
            print(f"\n💡 RECOMMANDATIONS POUR LA MIGRATION:")
            print("="*45)
            print("1. ✅ Créer une table de correspondance pour les opérateurs")
            print("2. ✅ Gérer les clients avec plusieurs téléphones/adresses")
            print("3. ✅ Normaliser les statuts (Solucionada → Solucionadas)")
            print("4. ✅ Extraire la ville depuis l'adresse si possible")
            print("5. ✅ Gérer les doublons de clients")
            
            return {
                'total_rows': total_rows,
                'clients_uniques': clients_uniques,
                'operateurs_uniques': operateurs_uniques,
                'status_counts': status_counts,
                'errors': errors,
                'dates_range': dates_range
            }
            
    except FileNotFoundError:
        print("❌ Fichier 'data.csv' non trouvé!")
        return None
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {e}")
        return None

if __name__ == "__main__":
    try:
        results = analyze_csv_data()
        if results:
            print(f"\n🎯 Analyse terminée avec succès!")
            print(f"📋 Prochaine étape: Créer le script de migration")
        else:
            print(f"\n❌ Échec de l'analyse")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️  Analyse interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 