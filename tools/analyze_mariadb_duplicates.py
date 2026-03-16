#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔍 Analyse des Doublons dans la Base MariaDB FCC_001
Vérifie et rapporte les doublons selon les critères métier
"""

import os
import sys
import json
from datetime import datetime
from collections import defaultdict

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

def test_mariadb_connection():
    """Test la connexion à MariaDB"""
    
    print("🔗 TEST DE CONNEXION MARIADB")
    print("=" * 40)
    
    try:
        import pymysql
        print(f"✅ PyMySQL disponible (version: {pymysql.__version__})")
    except ImportError:
        print("❌ PyMySQL non disponible")
        print("💡 Installation requise: pip install pymysql")
        return None
    
    # Configuration MariaDB
    config = {
        'host': 'localhost',
        'user': 'root', 
        'password': 'toor',
        'database': 'fcc_001_db',
        'charset': 'utf8mb4',
        'port': 3306
    }
    
    try:
        print(f"🔄 Tentative de connexion à {config['user']}@{config['host']}:{config['port']}/{config['database']}")
        
        connection = pymysql.connect(
            host=config['host'],
            user=config['user'],
            password=config['password'],
            database=config['database'],
            charset=config['charset'],
            port=config['port']
        )
        
        print("✅ Connexion MariaDB réussie!")
        
        # Test de version
        cursor = connection.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"📊 Version: {version}")
        
        return connection
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print("\n🔧 SOLUTIONS POSSIBLES:")
        print("1. Vérifiez que MariaDB est démarré")
        print("2. Vérifiez les identifiants (root:toor)")
        print("3. Vérifiez que la base 'fcc_001_db' existe")
        print("4. Installez PyMySQL: pip install pymysql")
        return None

def get_table_info(connection):
    """Obtient les informations sur les tables"""
    
    print("\n📋 ANALYSE DES TABLES")
    print("=" * 40)
    
    cursor = connection.cursor()
    
    # Lister les tables
    cursor.execute("SHOW TABLES")
    tables = [table[0] for table in cursor.fetchall()]
    
    table_info = {}
    
    for table in tables:
        print(f"\n📄 Table: {table}")
        
        # Compter les enregistrements
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        
        # Obtenir la structure
        cursor.execute(f"DESCRIBE {table}")
        columns = cursor.fetchall()
        
        # Obtenir des exemples de données
        cursor.execute(f"SELECT * FROM {table} LIMIT 3")
        sample_data = cursor.fetchall()
        
        table_info[table] = {
            'count': count,
            'columns': [col[0] for col in columns],
            'column_details': columns,
            'sample_data': sample_data
        }
        
        print(f"   Enregistrements: {count}")
        print(f"   Colonnes: {[col[0] for col in columns]}")
        
        if sample_data:
            print(f"   Échantillon: {len(sample_data)} premiers enregistrements")
    
    return table_info

def analyze_client_duplicates(connection):
    """Analyse les doublons de clients"""
    
    print("\n👥 ANALYSE DES DOUBLONS CLIENTS")
    print("=" * 40)
    
    cursor = connection.cursor()
    
    # Vérifier si la table client existe
    cursor.execute("SHOW TABLES LIKE 'client'")
    if not cursor.fetchone():
        print("❌ Table 'client' non trouvée")
        return {}
    
    duplicates_analysis = {}
    
    # 1. Doublons par nom exact
    print("\n🔍 Recherche de doublons par nom exact...")
    cursor.execute("""
        SELECT nom, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM client 
        GROUP BY nom 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    exact_name_duplicates = cursor.fetchall()
    duplicates_analysis['exact_name'] = {
        'count': len(exact_name_duplicates),
        'details': exact_name_duplicates
    }
    
    if exact_name_duplicates:
        print(f"   ❌ {len(exact_name_duplicates)} groupes de doublons par nom exact:")
        for nom, count, ids in exact_name_duplicates:
            print(f"      '{nom}': {count} clients (IDs: {ids})")
    else:
        print("   ✅ Aucun doublon par nom exact")
    
    # 2. Doublons par téléphone
    print("\n📞 Recherche de doublons par téléphone...")
    cursor.execute("""
        SELECT telephone, COUNT(*) as count, GROUP_CONCAT(CONCAT(id, ':', nom)) as clients
        FROM client 
        GROUP BY telephone 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    phone_duplicates = cursor.fetchall()
    duplicates_analysis['phone'] = {
        'count': len(phone_duplicates),
        'details': phone_duplicates
    }
    
    if phone_duplicates:
        print(f"   ❌ {len(phone_duplicates)} groupes de doublons par téléphone:")
        for telephone, count, clients in phone_duplicates:
            print(f"      '{telephone}': {count} clients ({clients})")
    else:
        print("   ✅ Aucun doublon par téléphone")
    
    # 3. Doublons par nom similaire (approximatif)
    print("\n🔤 Recherche de doublons par nom similaire...")
    cursor.execute("SELECT id, nom, telephone, ville FROM client ORDER BY nom")
    all_clients = cursor.fetchall()
    
    similar_names = defaultdict(list)
    for client in all_clients:
        id_client, nom, telephone, ville = client
        # Normaliser le nom pour comparaison (minuscules, sans espaces)
        normalized = nom.lower().strip().replace(' ', '')
        similar_names[normalized].append({
            'id': id_client,
            'nom': nom,
            'telephone': telephone,
            'ville': ville
        })
    
    similar_duplicates = {k: v for k, v in similar_names.items() if len(v) > 1}
    
    duplicates_analysis['similar_names'] = {
        'count': len(similar_duplicates),
        'details': similar_duplicates
    }
    
    if similar_duplicates:
        print(f"   ⚠️ {len(similar_duplicates)} groupes de noms potentiellement similaires:")
        for normalized_name, clients in similar_duplicates.items():
            print(f"      Nom normalisé '{normalized_name}':")
            for client in clients:
                print(f"        - ID {client['id']}: '{client['nom']}' ({client['telephone']}, {client['ville']})")
    else:
        print("   ✅ Aucun nom similaire détecté")
    
    # 4. Doublons par adresse complète
    print("\n🏠 Recherche de doublons par adresse complète...")
    cursor.execute("""
        SELECT CONCAT(adresse, ', ', ville) as adresse_complete, 
               COUNT(*) as count, 
               GROUP_CONCAT(CONCAT(id, ':', nom)) as clients
        FROM client 
        GROUP BY adresse, ville 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    address_duplicates = cursor.fetchall()
    duplicates_analysis['address'] = {
        'count': len(address_duplicates),
        'details': address_duplicates
    }
    
    if address_duplicates:
        print(f"   ❌ {len(address_duplicates)} groupes de doublons par adresse:")
        for adresse_complete, count, clients in address_duplicates:
            print(f"      '{adresse_complete}': {count} clients ({clients})")
    else:
        print("   ✅ Aucun doublon par adresse")
    
    # 5. Doublons par IP Router ou IP Antea
    print("\n🌐 Recherche de doublons par IP...")
    
    # IP Router
    cursor.execute("""
        SELECT ip_router, COUNT(*) as count, GROUP_CONCAT(CONCAT(id, ':', nom)) as clients
        FROM client 
        WHERE ip_router IS NOT NULL AND ip_router != ''
        GROUP BY ip_router 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    ip_router_duplicates = cursor.fetchall()
    
    # IP Antea
    cursor.execute("""
        SELECT ip_antea, COUNT(*) as count, GROUP_CONCAT(CONCAT(id, ':', nom)) as clients
        FROM client 
        WHERE ip_antea IS NOT NULL AND ip_antea != ''
        GROUP BY ip_antea 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    ip_antea_duplicates = cursor.fetchall()
    
    duplicates_analysis['ip_router'] = {
        'count': len(ip_router_duplicates),
        'details': ip_router_duplicates
    }
    
    duplicates_analysis['ip_antea'] = {
        'count': len(ip_antea_duplicates),
        'details': ip_antea_duplicates
    }
    
    if ip_router_duplicates:
        print(f"   ❌ {len(ip_router_duplicates)} groupes de doublons par IP Router:")
        for ip_router, count, clients in ip_router_duplicates:
            print(f"      '{ip_router}': {count} clients ({clients})")
    else:
        print("   ✅ Aucun doublon par IP Router")
    
    if ip_antea_duplicates:
        print(f"   ❌ {len(ip_antea_duplicates)} groupes de doublons par IP Antea:")
        for ip_antea, count, clients in ip_antea_duplicates:
            print(f"      '{ip_antea}': {count} clients ({clients})")
    else:
        print("   ✅ Aucun doublon par IP Antea")
    
    return duplicates_analysis

def analyze_operateur_duplicates(connection):
    """Analyse les doublons d'opérateurs"""
    
    print("\n👨‍💼 ANALYSE DES DOUBLONS OPÉRATEURS")
    print("=" * 40)
    
    cursor = connection.cursor()
    
    # Vérifier si la table operateur existe
    cursor.execute("SHOW TABLES LIKE 'operateur'")
    if not cursor.fetchone():
        print("❌ Table 'operateur' non trouvée")
        return {}
    
    duplicates_analysis = {}
    
    # 1. Doublons par nom exact
    print("\n🔍 Recherche de doublons par nom exact...")
    cursor.execute("""
        SELECT nom, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM operateur 
        GROUP BY nom 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    exact_name_duplicates = cursor.fetchall()
    duplicates_analysis['exact_name'] = {
        'count': len(exact_name_duplicates),
        'details': exact_name_duplicates
    }
    
    if exact_name_duplicates:
        print(f"   ❌ {len(exact_name_duplicates)} groupes de doublons par nom exact:")
        for nom, count, ids in exact_name_duplicates:
            print(f"      '{nom}': {count} opérateurs (IDs: {ids})")
    else:
        print("   ✅ Aucun doublon par nom exact")
    
    # 2. Doublons par téléphone
    print("\n📞 Recherche de doublons par téléphone...")
    cursor.execute("""
        SELECT telephone, COUNT(*) as count, GROUP_CONCAT(CONCAT(id, ':', nom)) as operateurs
        FROM operateur 
        GROUP BY telephone 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    phone_duplicates = cursor.fetchall()
    duplicates_analysis['phone'] = {
        'count': len(phone_duplicates),
        'details': phone_duplicates
    }
    
    if phone_duplicates:
        print(f"   ❌ {len(phone_duplicates)} groupes de doublons par téléphone:")
        for telephone, count, operateurs in phone_duplicates:
            print(f"      '{telephone}': {count} opérateurs ({operateurs})")
    else:
        print("   ✅ Aucun doublon par téléphone")
    
    return duplicates_analysis

def analyze_incident_duplicates(connection):
    """Analyse les doublons d'incidents"""
    
    print("\n🚨 ANALYSE DES DOUBLONS INCIDENTS")
    print("=" * 40)
    
    cursor = connection.cursor()
    
    # Vérifier si la table incident existe
    cursor.execute("SHOW TABLES LIKE 'incident'")
    if not cursor.fetchone():
        print("❌ Table 'incident' non trouvée")
        return {}
    
    duplicates_analysis = {}
    
    # 1. Doublons par intitulé exact + client
    print("\n🔍 Recherche de doublons par intitulé + client...")
    cursor.execute("""
        SELECT i.intitule, c.nom as client_nom, COUNT(*) as count, 
               GROUP_CONCAT(i.id) as incident_ids,
               GROUP_CONCAT(DATE(i.date_heure)) as dates
        FROM incident i
        JOIN client c ON i.id_client = c.id
        GROUP BY i.intitule, i.id_client 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    exact_duplicates = cursor.fetchall()
    duplicates_analysis['exact_title_client'] = {
        'count': len(exact_duplicates),
        'details': exact_duplicates
    }
    
    if exact_duplicates:
        print(f"   ❌ {len(exact_duplicates)} groupes de doublons par intitulé + client:")
        for intitule, client_nom, count, incident_ids, dates in exact_duplicates:
            print(f"      '{intitule}' (Client: {client_nom}): {count} incidents")
            print(f"        IDs: {incident_ids}")
            print(f"        Dates: {dates}")
    else:
        print("   ✅ Aucun doublon par intitulé + client")
    
    # 2. Incidents similaires par client dans la même journée
    print("\n📅 Recherche d'incidents multiples par client/jour...")
    cursor.execute("""
        SELECT DATE(i.date_heure) as date_incident, 
               c.nom as client_nom,
               COUNT(*) as count,
               GROUP_CONCAT(CONCAT(i.id, ':', LEFT(i.intitule, 30))) as incidents
        FROM incident i
        JOIN client c ON i.id_client = c.id
        GROUP BY DATE(i.date_heure), i.id_client
        HAVING COUNT(*) > 2
        ORDER BY count DESC, date_incident DESC
    """)
    
    same_day_multiple = cursor.fetchall()
    duplicates_analysis['same_day_multiple'] = {
        'count': len(same_day_multiple),
        'details': same_day_multiple
    }
    
    if same_day_multiple:
        print(f"   ⚠️ {len(same_day_multiple)} clients avec >2 incidents le même jour:")
        for date_incident, client_nom, count, incidents in same_day_multiple:
            print(f"      {date_incident} - {client_nom}: {count} incidents")
            print(f"        Détails: {incidents}")
    else:
        print("   ✅ Aucun client avec plus de 2 incidents le même jour")
    
    # 3. Incidents identiques (même intitulé, observations, statut)
    print("\n📝 Recherche d'incidents identiques complets...")
    cursor.execute("""
        SELECT intitule, observations, status, COUNT(*) as count,
               GROUP_CONCAT(CONCAT(id, ':', DATE(date_heure))) as incidents_info
        FROM incident 
        GROUP BY intitule, observations, status
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    """)
    
    identical_incidents = cursor.fetchall()
    duplicates_analysis['identical_complete'] = {
        'count': len(identical_incidents),
        'details': identical_incidents
    }
    
    if identical_incidents:
        print(f"   ❌ {len(identical_incidents)} groupes d'incidents complètement identiques:")
        for intitule, observations, status, count, incidents_info in identical_incidents:
            print(f"      '{intitule}' (Status: {status}): {count} incidents")
            print(f"        Observations: {observations[:50]}...")
            print(f"        Incidents: {incidents_info}")
    else:
        print("   ✅ Aucun incident complètement identique")
    
    return duplicates_analysis

def generate_duplicates_report(connection, table_info, all_duplicates):
    """Génère un rapport complet des doublons"""
    
    print("\n📋 GÉNÉRATION DU RAPPORT DE DOUBLONS")
    print("=" * 40)
    
    # Créer le rapport
    report = {
        'generated_at': datetime.now().isoformat(),
        'database': 'MariaDB - fcc_001_db',
        'analysis_type': 'Duplicates Detection',
        'table_info': table_info,
        'duplicates_analysis': all_duplicates,
        'summary': {
            'total_tables': len(table_info),
            'tables_with_duplicates': 0,
            'total_duplicate_groups': 0,
            'critical_issues': [],
            'recommendations': []
        }
    }
    
    # Calculer le résumé
    total_duplicate_groups = 0
    tables_with_duplicates = 0
    critical_issues = []
    recommendations = []
    
    for table, duplicates in all_duplicates.items():
        table_has_duplicates = False
        for duplicate_type, data in duplicates.items():
            if data['count'] > 0:
                table_has_duplicates = True
                total_duplicate_groups += data['count']
                
                # Identifier les problèmes critiques
                if table == 'client' and duplicate_type == 'exact_name' and data['count'] > 0:
                    critical_issues.append(f"Clients avec noms identiques: {data['count']} groupes")
                
                if table == 'client' and duplicate_type == 'phone' and data['count'] > 0:
                    critical_issues.append(f"Clients avec même téléphone: {data['count']} groupes")
                
                if table == 'incident' and duplicate_type == 'exact_title_client' and data['count'] > 0:
                    critical_issues.append(f"Incidents dupliqués: {data['count']} groupes")
        
        if table_has_duplicates:
            tables_with_duplicates += 1
    
    # Générer les recommandations
    if total_duplicate_groups == 0:
        recommendations.append("✅ Aucun doublon détecté - Base de données propre")
    else:
        if all_duplicates.get('client', {}).get('exact_name', {}).get('count', 0) > 0:
            recommendations.append("🔧 Fusionner ou nettoyer les clients avec noms identiques")
        
        if all_duplicates.get('client', {}).get('phone', {}).get('count', 0) > 0:
            recommendations.append("📞 Vérifier et corriger les numéros de téléphone dupliqués")
        
        if all_duplicates.get('incident', {}).get('identical_complete', {}).get('count', 0) > 0:
            recommendations.append("🚨 Supprimer les incidents complètement identiques")
        
        recommendations.append("📊 Implémenter des contraintes UNIQUE pour éviter les futurs doublons")
        recommendations.append("🔄 Programmer une vérification mensuelle des doublons")
    
    report['summary']['tables_with_duplicates'] = tables_with_duplicates
    report['summary']['total_duplicate_groups'] = total_duplicate_groups
    report['summary']['critical_issues'] = critical_issues
    report['summary']['recommendations'] = recommendations
    
    # Sauvegarder le rapport
    report_file = f"monitoring/logs/mariadb_duplicates_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, default=str, ensure_ascii=False)
        
        print(f"✅ Rapport sauvegardé: {report_file}")
        
    except Exception as e:
        print(f"❌ Erreur sauvegarde rapport: {e}")
    
    return report

def main():
    """Fonction principale d'analyse des doublons MariaDB"""
    
    print("🔍 ANALYSE DES DOUBLONS - BASE MARIADB FCC_001")
    print("=" * 60)
    
    # Vérifier que nous sommes dans le bon répertoire
    if not os.path.exists('core/app.py'):
        print("❌ Exécutez ce script depuis la racine du projet FCC_001")
        return 1
    
    # 1. Tester la connexion MariaDB
    connection = test_mariadb_connection()
    if not connection:
        return 1
    
    try:
        # 2. Obtenir les informations des tables
        table_info = get_table_info(connection)
        
        # 3. Analyser les doublons par table
        all_duplicates = {}
        
        # Analyser les clients
        if 'client' in table_info:
            all_duplicates['client'] = analyze_client_duplicates(connection)
        
        # Analyser les opérateurs
        if 'operateur' in table_info:
            all_duplicates['operateur'] = analyze_operateur_duplicates(connection)
        
        # Analyser les incidents
        if 'incident' in table_info:
            all_duplicates['incident'] = analyze_incident_duplicates(connection)
        
        # 4. Générer le rapport
        report = generate_duplicates_report(connection, table_info, all_duplicates)
        
        # 5. Afficher le résumé
        print("\n📊 RÉSUMÉ DE L'ANALYSE")
        print("=" * 60)
        
        summary = report['summary']
        print(f"🗄️ Tables analysées: {summary['total_tables']}")
        print(f"⚠️ Tables avec doublons: {summary['tables_with_duplicates']}")
        print(f"🔢 Groupes de doublons: {summary['total_duplicate_groups']}")
        
        if summary['critical_issues']:
            print(f"\n🚨 PROBLÈMES CRITIQUES ({len(summary['critical_issues'])}):")
            for issue in summary['critical_issues']:
                print(f"   ❌ {issue}")
        else:
            print("\n✅ Aucun problème critique détecté")
        
        if summary['recommendations']:
            print(f"\n💡 RECOMMANDATIONS ({len(summary['recommendations'])}):")
            for rec in summary['recommendations']:
                print(f"   {rec}")
        
        print(f"\n📋 Rapport détaillé disponible dans monitoring/logs/")
        
        return 0
        
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {e}")
        return 1
        
    finally:
        if connection:
            connection.close()
            print("\n🔗 Connexion MariaDB fermée")

if __name__ == "__main__":
    sys.exit(main())