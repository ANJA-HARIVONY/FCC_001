#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔍 Analyse de la Base de Données FCC_001
Vérifie la consistance et génère un rapport d'état
"""

import os
import sys
import sqlite3
import json
from datetime import datetime
from pathlib import Path

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

def analyze_database_structure():
    """Analyse la structure de la base de données"""
    
    print("🔍 ANALYSE DE LA BASE DE DONNÉES FCC_001")
    print("=" * 60)
    
    # Chemin vers la base de données principale
    db_path = "data/instance/gestion_client.db"
    
    if not os.path.exists(db_path):
        print("❌ Base de données principale non trouvée!")
        return None
    
    # Connexion à la base de données
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    analysis = {
        'database_file': db_path,
        'file_size': os.path.getsize(db_path),
        'last_modified': datetime.fromtimestamp(os.path.getmtime(db_path)),
        'tables': {},
        'indexes': [],
        'foreign_keys': [],
        'integrity_checks': {}
    }
    
    try:
        # 1. Lister toutes les tables
        print("\n📋 TABLES DE LA BASE DE DONNÉES:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = cursor.fetchall()
        
        for (table_name,) in tables:
            print(f"   📄 {table_name}")
            
            # Obtenir le schéma de la table
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            # Compter les enregistrements
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            
            # Analyser les colonnes
            table_info = {
                'row_count': count,
                'columns': [],
                'primary_keys': [],
                'foreign_keys': []
            }
            
            for col in columns:
                cid, name, data_type, not_null, default_value, pk = col
                column_info = {
                    'name': name,
                    'type': data_type,
                    'not_null': bool(not_null),
                    'default': default_value,
                    'primary_key': bool(pk)
                }
                table_info['columns'].append(column_info)
                
                if pk:
                    table_info['primary_keys'].append(name)
            
            # Clés étrangères
            cursor.execute(f"PRAGMA foreign_key_list({table_name})")
            fks = cursor.fetchall()
            for fk in fks:
                fk_info = {
                    'from_column': fk[3],
                    'to_table': fk[2],
                    'to_column': fk[4]
                }
                table_info['foreign_keys'].append(fk_info)
                analysis['foreign_keys'].append({
                    'table': table_name,
                    **fk_info
                })
            
            analysis['tables'][table_name] = table_info
            print(f"      Enregistrements: {count}")
            print(f"      Colonnes: {len(columns)}")
        
        # 2. Lister les index
        print("\n📑 INDEX:")
        cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
        indexes = cursor.fetchall()
        
        for index_name, table_name in indexes:
            analysis['indexes'].append({
                'name': index_name,
                'table': table_name
            })
            print(f"   📌 {index_name} sur {table_name}")
        
        # 3. Vérifications d'intégrité
        print("\n🔍 VÉRIFICATIONS D'INTÉGRITÉ:")
        
        # Intégrité générale
        cursor.execute("PRAGMA integrity_check")
        integrity_result = cursor.fetchone()[0]
        analysis['integrity_checks']['general'] = integrity_result
        
        if integrity_result == "ok":
            print("   ✅ Intégrité générale: OK")
        else:
            print(f"   ❌ Problème d'intégrité: {integrity_result}")
        
        # Vérification des clés étrangères
        cursor.execute("PRAGMA foreign_key_check")
        fk_violations = cursor.fetchall()
        analysis['integrity_checks']['foreign_keys'] = len(fk_violations)
        
        if len(fk_violations) == 0:
            print("   ✅ Clés étrangères: OK")
        else:
            print(f"   ❌ Violations de clés étrangères: {len(fk_violations)}")
            for violation in fk_violations:
                print(f"      - {violation}")
        
        # 4. Analyse des données par table
        print("\n📊 ANALYSE DES DONNÉES:")
        
        # Vérifier les données dans chaque table
        for table_name, table_info in analysis['tables'].items():
            print(f"\n   📄 Table {table_name}:")
            
            # Vérifier les valeurs NULL dans les colonnes NOT NULL
            null_violations = 0
            for col in table_info['columns']:
                if col['not_null'] and col['name'] != 'id':  # Exclure l'ID auto-incrémenté
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {col['name']} IS NULL")
                    null_count = cursor.fetchone()[0]
                    if null_count > 0:
                        print(f"      ❌ {null_count} valeurs NULL dans {col['name']} (NOT NULL)")
                        null_violations += null_count
            
            if null_violations == 0:
                print("      ✅ Pas de violations NULL")
            
            # Vérifier les données récentes
            if table_name == 'incident' and table_info['row_count'] > 0:
                cursor.execute(f"SELECT MAX(date_heure) FROM {table_name}")
                last_date = cursor.fetchone()[0]
                print(f"      📅 Dernier incident: {last_date}")
        
        return analysis
        
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {e}")
        return None
    finally:
        conn.close()

def analyze_all_databases():
    """Analyse toutes les bases de données dans data/instance/"""
    
    print("\n🗄️ ANALYSE DE TOUS LES FICHIERS DE BASE DE DONNÉES:")
    print("=" * 60)
    
    instance_dir = "data/instance"
    db_files = []
    
    if os.path.exists(instance_dir):
        for file in os.listdir(instance_dir):
            if file.endswith('.db'):
                file_path = os.path.join(instance_dir, file)
                file_size = os.path.getsize(file_path)
                file_date = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                db_files.append({
                    'name': file,
                    'path': file_path,
                    'size_bytes': file_size,
                    'size_mb': round(file_size / (1024 * 1024), 2),
                    'last_modified': file_date.strftime('%Y-%m-%d %H:%M:%S')
                })
    
    # Trier par date de modification (plus récent en premier)
    db_files.sort(key=lambda x: x['last_modified'], reverse=True)
    
    for db_file in db_files:
        print(f"📄 {db_file['name']}")
        print(f"   Taille: {db_file['size_mb']} MB")
        print(f"   Modifié: {db_file['last_modified']}")
        
        # Analyser le contenu de chaque base
        try:
            conn = sqlite3.connect(db_file['path'])
            cursor = conn.cursor()
            
            # Compter les tables
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            table_count = cursor.fetchone()[0]
            
            # Compter les enregistrements totaux si possible
            total_records = 0
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            
            for (table_name,) in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    total_records += count
                except:
                    pass
            
            print(f"   Tables: {table_count}")
            print(f"   Enregistrements: {total_records}")
            
            conn.close()
            
        except Exception as e:
            print(f"   ❌ Erreur lecture: {e}")
    
    return db_files

def check_migration_consistency():
    """Vérifie la consistance des migrations"""
    
    print("\n🔄 VÉRIFICATION DES MIGRATIONS:")
    print("=" * 60)
    
    migrations_dir = "data/migrations/versions"
    migration_files = []
    
    if os.path.exists(migrations_dir):
        for file in os.listdir(migrations_dir):
            if file.endswith('.py') and not file.startswith('__'):
                file_path = os.path.join(migrations_dir, file)
                file_date = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                migration_files.append({
                    'name': file,
                    'path': file_path,
                    'date': file_date.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        # Trier par nom (ordre chronologique)
        migration_files.sort(key=lambda x: x['name'])
        
        print(f"📁 Fichiers de migration trouvés: {len(migration_files)}")
        
        for migration in migration_files:
            print(f"   📄 {migration['name']}")
            print(f"      Date: {migration['date']}")
            
            # Lire le contenu pour identifier les changements
            try:
                with open(migration['path'], 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                if 'def upgrade()' in content:
                    print("      ✅ Contient upgrade()")
                if 'def downgrade()' in content:
                    print("      ✅ Contient downgrade()")
                if 'create_table' in content:
                    print("      🆕 Création de table")
                if 'add_column' in content:
                    print("      ➕ Ajout de colonne")
                
            except Exception as e:
                print(f"      ❌ Erreur lecture: {e}")
    
    else:
        print("❌ Dossier de migrations non trouvé!")
    
    return migration_files

def generate_database_report():
    """Génère un rapport complet de la base de données"""
    
    print("\n📋 GÉNÉRATION DU RAPPORT:")
    print("=" * 60)
    
    # Analyse complète
    db_analysis = analyze_database_structure()
    all_databases = analyze_all_databases()
    migrations = check_migration_consistency()
    
    # Créer le rapport
    report = {
        'generated_at': datetime.now().isoformat(),
        'project': 'FCC_001',
        'database_analysis': db_analysis,
        'all_databases': all_databases,
        'migrations': migrations,
        'summary': {
            'total_tables': len(db_analysis['tables']) if db_analysis else 0,
            'total_indexes': len(db_analysis['indexes']) if db_analysis else 0,
            'total_foreign_keys': len(db_analysis['foreign_keys']) if db_analysis else 0,
            'database_files': len(all_databases),
            'migration_files': len(migrations),
            'integrity_status': db_analysis['integrity_checks']['general'] if db_analysis else 'unknown'
        },
        'recommendations': []
    }
    
    # Ajouter des recommandations
    if db_analysis:
        # Vérifier s'il y a beaucoup de fichiers de sauvegarde
        if len(all_databases) > 5:
            report['recommendations'].append({
                'type': 'cleanup',
                'message': f"Nettoyer les anciennes sauvegardes ({len(all_databases)} fichiers DB)",
                'priority': 'medium'
            })
        
        # Vérifier les performances
        total_records = sum(table['row_count'] for table in db_analysis['tables'].values())
        if total_records > 10000:
            report['recommendations'].append({
                'type': 'performance',
                'message': f"Considérer l'optimisation avec {total_records} enregistrements",
                'priority': 'low'
            })
        
        # Vérifier les index
        if len(db_analysis['indexes']) < 3:
            report['recommendations'].append({
                'type': 'optimization',
                'message': "Considérer l'ajout d'index pour améliorer les performances",
                'priority': 'medium'
            })
    
    # Sauvegarder le rapport
    report_file = f"monitoring/logs/database_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, default=str, ensure_ascii=False)
        
        print(f"✅ Rapport sauvegardé: {report_file}")
        
    except Exception as e:
        print(f"❌ Erreur sauvegarde rapport: {e}")
    
    return report

def main():
    """Fonction principale d'analyse"""
    
    # Vérifier que nous sommes dans le bon répertoire
    if not os.path.exists('core/app.py'):
        print("❌ Exécutez ce script depuis la racine du projet FCC_001")
        return 1
    
    # Lancer l'analyse complète
    report = generate_database_report()
    
    # Afficher le résumé
    print("\n📊 RÉSUMÉ DE L'ANALYSE:")
    print("=" * 60)
    
    if report['database_analysis']:
        summary = report['summary']
        print(f"📄 Tables: {summary['total_tables']}")
        print(f"📑 Index: {summary['total_indexes']}")
        print(f"🔗 Clés étrangères: {summary['total_foreign_keys']}")
        print(f"🗄️ Fichiers DB: {summary['database_files']}")
        print(f"🔄 Migrations: {summary['migration_files']}")
        print(f"✅ Intégrité: {summary['integrity_status']}")
        
        # Afficher les recommandations
        if report['recommendations']:
            print(f"\n💡 RECOMMANDATIONS ({len(report['recommendations'])}):")
            for rec in report['recommendations']:
                priority_icon = "🔴" if rec['priority'] == 'high' else "🟡" if rec['priority'] == 'medium' else "🟢"
                print(f"   {priority_icon} {rec['message']}")
        else:
            print("\n✅ Aucune recommandation - Base de données en bon état!")
    
    else:
        print("❌ Impossible d'analyser la base de données principale")
        return 1
    
    print(f"\n📋 Rapport détaillé disponible dans monitoring/logs/")
    return 0

if __name__ == "__main__":
    sys.exit(main())