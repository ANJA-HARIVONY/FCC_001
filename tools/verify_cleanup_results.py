#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
✅ Vérification Post-Nettoyage MariaDB FCC_001
Analyse l'état de la base après nettoyage des doublons
"""

import os
import sys
import json
import pymysql
from datetime import datetime

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

def connect_mariadb():
    """Établir la connexion à MariaDB"""
    config = {
        'host': 'localhost',
        'user': 'root',
        'password': 'toor',
        'database': 'fcc_001_db',
        'charset': 'utf8mb4',
        'port': 3306
    }
    
    try:
        connection = pymysql.connect(
            host=config['host'],
            user=config['user'],
            password=config['password'],
            database=config['database'],
            charset=config['charset'],
            port=config['port']
        )
        print("✅ Connexion MariaDB établie")
        return connection
    except Exception as e:
        print(f"❌ Erreur connexion: {e}")
        return None

def check_remaining_duplicates(connection):
    """Vérifier les doublons restants"""
    print("\n🔍 VÉRIFICATION DES DOUBLONS RESTANTS")
    print("=" * 50)
    
    cursor = connection.cursor()
    results = {
        'client_name_duplicates': 0,
        'client_phone_duplicates': 0,
        'incident_identical': 0,
        'details': {}
    }
    
    # 1. Doublons clients par nom
    print("👥 Vérification doublons clients par nom...")
    cursor.execute("""
        SELECT nom, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM client 
        GROUP BY nom 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    name_duplicates = cursor.fetchall()
    results['client_name_duplicates'] = len(name_duplicates)
    
    if name_duplicates:
        print(f"   ❌ {len(name_duplicates)} groupes de doublons par nom restants:")
        for nom, count, ids in name_duplicates[:5]:  # Top 5
            print(f"      '{nom}': {count} clients (IDs: {ids})")
        results['details']['name_duplicates'] = name_duplicates
    else:
        print("   ✅ Aucun doublon par nom")
    
    # 2. Doublons clients par téléphone
    print("\n📞 Vérification doublons clients par téléphone...")
    cursor.execute("""
        SELECT telephone, COUNT(*) as count, 
               GROUP_CONCAT(CONCAT(id, ':', nom)) as clients
        FROM client 
        GROUP BY telephone 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    phone_duplicates = cursor.fetchall()
    results['client_phone_duplicates'] = len(phone_duplicates)
    
    if phone_duplicates:
        print(f"   ❌ {len(phone_duplicates)} groupes de doublons par téléphone restants:")
        for telephone, count, clients in phone_duplicates[:5]:  # Top 5
            print(f"      '{telephone}': {count} clients")
            clients_list = clients.split(',')
            for client in clients_list[:3]:  # Max 3 pour lisibilité
                print(f"         - {client}")
        results['details']['phone_duplicates'] = phone_duplicates
    else:
        print("   ✅ Aucun doublon par téléphone")
    
    # 3. Incidents complètement identiques
    print("\n🚨 Vérification incidents identiques...")
    cursor.execute("""
        SELECT intitule, COALESCE(observations, '') as observations, status, 
               COUNT(*) as count,
               GROUP_CONCAT(id ORDER BY id LIMIT 10) as sample_ids
        FROM incident 
        GROUP BY intitule, COALESCE(observations, ''), status
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10
    """)
    
    identical_incidents = cursor.fetchall()
    results['incident_identical'] = len(identical_incidents)
    
    if identical_incidents:
        print(f"   ❌ {len(identical_incidents)} groupes d'incidents identiques restants:")
        for intitule, observations, status, count, sample_ids in identical_incidents[:5]:
            short_title = intitule[:40] + '...' if len(intitule) > 40 else intitule
            print(f"      '{short_title}' ({status}): {count} incidents")
        results['details']['identical_incidents'] = identical_incidents
    else:
        print("   ✅ Aucun incident complètement identique")
    
    return results

def check_data_integrity(connection):
    """Vérifier l'intégrité des données"""
    print("\n🔗 VÉRIFICATION INTÉGRITÉ DES DONNÉES")
    print("=" * 50)
    
    cursor = connection.cursor()
    integrity_results = {
        'orphaned_incidents': 0,
        'invalid_operators': 0,
        'data_consistency': True,
        'total_records': {}
    }
    
    # 1. Incidents orphelins (sans client valide)
    print("🚨 Vérification incidents orphelins...")
    cursor.execute("""
        SELECT COUNT(*) FROM incident i 
        LEFT JOIN client c ON i.id_client = c.id 
        WHERE c.id IS NULL
    """)
    orphaned_incidents = cursor.fetchone()[0]
    integrity_results['orphaned_incidents'] = orphaned_incidents
    
    if orphaned_incidents > 0:
        print(f"   ❌ {orphaned_incidents} incidents orphelins détectés")
        integrity_results['data_consistency'] = False
        
        # Détails des incidents orphelins
        cursor.execute("""
            SELECT i.id, i.intitule, i.id_client 
            FROM incident i 
            LEFT JOIN client c ON i.id_client = c.id 
            WHERE c.id IS NULL
            LIMIT 5
        """)
        orphaned_details = cursor.fetchall()
        print("   Exemples d'incidents orphelins:")
        for inc_id, intitule, client_id in orphaned_details:
            print(f"      - Incident {inc_id}: '{intitule[:30]}...' (client_id: {client_id})")
    else:
        print("   ✅ Aucun incident orphelin")
    
    # 2. Incidents avec opérateurs invalides
    print("\n👨‍💼 Vérification opérateurs...")
    cursor.execute("""
        SELECT COUNT(*) FROM incident i 
        LEFT JOIN operateur o ON i.id_operateur = o.id 
        WHERE o.id IS NULL
    """)
    invalid_operators = cursor.fetchone()[0]
    integrity_results['invalid_operators'] = invalid_operators
    
    if invalid_operators > 0:
        print(f"   ❌ {invalid_operators} incidents avec opérateurs invalides")
        integrity_results['data_consistency'] = False
    else:
        print("   ✅ Tous les incidents ont un opérateur valide")
    
    # 3. Compter les totaux
    print("\n📊 Totaux actuels...")
    
    cursor.execute("SELECT COUNT(*) FROM client")
    total_clients = cursor.fetchone()[0]
    integrity_results['total_records']['clients'] = total_clients
    
    cursor.execute("SELECT COUNT(*) FROM incident")
    total_incidents = cursor.fetchone()[0]
    integrity_results['total_records']['incidents'] = total_incidents
    
    cursor.execute("SELECT COUNT(*) FROM operateur")
    total_operateurs = cursor.fetchone()[0]
    integrity_results['total_records']['operateurs'] = total_operateurs
    
    print(f"   👥 Clients: {total_clients}")
    print(f"   🚨 Incidents: {total_incidents}")
    print(f"   👨‍💼 Opérateurs: {total_operateurs}")
    
    return integrity_results

def compare_with_previous_analysis():
    """Comparer avec l'analyse précédente"""
    print("\n📈 COMPARAISON AVEC L'ÉTAT PRÉCÉDENT")
    print("=" * 50)
    
    # Chercher le dernier rapport d'analyse
    logs_dir = "monitoring/logs"
    if not os.path.exists(logs_dir):
        print("❌ Aucun rapport précédent trouvé")
        return None
    
    # Trouver le fichier le plus récent
    report_files = [f for f in os.listdir(logs_dir) if f.startswith('mariadb_duplicates_report_')]
    if not report_files:
        print("❌ Aucun rapport de doublons précédent trouvé")
        return None
    
    latest_report = sorted(report_files)[-1]
    report_path = os.path.join(logs_dir, latest_report)
    
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            previous_data = json.load(f)
        
        print(f"📋 Rapport précédent: {latest_report}")
        
        # Extraire les données de comparaison
        prev_summary = previous_data.get('summary', {})
        
        print(f"\n📊 ÉVOLUTION:")
        
        if 'duplicates_analysis' in previous_data:
            # Clients
            prev_client_name = previous_data['duplicates_analysis'].get('client', {}).get('exact_name', {}).get('count', 0)
            prev_client_phone = previous_data['duplicates_analysis'].get('client', {}).get('phone', {}).get('count', 0)
            
            print(f"   👥 Doublons clients par nom:")
            print(f"      Avant: {prev_client_name} groupes")
            print(f"      Maintenant: [À vérifier]")
            
            print(f"   📞 Doublons clients par téléphone:")
            print(f"      Avant: {prev_client_phone} groupes")
            print(f"      Maintenant: [À vérifier]")
            
            # Incidents
            prev_incidents = previous_data['duplicates_analysis'].get('incident', {}).get('identical_complete', {}).get('count', 0)
            print(f"   🚨 Incidents identiques:")
            print(f"      Avant: {prev_incidents} groupes")
            print(f"      Maintenant: [À vérifier]")
        
        return previous_data
        
    except Exception as e:
        print(f"❌ Erreur lecture rapport précédent: {e}")
        return None

def generate_verification_report(duplicates_check, integrity_check, previous_data=None):
    """Générer le rapport de vérification"""
    print("\n📋 GÉNÉRATION RAPPORT DE VÉRIFICATION")
    print("=" * 50)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Calculer le score de nettoyage
    total_remaining_duplicates = (
        duplicates_check['client_name_duplicates'] + 
        duplicates_check['client_phone_duplicates'] + 
        duplicates_check['incident_identical']
    )
    
    # Statut global
    if total_remaining_duplicates == 0 and integrity_check['data_consistency']:
        cleanup_status = "EXCELLENT"
        cleanup_icon = "🎉"
    elif total_remaining_duplicates < 10 and integrity_check['data_consistency']:
        cleanup_status = "BON"
        cleanup_icon = "✅"
    elif integrity_check['data_consistency']:
        cleanup_status = "PARTIEL"
        cleanup_icon = "⚠️"
    else:
        cleanup_status = "PROBLÉMATIQUE"
        cleanup_icon = "❌"
    
    report = {
        'timestamp': timestamp,
        'cleanup_status': cleanup_status,
        'verification_results': {
            'remaining_duplicates': duplicates_check,
            'data_integrity': integrity_check,
            'total_remaining_issues': total_remaining_duplicates
        },
        'comparison': {},
        'recommendations': []
    }
    
    # Comparaison si données précédentes disponibles
    if previous_data and 'duplicates_analysis' in previous_data:
        prev_client_name = previous_data['duplicates_analysis'].get('client', {}).get('exact_name', {}).get('count', 0)
        prev_client_phone = previous_data['duplicates_analysis'].get('client', {}).get('phone', {}).get('count', 0)
        prev_incidents = previous_data['duplicates_analysis'].get('incident', {}).get('identical_complete', {}).get('count', 0)
        
        report['comparison'] = {
            'client_name_duplicates': {
                'before': prev_client_name,
                'after': duplicates_check['client_name_duplicates'],
                'reduction': prev_client_name - duplicates_check['client_name_duplicates']
            },
            'client_phone_duplicates': {
                'before': prev_client_phone,
                'after': duplicates_check['client_phone_duplicates'],
                'reduction': prev_client_phone - duplicates_check['client_phone_duplicates']
            },
            'incident_identical': {
                'before': prev_incidents,
                'after': duplicates_check['incident_identical'],
                'reduction': prev_incidents - duplicates_check['incident_identical']
            }
        }
    
    # Recommandations
    if duplicates_check['client_name_duplicates'] > 0:
        report['recommendations'].append("Continuer le nettoyage des doublons clients par nom")
    
    if duplicates_check['client_phone_duplicates'] > 0:
        report['recommendations'].append("Réviser manuellement les doublons de téléphone")
    
    if duplicates_check['incident_identical'] > 0:
        report['recommendations'].append("Supprimer les incidents restants complètement identiques")
    
    if integrity_check['orphaned_incidents'] > 0:
        report['recommendations'].append("URGENT: Corriger les incidents orphelins")
    
    if total_remaining_duplicates == 0 and integrity_check['data_consistency']:
        report['recommendations'].append("Implémenter les contraintes préventives")
        report['recommendations'].append("Mettre en place la surveillance continue")
    
    # Sauvegarder le rapport
    report_file = f"monitoring/logs/cleanup_verification_{timestamp}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Afficher le résumé
    print(f"\n{cleanup_icon} RÉSUMÉ DE VÉRIFICATION")
    print("=" * 50)
    print(f"📊 Statut global: {cleanup_status}")
    print(f"🔢 Doublons restants: {total_remaining_duplicates}")
    print(f"🔗 Intégrité: {'OK' if integrity_check['data_consistency'] else 'PROBLÈME'}")
    
    if previous_data and 'comparison' in report and report['comparison']:
        print(f"\n📈 AMÉLIORATION:")
        comp = report['comparison']
        
        if 'client_name_duplicates' in comp:
            print(f"   👥 Clients par nom: {comp['client_name_duplicates']['before']} → {comp['client_name_duplicates']['after']} (-{comp['client_name_duplicates']['reduction']})")
        
        if 'client_phone_duplicates' in comp:
            print(f"   📞 Clients par téléphone: {comp['client_phone_duplicates']['before']} → {comp['client_phone_duplicates']['after']} (-{comp['client_phone_duplicates']['reduction']})")
        
        if 'incident_identical' in comp:
            print(f"   🚨 Incidents identiques: {comp['incident_identical']['before']} → {comp['incident_identical']['after']} (-{comp['incident_identical']['reduction']})")
    
    print(f"\n💡 RECOMMANDATIONS ({len(report['recommendations'])}):")
    for i, rec in enumerate(report['recommendations'], 1):
        print(f"   {i}. {rec}")
    
    print(f"\n📋 Rapport complet: {report_file}")
    
    return report

def main():
    """Fonction principale de vérification"""
    
    print("✅ VÉRIFICATION POST-NETTOYAGE MARIADB FCC_001")
    print("=" * 60)
    
    # Connexion
    connection = connect_mariadb()
    if not connection:
        return 1
    
    try:
        # 1. Vérifier les doublons restants
        duplicates_check = check_remaining_duplicates(connection)
        
        # 2. Vérifier l'intégrité des données
        integrity_check = check_data_integrity(connection)
        
        # 3. Comparer avec l'état précédent
        previous_data = compare_with_previous_analysis()
        
        # 4. Générer le rapport de vérification
        report = generate_verification_report(duplicates_check, integrity_check, previous_data)
        
        # 5. Statut de sortie selon les résultats
        if integrity_check['data_consistency'] and duplicates_check['client_name_duplicates'] == 0:
            print("\n🎉 VÉRIFICATION RÉUSSIE - Nettoyage excellent!")
            return 0
        elif integrity_check['data_consistency']:
            print("\n⚠️ VÉRIFICATION PARTIELLE - Nettoyage à continuer")
            return 0
        else:
            print("\n❌ PROBLÈMES DÉTECTÉS - Intervention requise")
            return 1
    
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return 1
    
    finally:
        connection.close()
        print("\n🔗 Connexion fermée")

if __name__ == "__main__":
    sys.exit(main())