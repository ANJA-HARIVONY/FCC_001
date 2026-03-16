#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
👥 Nettoyage Spécialisé - Clients avec Noms Identiques
Fusion sécurisée des 100 groupes de clients dupliqués par nom
"""

import os
import sys
import json
import pymysql
from datetime import datetime

# Ajouter core au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

class ClientNameDuplicateCleaner:
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
        self.operations_log = []
        self.backup_created = False
        
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
                autocommit=False  # Mode transactionnel
            )
            print("✅ Connexion MariaDB établie")
            return True
        except Exception as e:
            print(f"❌ Erreur connexion: {e}")
            return False
    
    def create_incremental_backup(self):
        """Créer une sauvegarde incrémentale avant nettoyage clients"""
        print("\n💾 SAUVEGARDE INCRÉMENTALE CLIENTS")
        print("=" * 50)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"monitoring/logs/clients_backup_before_name_cleanup_{timestamp}.sql"
        
        try:
            cursor = self.connection.cursor()
            
            backup_content = []
            backup_content.append(f"-- Sauvegarde Clients FCC_001 - {timestamp}")
            backup_content.append(f"-- Sauvegarde avant nettoyage doublons par nom")
            backup_content.append("")
            
            # Sauvegarder la table client complète
            print("📄 Sauvegarde table client...")
            cursor.execute("SHOW CREATE TABLE client")
            create_table = cursor.fetchone()[1]
            backup_content.append("-- Structure table client")
            backup_content.append("DROP TABLE IF EXISTS client_backup;")
            backup_content.append(f"CREATE TABLE client_backup AS {create_table.replace('CREATE TABLE `client`', 'SELECT * FROM client; CREATE TABLE `client_backup`')}")
            backup_content.append("")
            
            # Sauvegarder tous les clients
            cursor.execute("SELECT COUNT(*) FROM client")
            total_clients = cursor.fetchone()[0]
            print(f"📊 Total clients à sauvegarder: {total_clients}")
            
            cursor.execute("SELECT * FROM client ORDER BY id")
            clients = cursor.fetchall()
            
            # Obtenir les colonnes
            cursor.execute("DESCRIBE client")
            columns = [col[0] for col in cursor.fetchall()]
            columns_str = '`, `'.join(columns)
            
            backup_content.append(f"-- Données table client ({total_clients} enregistrements)")
            backup_content.append("DELETE FROM client_backup;")
            
            values_list = []
            for client in clients:
                escaped_values = []
                for value in client:
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
                
                # Traiter par lots de 50
                if len(values_list) >= 50:
                    backup_content.append(f"INSERT INTO client_backup (`{columns_str}`) VALUES")
                    backup_content.append(',\n'.join(values_list) + ';')
                    backup_content.append("")
                    values_list = []
            
            # Derniers enregistrements
            if values_list:
                backup_content.append(f"INSERT INTO client_backup (`{columns_str}`) VALUES")
                backup_content.append(',\n'.join(values_list) + ';')
                backup_content.append("")
            
            # Écrire le fichier de sauvegarde
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(backup_content))
            
            file_size = os.path.getsize(backup_file) / 1024
            print(f"✅ Sauvegarde créée: {file_size:.1f} KB")
            self.backup_created = True
            
            return backup_file
            
        except Exception as e:
            print(f"❌ Erreur sauvegarde: {e}")
            return None
    
    def analyze_name_duplicates(self):
        """Analyser en détail les doublons par nom"""
        print("\n🔍 ANALYSE DÉTAILLÉE DES DOUBLONS PAR NOM")
        print("=" * 50)
        
        cursor = self.connection.cursor()
        
        # Obtenir tous les groupes de doublons par nom
        cursor.execute("""
            SELECT nom, COUNT(*) as count, 
                   GROUP_CONCAT(id ORDER BY id) as ids,
                   GROUP_CONCAT(CONCAT(id, ':', telephone, ':', ville) ORDER BY id) as details
            FROM client 
            GROUP BY nom 
            HAVING COUNT(*) > 1
            ORDER BY count DESC, nom
        """)
        
        name_duplicates = cursor.fetchall()
        
        print(f"📊 Groupes de doublons trouvés: {len(name_duplicates)}")
        
        # Analyser chaque groupe
        analysis = []
        total_to_merge = 0
        
        for nom, count, ids_str, details_str in name_duplicates:
            ids = [int(id_str) for id_str in ids_str.split(',')]
            
            # Analyser les détails
            details_list = details_str.split(',')
            clients_info = []
            
            for detail in details_list:
                parts = detail.split(':', 2)
                if len(parts) >= 3:
                    client_id, telephone, ville = parts
                    clients_info.append({
                        'id': int(client_id),
                        'telephone': telephone,
                        'ville': ville
                    })
            
            # Compter les incidents pour chaque client
            incident_counts = []
            for client_id in ids:
                cursor.execute("SELECT COUNT(*) FROM incident WHERE id_client = %s", (client_id,))
                incidents_count = cursor.fetchone()[0]
                incident_counts.append(incidents_count)
            
            group_analysis = {
                'nom': nom,
                'count': count,
                'ids': ids,
                'clients_info': clients_info,
                'incident_counts': incident_counts,
                'total_incidents': sum(incident_counts),
                'master_id': ids[0],  # Garder le plus ancien
                'duplicates_to_remove': ids[1:]
            }
            
            analysis.append(group_analysis)
            total_to_merge += count - 1  # -1 car on garde un client par groupe
        
        print(f"📋 Clients à fusionner: {total_to_merge}")
        
        # Afficher les cas les plus complexes
        print(f"\n🎯 TOP 10 DES GROUPES À TRAITER:")
        for i, group in enumerate(analysis[:10], 1):
            print(f"   {i:2}. '{group['nom'][:40]}{'...' if len(group['nom']) > 40 else ''}'")
            print(f"       Clients: {group['count']} | Incidents total: {group['total_incidents']}")
            print(f"       IDs: {group['ids']}")
        
        return analysis
    
    def clean_name_duplicates_batch(self, analysis, batch_size=10, dry_run=False):
        """Nettoyer les doublons par lots"""
        print(f"\n👥 NETTOYAGE DES DOUBLONS PAR NOM")
        print("=" * 50)
        
        if dry_run:
            print("🔍 MODE TEST - Aucune modification")
        else:
            print("⚡ MODE RÉEL - Modifications appliquées")
        
        cursor = self.connection.cursor()
        
        total_groups = len(analysis)
        processed_groups = 0
        total_clients_merged = 0
        total_incidents_transferred = 0
        errors = []
        
        print(f"📊 Traitement de {total_groups} groupes par lots de {batch_size}")
        
        for batch_start in range(0, total_groups, batch_size):
            batch_end = min(batch_start + batch_size, total_groups)
            batch = analysis[batch_start:batch_end]
            
            print(f"\n📦 LOT {batch_start//batch_size + 1}: Groupes {batch_start+1} à {batch_end}")
            
            if not dry_run:
                try:
                    cursor.execute("START TRANSACTION")
                    print("🔄 Transaction démarrée")
                except Exception as e:
                    print(f"❌ Erreur démarrage transaction: {e}")
                    continue
            
            batch_success = True
            batch_clients_merged = 0
            batch_incidents_transferred = 0
            
            for group in batch:
                try:
                    master_id = group['master_id']
                    duplicates = group['duplicates_to_remove']
                    nom = group['nom']
                    
                    print(f"   📄 '{nom[:30]}{'...' if len(nom) > 30 else ''}'")
                    print(f"      Garder: ID {master_id}")
                    print(f"      Fusionner: IDs {duplicates}")
                    
                    if not dry_run:
                        # Transférer tous les incidents vers le client principal
                        total_transferred = 0
                        for dup_id in duplicates:
                            cursor.execute("""
                                UPDATE incident 
                                SET id_client = %s 
                                WHERE id_client = %s
                            """, (master_id, dup_id))
                            
                            transferred = cursor.rowcount
                            total_transferred += transferred
                            
                            print(f"         📋 Transféré {transferred} incidents: {dup_id} → {master_id}")
                            
                            self.operations_log.append({
                                'action': 'transfer_incidents',
                                'from_client_id': dup_id,
                                'to_client_id': master_id,
                                'client_name': nom,
                                'incidents_transferred': transferred,
                                'timestamp': datetime.now().isoformat()
                            })
                        
                        # Supprimer les clients dupliqués
                        for dup_id in duplicates:
                            cursor.execute("DELETE FROM client WHERE id = %s", (dup_id,))
                            print(f"         ❌ Client {dup_id} supprimé")
                            
                            self.operations_log.append({
                                'action': 'delete_client',
                                'client_id': dup_id,
                                'client_name': nom,
                                'timestamp': datetime.now().isoformat()
                            })
                        
                        batch_incidents_transferred += total_transferred
                        batch_clients_merged += len(duplicates)
                    
                    else:
                        # Mode test - juste afficher ce qui serait fait
                        total_incidents = sum(group['incident_counts'][1:])  # Exclure le master
                        print(f"         📋 Transférerait {total_incidents} incidents")
                        print(f"         ❌ Supprimerait {len(duplicates)} clients")
                    
                except Exception as e:
                    print(f"      ❌ Erreur groupe '{nom}': {e}")
                    errors.append({
                        'group': nom,
                        'error': str(e),
                        'ids': group['ids']
                    })
                    batch_success = False
                    if not dry_run:
                        break
            
            if not dry_run:
                if batch_success:
                    try:
                        cursor.execute("COMMIT")
                        print(f"   ✅ Lot {batch_start//batch_size + 1} validé")
                        total_clients_merged += batch_clients_merged
                        total_incidents_transferred += batch_incidents_transferred
                    except Exception as e:
                        cursor.execute("ROLLBACK")
                        print(f"   ❌ Lot {batch_start//batch_size + 1} annulé: {e}")
                        batch_success = False
                else:
                    cursor.execute("ROLLBACK")
                    print(f"   ❌ Lot {batch_start//batch_size + 1} annulé (erreurs)")
            
            processed_groups += len(batch)
            
            # Pause sécurité entre les lots
            if not dry_run and batch_success:
                print(f"   ⏸️ Pause sécurité...")
                import time
                time.sleep(1)
        
        print(f"\n📊 RÉSUMÉ DU NETTOYAGE:")
        print(f"   🧹 Groupes traités: {processed_groups}/{total_groups}")
        print(f"   🔗 Clients fusionnés: {total_clients_merged}")
        print(f"   📋 Incidents transférés: {total_incidents_transferred}")
        print(f"   ❌ Erreurs: {len(errors)}")
        
        if errors:
            print(f"\n⚠️ ERREURS DÉTECTÉES:")
            for error in errors[:5]:  # Top 5 des erreurs
                print(f"   - {error['group']}: {error['error']}")
        
        return {
            'processed_groups': processed_groups,
            'clients_merged': total_clients_merged,
            'incidents_transferred': total_incidents_transferred,
            'errors': errors
        }
    
    def verify_cleanup_integrity(self):
        """Vérifier l'intégrité après nettoyage"""
        print(f"\n✅ VÉRIFICATION INTÉGRITÉ POST-NETTOYAGE")
        print("=" * 50)
        
        cursor = self.connection.cursor()
        
        # 1. Vérifier les incidents orphelins
        cursor.execute("""
            SELECT COUNT(*) FROM incident i 
            LEFT JOIN client c ON i.id_client = c.id 
            WHERE c.id IS NULL
        """)
        orphaned = cursor.fetchone()[0]
        
        if orphaned > 0:
            print(f"❌ {orphaned} incidents orphelins détectés!")
            return False
        else:
            print("✅ Aucun incident orphelin")
        
        # 2. Compter les doublons restants par nom
        cursor.execute("""
            SELECT COUNT(*) FROM (
                SELECT nom FROM client 
                GROUP BY nom 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)
        remaining_duplicates = cursor.fetchone()[0]
        
        print(f"📊 Doublons par nom restants: {remaining_duplicates}")
        
        # 3. Totaux actuels
        cursor.execute("SELECT COUNT(*) FROM client")
        total_clients = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM incident")
        total_incidents = cursor.fetchone()[0]
        
        print(f"📊 Totaux après nettoyage:")
        print(f"   👥 Clients: {total_clients}")
        print(f"   🚨 Incidents: {total_incidents}")
        
        return {
            'orphaned_incidents': orphaned,
            'remaining_name_duplicates': remaining_duplicates,
            'total_clients': total_clients,
            'total_incidents': total_incidents,
            'integrity_ok': orphaned == 0
        }
    
    def save_operations_log(self):
        """Sauvegarder le journal des opérations"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = f"monitoring/logs/client_name_cleanup_log_{timestamp}.json"
        
        log_data = {
            'timestamp': timestamp,
            'operation_type': 'client_name_duplicates_cleanup',
            'backup_created': self.backup_created,
            'operations': self.operations_log,
            'summary': {
                'total_operations': len(self.operations_log),
                'clients_deleted': len([op for op in self.operations_log if op['action'] == 'delete_client']),
                'incidents_transferred': sum([op.get('incidents_transferred', 0) for op in self.operations_log if op['action'] == 'transfer_incidents'])
            }
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        
        print(f"📋 Journal des opérations sauvegardé: {log_file}")
        return log_file
    
    def close(self):
        """Fermer la connexion"""
        if self.connection:
            self.connection.close()
            print("🔗 Connexion fermée")

def main():
    """Fonction principale de nettoyage des clients par nom"""
    
    print("👥 NETTOYAGE SPÉCIALISÉ - CLIENTS NOMS IDENTIQUES")
    print("=" * 60)
    
    # Vérifier les arguments
    dry_run = "--dry-run" in sys.argv or "--test" in sys.argv
    real_mode = "--real" in sys.argv
    
    if not dry_run and not real_mode:
        print("🔍 MODE TEST ACTIVÉ (ajoutez --real pour le mode réel)")
        dry_run = True
    
    cleaner = ClientNameDuplicateCleaner()
    
    try:
        # 1. Connexion
        if not cleaner.connect():
            return 1
        
        # 2. Sauvegarde incrémentale
        if not dry_run:
            print("\n🛡️ ÉTAPE 1: SAUVEGARDE INCRÉMENTALE")
            backup_file = cleaner.create_incremental_backup()
            if not backup_file:
                print("❌ Impossible de continuer sans sauvegarde")
                return 1
        
        # 3. Analyse des doublons
        print("\n🔍 ÉTAPE 2: ANALYSE DES DOUBLONS")
        analysis = cleaner.analyze_name_duplicates()
        
        if not analysis:
            print("✅ Aucun doublon par nom trouvé!")
            return 0
        
        # 4. Nettoyage par lots
        print(f"\n🧹 ÉTAPE 3: NETTOYAGE {'(TEST)' if dry_run else '(RÉEL)'}")
        results = cleaner.clean_name_duplicates_batch(
            analysis, 
            batch_size=5,  # Petits lots pour sécurité
            dry_run=dry_run
        )
        
        # 5. Vérification (seulement en mode réel)
        if not dry_run:
            print("\n✅ ÉTAPE 4: VÉRIFICATION")
            integrity = cleaner.verify_cleanup_integrity()
            
            if not integrity['integrity_ok']:
                print("❌ Problème d'intégrité détecté!")
                return 1
        
        # 6. Sauvegarde du journal
        cleaner.save_operations_log()
        
        # Résumé final
        print(f"\n🎉 NETTOYAGE TERMINÉ")
        print("=" * 60)
        
        if dry_run:
            print("🔍 Test terminé - Aucune modification appliquée")
            print("   Pour exécuter le nettoyage réel:")
            print("   python tools/clean_client_name_duplicates.py --real")
        else:
            print(f"✅ Nettoyage réel terminé")
            print(f"   🔗 Clients fusionnés: {results['clients_merged']}")
            print(f"   📋 Incidents transférés: {results['incidents_transferred']}")
            print(f"   ❌ Erreurs: {len(results['errors'])}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Erreur critique: {e}")
        return 1
        
    finally:
        cleaner.close()

if __name__ == "__main__":
    sys.exit(main())