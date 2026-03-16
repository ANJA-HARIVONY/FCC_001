#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
⚡ Optimisation de la Base de Données FCC_001
Applique les recommandations du rapport d'analyse
"""

import os
import sys
import sqlite3
from datetime import datetime

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

def create_recommended_indexes():
    """Crée les index recommandés pour optimiser les performances"""
    
    print("📊 OPTIMISATION DE LA BASE DE DONNÉES")
    print("=" * 50)
    
    db_path = "data/instance/gestion_client.db"
    
    if not os.path.exists(db_path):
        print("❌ Base de données principale non trouvée!")
        return False
    
    # Index recommandés
    indexes = [
        {
            'name': 'idx_incident_client',
            'table': 'incident',
            'column': 'id_client',
            'description': 'Optimise les requêtes d\'incidents par client'
        },
        {
            'name': 'idx_incident_operateur', 
            'table': 'incident',
            'column': 'id_operateur',
            'description': 'Optimise les requêtes d\'incidents par opérateur'
        },
        {
            'name': 'idx_incident_status',
            'table': 'incident', 
            'column': 'status',
            'description': 'Optimise les filtres par statut d\'incident'
        },
        {
            'name': 'idx_incident_date',
            'table': 'incident',
            'column': 'date_heure',
            'description': 'Optimise les requêtes par période'
        },
        {
            'name': 'idx_client_nom',
            'table': 'client',
            'column': 'nom', 
            'description': 'Optimise la recherche de clients par nom'
        }
    ]
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔍 Vérification des index existants...")
        
        # Vérifier les index existants
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
        existing_indexes = [row[0] for row in cursor.fetchall()]
        
        print(f"   Index existants: {len(existing_indexes)}")
        for idx in existing_indexes:
            print(f"   📌 {idx}")
        
        print("\n⚡ Création des nouveaux index...")
        
        created_count = 0
        skipped_count = 0
        
        for index in indexes:
            if index['name'] in existing_indexes:
                print(f"   ⏭️ {index['name']} (déjà existant)")
                skipped_count += 1
                continue
            
            try:
                sql = f"CREATE INDEX {index['name']} ON {index['table']}({index['column']})"
                cursor.execute(sql)
                print(f"   ✅ {index['name']} - {index['description']}")
                created_count += 1
                
            except Exception as e:
                print(f"   ❌ Erreur {index['name']}: {e}")
        
        conn.commit()
        
        print(f"\n📊 RÉSUMÉ:")
        print(f"   ✅ Index créés: {created_count}")
        print(f"   ⏭️ Index ignorés: {skipped_count}")
        
        # Vérifier la taille après optimisation
        cursor.execute("PRAGMA page_count")
        page_count = cursor.fetchone()[0]
        cursor.execute("PRAGMA page_size")
        page_size = cursor.fetchone()[0]
        total_size = page_count * page_size
        
        print(f"   📏 Taille finale: {total_size / 1024:.1f} KB")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'optimisation: {e}")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def vacuum_database():
    """Exécute VACUUM pour optimiser l'espace disque"""
    
    print("\n🧹 NETTOYAGE ET COMPACTAGE...")
    
    db_path = "data/instance/gestion_client.db"
    
    try:
        # Taille avant
        size_before = os.path.getsize(db_path)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("   🔄 Exécution de VACUUM...")
        cursor.execute("VACUUM")
        
        print("   🔄 Analyse des statistiques...")
        cursor.execute("ANALYZE")
        
        conn.close()
        
        # Taille après
        size_after = os.path.getsize(db_path)
        saved_bytes = size_before - size_after
        
        print(f"   📏 Taille avant: {size_before / 1024:.1f} KB")
        print(f"   📏 Taille après: {size_after / 1024:.1f} KB")
        
        if saved_bytes > 0:
            print(f"   💾 Espace libéré: {saved_bytes / 1024:.1f} KB")
        else:
            print("   ✅ Base de données déjà optimisée")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur lors du nettoyage: {e}")
        return False

def clean_old_backups():
    """Nettoie les anciennes sauvegardes selon les recommandations"""
    
    print("\n🗑️ NETTOYAGE DES ANCIENNES SAUVEGARDES...")
    
    instance_dir = "data/instance"
    
    # Fichiers à supprimer (anciennes sauvegardes de mai 2025)
    files_to_delete = [
        "gestion_client_backup_20250527_112429.db",
        "gestion_client_backup_20250527_112520.db", 
        "gestion_client_backup.db",
        "gestion_client_backup_20250527_111106.db"
    ]
    
    deleted_count = 0
    total_size_freed = 0
    
    for filename in files_to_delete:
        filepath = os.path.join(instance_dir, filename)
        
        if os.path.exists(filepath):
            try:
                file_size = os.path.getsize(filepath)
                os.remove(filepath)
                
                deleted_count += 1
                total_size_freed += file_size
                
                print(f"   ✅ Supprimé: {filename} ({file_size / 1024:.1f} KB)")
                
            except Exception as e:
                print(f"   ❌ Erreur suppression {filename}: {e}")
        else:
            print(f"   ⏭️ Déjà supprimé: {filename}")
    
    print(f"\n   📊 RÉSUMÉ NETTOYAGE:")
    print(f"   🗑️ Fichiers supprimés: {deleted_count}")
    
    if total_size_freed > 0:
        print(f"   💾 Espace libéré: {total_size_freed / 1024:.1f} KB")
    else:
        print("   ✅ Aucun nettoyage nécessaire")
    
    return deleted_count > 0

def check_performance():
    """Vérifie les performances après optimisation"""
    
    print("\n⚡ VÉRIFICATION DES PERFORMANCES...")
    
    db_path = "data/instance/gestion_client.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Test de requêtes typiques
        tests = [
            {
                'name': 'Liste des clients',
                'sql': 'SELECT COUNT(*) FROM client'
            },
            {
                'name': 'Incidents par client',
                'sql': 'SELECT COUNT(*) FROM incident WHERE id_client = 1'
            },
            {
                'name': 'Incidents par statut',
                'sql': "SELECT COUNT(*) FROM incident WHERE status = 'Pendiente'"
            },
            {
                'name': 'Incidents récents',
                'sql': 'SELECT COUNT(*) FROM incident WHERE date_heure > datetime("now", "-7 days")'
            }
        ]
        
        for test in tests:
            start_time = datetime.now()
            
            try:
                cursor.execute(test['sql'])
                result = cursor.fetchone()[0]
                
                end_time = datetime.now()
                duration_ms = (end_time - start_time).total_seconds() * 1000
                
                print(f"   ✅ {test['name']}: {duration_ms:.1f}ms ({result} résultats)")
                
            except Exception as e:
                print(f"   ❌ {test['name']}: {e}")
        
        # Vérifier les index créés
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        custom_indexes = cursor.fetchall()
        
        print(f"\n   📊 Index optimisés: {len(custom_indexes)}")
        for (idx_name,) in custom_indexes:
            print(f"   📌 {idx_name}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"   ❌ Erreur test performance: {e}")
        return False

def main():
    """Fonction principale d'optimisation"""
    
    print("⚡ OPTIMISATION COMPLÈTE DE LA BASE DE DONNÉES FCC_001")
    print("=" * 60)
    
    # Vérifier que nous sommes dans le bon répertoire
    if not os.path.exists('core/app.py'):
        print("❌ Exécutez ce script depuis la racine du projet FCC_001")
        return 1
    
    success_count = 0
    
    # 1. Nettoyer les anciennes sauvegardes
    if clean_old_backups():
        success_count += 1
    
    # 2. Créer les index recommandés
    if create_recommended_indexes():
        success_count += 1
    
    # 3. Nettoyer et compacter la base
    if vacuum_database():
        success_count += 1
    
    # 4. Vérifier les performances
    if check_performance():
        success_count += 1
    
    # Résumé final
    print(f"\n🎯 OPTIMISATION TERMINÉE")
    print("=" * 60)
    print(f"✅ Opérations réussies: {success_count}/4")
    
    if success_count == 4:
        print("🎉 Base de données entièrement optimisée!")
        print("\n💡 BÉNÉFICES OBTENUS:")
        print("   ⚡ Requêtes plus rapides grâce aux index")
        print("   💾 Espace disque optimisé")
        print("   🧹 Fichiers obsolètes supprimés")
        print("   📊 Statistiques mises à jour")
        
        print(f"\n📋 Prochaines étapes recommandées:")
        print("   1. Tester l'application: python start_app.py")
        print("   2. Vérifier les performances en conditions réelles")
        print("   3. Programmer des maintenances régulières")
        
        return 0
    else:
        print("⚠️ Certaines optimisations ont échoué")
        print("Consultez les messages d'erreur ci-dessus")
        return 1

if __name__ == "__main__":
    sys.exit(main())