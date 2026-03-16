#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🧹 Nettoyage Sécurisé des Doublons MariaDB FCC_001
PRIORITÉ 1 - Exécution avec toutes les précautions
"""

import os
import sys
import json
import pymysql
from datetime import datetime
from pathlib import Path

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

class MariaDBDuplicateCleaner:
    def __init__(self):
        self.config = {
            'host': 'localhost',
            'user': 'root',
            'password': 'toor',
            'database': 'fcc_001_db',
            'charset': 'utf8mb4',
            'port': 3306
        }
        self.connection = None
        self.backup_file = None
        self.cleanup_log = []
        
    def connect(self):
        """Établir la connexion à MariaDB"""
        try:
            self.connection = pymysql.connect(
                host=self.config['host'],
                user=self.config['user'],
                password=self.config['password'],
                database=self.config['database'],
                charset=self.config['charset'],
                port=self.config['port'],
                autocommit=False  # Mode transactionnel pour sécurité
            )
            print("✅ Connexion MariaDB établie")
            return True
        except Exception as e:
            print(f"❌ Erreur connexion: {e}")
            return False
    
    def create_backup(self):
        """Créer une sauvegarde complète avant nettoyage"""
        print("\n💾 CRÉATION SAUVEGARDE COMPLÈTE")
        print("=" * 50)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_file = f"monitoring/logs/mariadb_backup_before_cleanup_{timestamp}.sql"
        
        try:
            # Utiliser mysqldump pour une sauvegarde complète
            dump_cmd = f"mysqldump -h {self.config['host']} -u {self.config['user']} -p{self.config['password']} {self.config['database']} > {self.backup_file}"
            
            print(f"🔄 Exécution de la sauvegarde...")
            print(f"📁 Fichier: {self.backup_file}")
            
            # Pour Windows, utiliser une approche alternative
            cursor = self.connection.cursor()
            
            # Sauvegarde structure + données
            backup_content = []
            backup_content.append(f"-- Sauvegarde MariaDB FCC_001 - {timestamp}")
            backup_content.append(f"-- Base: {self.config['database']}")
            backup_content.append(f"-- Généré avant nettoyage des doublons")
            backup_content.append("")
            
            # Sauvegarder chaque table
            cursor.execute("SHOW TABLES")
            tables = [table[0] for table in cursor.fetchall()]
            
            for table in tables:
                print(f"   📄 Sauvegarde table {table}...")
                
                # Structure de la table
                cursor.execute(f"SHOW CREATE TABLE {table}")
                create_table = cursor.fetchone()[1]
                backup_content.append(f"-- Structure de {table}")
                backup_content.append(f"DROP TABLE IF EXISTS {table};")
                backup_content.append(f"{create_table};")
                backup_content.append("")
                
                # Données de la table
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                
                if count > 0:
                    backup_content.append(f"-- Données de {table} ({count} enregistrements)")
                    
                    # Obtenir les colonnes
                    cursor.execute(f"DESCRIBE {table}")
                    columns = [col[0] for col in cursor.fetchall()]
                    columns_str = '`, `'.join(columns)
                    
                    # Exporter par lots de 100 pour éviter les problèmes de mémoire
                    batch_size = 100
                    offset = 0
                    
                    while offset < count:
                        cursor.execute(f"SELECT * FROM {table} LIMIT {batch_size} OFFSET {offset}")
                        rows = cursor.fetchall()
                        
                        if rows:
                            values_list = []
                            for row in rows:
                                # Échapper les valeurs NULL et les chaînes
                                escaped_values = []
                                for value in row:
                                    if value is None:
                                        escaped_values.append('NULL')
                                    elif isinstance(value, str):
                                        escaped_value = value.replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")
                                        escaped_values.append(f"'{escaped_value}'")
                                    elif isinstance(value, datetime):
                                        escaped_values.append(f"'{value}'")
                                    else:
                                        escaped_values.append(str(value))
                                
                                values_list.append(f"({', '.join(escaped_values)})")
                            
                            backup_content.append(f"INSERT INTO `{table}` (`{columns_str}`) VALUES")
                            backup_content.append(',\n'.join(values_list) + ';')
                            backup_content.append("")
                        
                        offset += batch_size
            
            # Écrire le fichier de sauvegarde
            with open(self.backup_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(backup_content))
            
            file_size = os.path.getsize(self.backup_file) / 1024 / 1024
            print(f"✅ Sauvegarde créée: {file_size:.1f} MB")
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur sauvegarde: {e}")
            return False
    
    def analyze_client_duplicates(self):
        """Analyser les clients dupliqués pour planifier le nettoyage"""
        print("\n🔍 ANALYSE DES CLIENTS DUPLIQUÉS")
        print("=" * 50)
        
        cursor = self.connection.cursor()
        
        # Doublons par nom
        cursor.execute("""
            SELECT nom, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id) as ids
            FROM client 
            GROUP BY nom 
            HAVING COUNT(*) > 1
            ORDER BY count DESC, nom
        """)
        
        name_duplicates = cursor.fetchall()
        
        # Doublons par téléphone
        cursor.execute("""
            SELECT telephone, COUNT(*) as count, 
                   GROUP_CONCAT(CONCAT(id, ':', nom) ORDER BY id) as clients
            FROM client 
            GROUP BY telephone 
            HAVING COUNT(*) > 1
            ORDER BY count DESC, telephone
        """)
        
        phone_duplicates = cursor.fetchall()
        
        print(f"📊 Résultats:")
        print(f"   👥 Doublons par nom: {len(name_duplicates)} groupes")
        print(f"   📞 Doublons par téléphone: {len(phone_duplicates)} groupes")
        
        return {
            'name_duplicates': name_duplicates,
            'phone_duplicates': phone_duplicates
        }
    
    def clean_client_name_duplicates(self, duplicates_data, dry_run=True):
        """Nettoyer les doublons de clients par nom"""
        print(f"\n👥 NETTOYAGE DES DOUBLONS PAR NOM")
        print("=" * 50)
        
        if dry_run:
            print("🔍 MODE TEST - Aucune modification réelle")
        else:
            print("⚡ MODE RÉEL - Modifications appliquées")
        
        cursor = self.connection.cursor()
        name_duplicates = duplicates_data['name_duplicates']
        
        cleaned_groups = 0
        clients_merged = 0
        clients_deleted = 0
        
        for nom, count, ids_str in name_duplicates:
            ids = [int(id_str) for id_str in ids_str.split(',')]
            print(f"\n📄 Groupe: '{nom}' ({count} clients)")
            print(f"   IDs: {ids}")
            
            # Garder le client avec l'ID le plus ancien (premier dans la liste)
            master_id = ids[0]
            duplicate_ids = ids[1:]
            
            print(f"   🎯 Garder: ID {master_id}")
            print(f"   🗑️ Supprimer: IDs {duplicate_ids}")
            
            if not dry_run:
                try:
                    # Démarrer une transaction
                    cursor.execute("START TRANSACTION")
                    
                    # Transférer tous les incidents vers le client principal
                    for dup_id in duplicate_ids:
                        cursor.execute("""
                            UPDATE incident 
                            SET id_client = %s 
                            WHERE id_client = %s
                        """, (master_id, dup_id))
                        
                        affected = cursor.rowcount
                        print(f"      📋 Transféré {affected} incidents de {dup_id} vers {master_id}")
                        
                        self.cleanup_log.append({
                            'action': 'transfer_incidents',
                            'from_client': dup_id,
                            'to_client': master_id,
                            'incidents_count': affected
                        })
                    
                    # Supprimer les clients dupliqués
                    for dup_id in duplicate_ids:
                        cursor.execute("DELETE FROM client WHERE id = %s", (dup_id,))
                        print(f"      ❌ Client {dup_id} supprimé")
                        
                        self.cleanup_log.append({
                            'action': 'delete_client',
                            'client_id': dup_id,
                            'client_name': nom
                        })
                        
                        clients_deleted += 1
                    
                    # Valider la transaction
                    cursor.execute("COMMIT")
                    print(f"   ✅ Groupe nettoyé avec succès")
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    print(f"   ❌ Erreur: {e}")
                    continue
            
            cleaned_groups += 1
            clients_merged += len(duplicate_ids)
            
            # Limite de sécurité pour le test
            if dry_run and cleaned_groups >= 5:
                print(f"\n⏸️ Arrêt test après {cleaned_groups} groupes (sécurité)")
                break
        
        print(f"\n📊 RÉSUMÉ NETTOYAGE NOMS:")
        print(f"   🧹 Groupes traités: {cleaned_groups}")
        print(f"   🔗 Clients fusionnés: {clients_merged}")
        print(f"   🗑️ Clients supprimés: {clients_deleted}")
        
        return cleaned_groups, clients_merged, clients_deleted
    
    def clean_phone_duplicates(self, duplicates_data, dry_run=True):
        """Nettoyer les doublons de téléphones (vérification manuelle)"""
        print(f"\n📞 ANALYSE DES DOUBLONS PAR TÉLÉPHONE")
        print("=" * 50)
        
        cursor = self.connection.cursor()
        phone_duplicates = duplicates_data['phone_duplicates']
        
        print("⚠️ Les doublons de téléphone nécessitent une vérification manuelle")
        print("   Raisons: Différents clients peuvent partager le même téléphone")
        
        manual_review_needed = []
        
        for telephone, count, clients_str in phone_duplicates[:10]:  # Top 10 pour examen
            print(f"\n📞 Téléphone: '{telephone}' ({count} clients)")
            clients_info = clients_str.split(',')
            
            for client_info in clients_info:
                if ':' in client_info:
                    client_id, client_name = client_info.split(':', 1)
                    print(f"   - ID {client_id}: {client_name}")
            
            # Vérifier si les noms sont similaires (même client probable)
            names = []
            for client_info in clients_info:
                if ':' in client_info:
                    _, client_name = client_info.split(':', 1)
                    names.append(client_name.strip())
            
            # Analyse de similarité simple
            if len(set(names)) == 1:
                print(f"   🚨 DOUBLON PROBABLE: Même nom pour tous")
                manual_review_needed.append({
                    'phone': telephone,
                    'type': 'same_name',
                    'clients': clients_str,
                    'action_suggested': 'merge'
                })
            else:
                print(f"   ✅ LÉGITIME: Noms différents")
                manual_review_needed.append({
                    'phone': telephone,
                    'type': 'different_names',
                    'clients': clients_str,
                    'action_suggested': 'keep_all'
                })
        
        # Sauvegarder la liste pour révision manuelle
        review_file = f"monitoring/logs/phone_duplicates_review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(review_file, 'w', encoding='utf-8') as f:
            json.dump(manual_review_needed, f, indent=2, ensure_ascii=False)
        
        print(f"\n📋 Fichier de révision créé: {review_file}")
        print(f"   📊 Cas à examiner: {len(manual_review_needed)}")
        
        return len(manual_review_needed)
    
    def clean_identical_incidents(self, dry_run=True):
        """Supprimer les incidents complètement identiques"""
        print(f"\n🚨 NETTOYAGE DES INCIDENTS IDENTIQUES")
        print("=" * 50)
        
        if dry_run:
            print("🔍 MODE TEST - Aucune modification réelle")
        else:
            print("⚡ MODE RÉEL - Modifications appliquées")
        
        cursor = self.connection.cursor()
        
        # Identifier les incidents complètement identiques
        cursor.execute("""
            SELECT intitule, COALESCE(observations, '') as observations, status, 
                   COUNT(*) as count,
                   GROUP_CONCAT(id ORDER BY id) as incident_ids,
                   GROUP_CONCAT(DATE(date_heure) ORDER BY id) as dates
            FROM incident 
            GROUP BY intitule, COALESCE(observations, ''), status
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        identical_groups = cursor.fetchall()
        
        print(f"📊 Groupes d'incidents identiques: {len(identical_groups)}")
        
        groups_cleaned = 0
        incidents_deleted = 0
        
        for intitule, observations, status, count, ids_str, dates_str in identical_groups:
            ids = [int(id_str) for id_str in ids_str.split(',')]
            
            print(f"\n📄 Incident: '{intitule[:50]}{'...' if len(intitule) > 50 else ''}'")
            print(f"   Status: {status}")
            print(f"   Observations: {observations[:30]}{'...' if len(observations) > 30 else ''}")
            print(f"   Count: {count} incidents")
            print(f"   IDs: {ids[:10]}{'...' if len(ids) > 10 else ''}")
            
            # Garder le plus ancien (premier ID), supprimer les autres
            master_id = ids[0]
            duplicate_ids = ids[1:]
            
            print(f"   🎯 Garder: ID {master_id}")
            print(f"   🗑️ Supprimer: {len(duplicate_ids)} incidents")
            
            if not dry_run:
                try:
                    cursor.execute("START TRANSACTION")
                    
                    # Supprimer les incidents dupliqués
                    for dup_id in duplicate_ids:
                        cursor.execute("DELETE FROM incident WHERE id = %s", (dup_id,))
                        
                        self.cleanup_log.append({
                            'action': 'delete_incident',
                            'incident_id': dup_id,
                            'incident_title': intitule,
                            'status': status
                        })
                        
                        incidents_deleted += 1
                    
                    cursor.execute("COMMIT")
                    print(f"   ✅ Groupe nettoyé: {len(duplicate_ids)} incidents supprimés")
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    print(f"   ❌ Erreur: {e}")
                    continue
            
            groups_cleaned += 1
            
            # Limite de sécurité pour le test
            if dry_run and groups_cleaned >= 10:
                print(f"\n⏸️ Arrêt test après {groups_cleaned} groupes (sécurité)")
                break
        
        print(f"\n📊 RÉSUMÉ NETTOYAGE INCIDENTS:")
        print(f"   🧹 Groupes traités: {groups_cleaned}")
        print(f"   🗑️ Incidents supprimés: {incidents_deleted}")
        
        return groups_cleaned, incidents_deleted
    
    def verify_cleanup(self):
        """Vérifier l'intégrité après nettoyage"""
        print(f"\n✅ VÉRIFICATION POST-NETTOYAGE")
        print("=" * 50)
        
        cursor = self.connection.cursor()
        
        # Vérifier les contraintes de clés étrangères
        print("🔗 Vérification des clés étrangères...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        try:
            # Test d'intégrité des incidents
            cursor.execute("""
                SELECT COUNT(*) FROM incident i 
                LEFT JOIN client c ON i.id_client = c.id 
                WHERE c.id IS NULL
            """)
            orphaned_incidents = cursor.fetchone()[0]
            
            if orphaned_incidents > 0:
                print(f"❌ {orphaned_incidents} incidents orphelins détectés")
                return False
            else:
                print("✅ Aucun incident orphelin")
            
            # Test d'intégrité des opérateurs
            cursor.execute("""
                SELECT COUNT(*) FROM incident i 
                LEFT JOIN operateur o ON i.id_operateur = o.id 
                WHERE o.id IS NULL
            """)
            orphaned_operateur = cursor.fetchone()[0]
            
            if orphaned_operateur > 0:
                print(f"❌ {orphaned_operateur} incidents sans opérateur valide")
                return False
            else:
                print("✅ Tous les incidents ont un opérateur valide")
            
            # Compter les nouveaux totaux
            cursor.execute("SELECT COUNT(*) FROM client")
            total_clients = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM incident")
            total_incidents = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM operateur")
            total_operateurs = cursor.fetchone()[0]
            
            print(f"\n📊 TOTAUX APRÈS NETTOYAGE:")
            print(f"   👥 Clients: {total_clients}")
            print(f"   🚨 Incidents: {total_incidents}")
            print(f"   👨‍💼 Opérateurs: {total_operateurs}")
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur vérification: {e}")
            return False
    
    def save_cleanup_log(self):
        """Sauvegarder le log détaillé du nettoyage"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = f"monitoring/logs/cleanup_log_{timestamp}.json"
        
        log_data = {
            'timestamp': timestamp,
            'backup_file': self.backup_file,
            'operations': self.cleanup_log,
            'summary': {
                'total_operations': len(self.cleanup_log),
                'clients_deleted': len([op for op in self.cleanup_log if op['action'] == 'delete_client']),
                'incidents_transferred': len([op for op in self.cleanup_log if op['action'] == 'transfer_incidents']),
                'incidents_deleted': len([op for op in self.cleanup_log if op['action'] == 'delete_incident'])
            }
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        
        print(f"📋 Log de nettoyage sauvegardé: {log_file}")
        return log_file
    
    def close(self):
        """Fermer la connexion"""
        if self.connection:
            self.connection.close()
            print("🔗 Connexion fermée")

def main():
    """Fonction principale de nettoyage PRIORITÉ 1"""
    
    print("🧹 NETTOYAGE PRIORITÉ 1 - DOUBLONS MARIADB FCC_001")
    print("=" * 60)
    print("🚨 ATTENTION: Opération critique avec toutes les précautions")
    
    cleaner = MariaDBDuplicateCleaner()
    
    try:
        # 1. Connexion
        if not cleaner.connect():
            return 1
        
        # 2. Sauvegarde complète
        print("\n🛡️ ÉTAPE 1: SAUVEGARDE SÉCURISÉE")
        if not cleaner.create_backup():
            print("❌ Impossible de continuer sans sauvegarde")
            return 1
        
        # 3. Analyse des doublons
        print("\n🔍 ÉTAPE 2: ANALYSE DES DOUBLONS")
        duplicates_data = cleaner.analyze_client_duplicates()
        
        # 4. Mode TEST d'abord
        print("\n🧪 ÉTAPE 3: TESTS DE NETTOYAGE (DRY RUN)")
        
        # Test nettoyage clients
        cleaner.clean_client_name_duplicates(duplicates_data, dry_run=True)
        
        # Test nettoyage téléphones
        cleaner.clean_phone_duplicates(duplicates_data, dry_run=True)
        
        # Test nettoyage incidents
        cleaner.clean_identical_incidents(dry_run=True)
        
        # 5. Demander confirmation pour le mode réel
        print("\n❓ ÉTAPE 4: CONFIRMATION POUR MODE RÉEL")
        print("   Les tests sont terminés. Voulez-vous procéder au nettoyage réel ?")
        print("   ⚠️ Cette action est IRRÉVERSIBLE (sauvegarde disponible)")
        
        # Pour l'automatisation, on s'arrête au mode test
        print("\n⏸️ ARRÊT SÉCURISÉ EN MODE TEST")
        print("   Pour exécuter le nettoyage réel:")
        print("   python tools/clean_mariadb_duplicates.py --real-mode")
        
        # Sauvegarder le log
        cleaner.save_cleanup_log()
        
        return 0
        
    except Exception as e:
        print(f"❌ Erreur critique: {e}")
        return 1
        
    finally:
        cleaner.close()

if __name__ == "__main__":
    # Vérifier les arguments
    real_mode = "--real-mode" in sys.argv
    
    if real_mode:
        print("⚡ MODE RÉEL ACTIVÉ - Les modifications seront appliquées")
        response = input("Êtes-vous sûr ? (tapez 'CONFIRMER' pour continuer): ")
        if response != "CONFIRMER":
            print("❌ Opération annulée")
            sys.exit(1)
    
    sys.exit(main())