#!/usr/bin/env python3
"""
Script de déploiement sécurisé pour les modifications en production
Usage: python deploy_production.py [--backup] [--restore] [--verify]
"""

import os
import sys
import time
import shutil
import json
import subprocess
from datetime import datetime
import pymysql
import requests
import argparse

class ProductionDeployer:
    """Gestionnaire de déploiement en production"""
    
    def __init__(self):
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_dir = 'backups'
        self.log_file = f'logs/deploy_{self.timestamp}.log'
        
    def log(self, message):
        """Écrire dans le fichier de log"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}\n"
        
        # Créer le dossier logs si nécessaire
        os.makedirs('logs', exist_ok=True)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message)
        print(log_message.strip())
    
    def backup_database(self):
        """Sauvegarder la base de données"""
        self.log("📦 Sauvegarde de la base de données...")
        
        try:
            # Créer le dossier de backup si nécessaire
            os.makedirs(self.backup_dir, exist_ok=True)
            
            # Connexion à la base de données
            connection = pymysql.connect(
                host='localhost',
                user='root',
                password='toor',
                database='fcc_001_db',
                charset='utf8mb4'
            )
            
            # Sauvegarder les tables principales
            tables = ['client', 'incident', 'operateur']
            backup_data = {}
            
            for table in tables:
                cursor = connection.cursor(pymysql.cursors.DictCursor)
                cursor.execute(f"SELECT * FROM {table}")
                backup_data[table] = cursor.fetchall()
            
            # Sauvegarder dans un fichier JSON
            backup_file = f'{self.backup_dir}/db_backup_{self.timestamp}.json'
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            connection.close()
            
            self.log(f"✅ Base de données sauvegardée: {backup_file}")
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de sauvegarde: {e}")
            return False
    
    def backup_config(self):
        """Sauvegarder les fichiers de configuration"""
        self.log("📦 Sauvegarde des fichiers de configuration...")
        
        try:
            config_files = [
                'production_config.py',
                'app_production.py',
                'start_production.py'
            ]
            
            for file in config_files:
                if os.path.exists(file):
                    backup_file = f'{self.backup_dir}/{file}_{self.timestamp}'
                    shutil.copy2(file, backup_file)
                    self.log(f"✅ {file} sauvegardé")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de sauvegarde config: {e}")
            return False
    
    def stop_application(self):
        """Arrêter l'application"""
        self.log("🛑 Arrêt de l'application...")
        
        try:
            # Vérifier le fichier PID
            if os.path.exists('app_production.pid'):
                with open('app_production.pid', 'r') as f:
                    pid = int(f.read().strip())
                
                # Arrêter le processus
                subprocess.run(['taskkill', '/F', '/PID', str(pid)], 
                             capture_output=True, text=True)
                os.remove('app_production.pid')
                self.log("✅ Application arrêtée")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur d'arrêt: {e}")
            return False
    
    def verify_system(self):
        """Vérifier l'état du système"""
        self.log("🔍 Vérification du système...")
        
        try:
            # Vérifier la base de données
            connection = pymysql.connect(
                host='localhost',
                user='root',
                password='toor',
                database='fcc_001_db',
                charset='utf8mb4'
            )
            
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM client")
            clients_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM incident")
            incidents_count = cursor.fetchone()[0]
            
            connection.close()
            
            self.log(f"✅ Base de données: {clients_count} clients, {incidents_count} incidents")
            
            # Vérifier les fichiers critiques
            critical_files = [
                'production_config.py',
                'app_production.py',
                'start_production.py'
            ]
            
            for file in critical_files:
                if os.path.exists(file):
                    self.log(f"✅ {file} présent")
                else:
                    self.log(f"❌ {file} manquant")
                    return False
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de vérification: {e}")
            return False
    
    def restore_backup(self, timestamp):
        """Restaurer une sauvegarde"""
        self.log(f"🔄 Restauration de la sauvegarde {timestamp}...")
        
        try:
            # Restaurer la base de données
            backup_file = f'{self.backup_dir}/db_backup_{timestamp}.json'
            if os.path.exists(backup_file):
                with open(backup_file, 'r', encoding='utf-8') as f:
                    backup_data = json.load(f)
                
                connection = pymysql.connect(
                    host='localhost',
                    user='root',
                    password='toor',
                    database='fcc_001_db',
                    charset='utf8mb4'
                )
                
                cursor = connection.cursor()
                
                # Vider les tables
                for table in backup_data.keys():
                    cursor.execute(f"TRUNCATE TABLE {table}")
                
                # Restaurer les données
                for table, data in backup_data.items():
                    if data:
                        columns = data[0].keys()
                        placeholders = ', '.join(['%s'] * len(columns))
                        query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
                        
                        for row in data:
                            cursor.execute(query, list(row.values()))
                
                connection.commit()
                connection.close()
                
                self.log("✅ Base de données restaurée")
            
            # Restaurer les fichiers de configuration
            config_files = [
                'production_config.py',
                'app_production.py',
                'start_production.py'
            ]
            
            for file in config_files:
                backup_file = f'{self.backup_dir}/{file}_{timestamp}'
                if os.path.exists(backup_file):
                    shutil.copy2(backup_file, file)
                    self.log(f"✅ {file} restauré")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de restauration: {e}")
            return False
    
    def start_application(self):
        """Démarrer l'application"""
        self.log("🚀 Démarrage de l'application...")
        
        try:
            subprocess.Popen(
                [sys.executable, 'start_production.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Attendre que l'application démarre
            time.sleep(5)
            
            # Vérifier que l'application répond
            try:
                response = requests.get('http://localhost:5001/health', timeout=10)
                if response.status_code == 200:
                    self.log("✅ Application démarrée et responsive")
                    return True
            except:
                pass
            
            self.log("❌ Application non responsive")
            return False
            
        except Exception as e:
            self.log(f"❌ Erreur de démarrage: {e}")
            return False
    
    def deploy(self):
        """Procédure de déploiement complète"""
        self.log("🎯 DÉPLOIEMENT EN PRODUCTION")
        self.log("=" * 50)
        
        # 1. Vérification préalable
        if not self.verify_system():
            self.log("❌ Vérification système échouée")
            return False
        
        # 2. Sauvegarde
        if not self.backup_database():
            self.log("❌ Sauvegarde base de données échouée")
            return False
        
        if not self.backup_config():
            self.log("❌ Sauvegarde configuration échouée")
            return False
        
        # 3. Arrêt de l'application
        if not self.stop_application():
            self.log("❌ Arrêt application échoué")
            return False
        
        # 4. Ici, vous pouvez appliquer vos modifications
        self.log("📝 Application des modifications...")
        # TODO: Ajouter vos modifications ici
        
        # 5. Vérification post-déploiement
        if not self.verify_system():
            self.log("❌ Vérification post-déploiement échouée")
            self.log("🔄 Tentative de restauration...")
            self.restore_backup(self.timestamp)
            return False
        
        # 6. Démarrage de l'application
        if not self.start_application():
            self.log("❌ Démarrage application échoué")
            self.log("🔄 Tentative de restauration...")
            self.restore_backup(self.timestamp)
            return False
        
        self.log("🎉 DÉPLOIEMENT RÉUSSI!")
        return True

def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(description='Déploiement en production')
    parser.add_argument('--backup', action='store_true', help='Faire une sauvegarde')
    parser.add_argument('--restore', help='Restaurer une sauvegarde (timestamp)')
    parser.add_argument('--verify', action='store_true', help='Vérifier le système')
    
    args = parser.parse_args()
    
    deployer = ProductionDeployer()
    
    if args.backup:
        deployer.backup_database()
        deployer.backup_config()
    elif args.restore:
        deployer.restore_backup(args.restore)
    elif args.verify:
        deployer.verify_system()
    else:
        deployer.deploy()

if __name__ == "__main__":
    main() 