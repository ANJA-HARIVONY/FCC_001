#!/usr/bin/env python3
"""
Script de synchronisation du développement vers la production
Usage: python sync_to_prod.py [--force]
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime
import argparse

class SyncManager:
    """Gestionnaire de synchronisation dev -> prod"""
    
    def __init__(self):
        self.dev_dir = "FCC_001_DEV"
        self.prod_dir = "FCC_001_PROD"
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.log_file = f'logs/sync_{self.timestamp}.log'
    
    def log(self, message):
        """Écrire dans le fichier de log"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}\n"
        
        # Créer le dossier logs si nécessaire
        os.makedirs('logs', exist_ok=True)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message)
        print(log_message.strip())
    
    def verify_dev(self):
        """Vérifier l'environnement de développement"""
        self.log("🔍 Vérification de l'environnement de développement...")
        
        # Vérifier les fichiers critiques
        critical_files = [
            os.path.join(self.dev_dir, 'src', 'app.py'),
            os.path.join(self.dev_dir, 'src', 'app_production.py'),
            os.path.join(self.dev_dir, 'src', 'production_config.py'),
            os.path.join(self.dev_dir, 'src', 'start_production.py')
        ]
        
        for file in critical_files:
            if not os.path.exists(file):
                self.log(f"❌ Fichier manquant: {file}")
                return False
        
        self.log("✅ Environnement de développement OK")
        return True
    
    def backup_prod(self):
        """Sauvegarder l'environnement de production"""
        self.log("📦 Sauvegarde de l'environnement de production...")
        
        try:
            # Créer le dossier de backup
            backup_dir = os.path.join(self.prod_dir, 'backups', f'backup_{self.timestamp}')
            os.makedirs(backup_dir, exist_ok=True)
            
            # Copier les fichiers importants
            prod_app_dir = os.path.join(self.prod_dir, 'app')
            if os.path.exists(prod_app_dir):
                backup_app_dir = os.path.join(backup_dir, 'app')
                shutil.copytree(prod_app_dir, backup_app_dir)
                self.log("✅ Application sauvegardée")
            
            self.log(f"✅ Sauvegarde créée: {backup_dir}")
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de sauvegarde: {e}")
            return False
    
    def sync_files(self):
        """Synchroniser les fichiers de dev vers prod"""
        self.log("🔄 Synchronisation des fichiers...")
        
        try:
            # Fichiers à synchroniser
            files_to_sync = [
                'app.py',
                'app_production.py',
                'production_config.py',
                'start_production.py',
                'deploy_production.py',
                'requirements.txt',
                'requirements_production.txt'
            ]
            
            # Dossiers à synchroniser
            dirs_to_sync = [
                'templates',
                'static',
                'migrations',
                'translations',
                'utils'
            ]
            
            # Copier les fichiers
            for file in files_to_sync:
                src = os.path.join(self.dev_dir, 'src', file)
                if os.path.exists(src):
                    dest = os.path.join(self.prod_dir, 'app', file)
                    shutil.copy2(src, dest)
                    self.log(f"✅ Fichier synchronisé: {file}")
            
            # Copier les dossiers
            for dir_name in dirs_to_sync:
                src = os.path.join(self.dev_dir, 'src', dir_name)
                if os.path.exists(src):
                    dest = os.path.join(self.prod_dir, 'app', dir_name)
                    if os.path.exists(dest):
                        shutil.rmtree(dest)
                    shutil.copytree(src, dest)
                    self.log(f"✅ Dossier synchronisé: {dir_name}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de synchronisation: {e}")
            return False
    
    def verify_prod(self):
        """Vérifier l'environnement de production"""
        self.log("🔍 Vérification de l'environnement de production...")
        
        # Vérifier les fichiers critiques
        critical_files = [
            os.path.join(self.prod_dir, 'app', 'app.py'),
            os.path.join(self.prod_dir, 'app', 'app_production.py'),
            os.path.join(self.prod_dir, 'app', 'production_config.py'),
            os.path.join(self.prod_dir, 'app', 'start_production.py')
        ]
        
        for file in critical_files:
            if not os.path.exists(file):
                self.log(f"❌ Fichier manquant: {file}")
                return False
        
        self.log("✅ Environnement de production OK")
        return True
    
    def run_tests(self):
        """Exécuter les tests"""
        self.log("🧪 Exécution des tests...")
        
        try:
            # Changer vers le dossier de dev
            os.chdir(self.dev_dir)
            
            # Exécuter les tests unitaires
            result = subprocess.run(
                ['python', '-m', 'pytest', 'tests/unit'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.log("✅ Tests unitaires passés")
            else:
                self.log(f"❌ Tests unitaires échoués: {result.stdout}")
                return False
            
            # Exécuter les tests d'intégration
            result = subprocess.run(
                ['python', '-m', 'pytest', 'tests/integration'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.log("✅ Tests d'intégration passés")
            else:
                self.log(f"❌ Tests d'intégration échoués: {result.stdout}")
                return False
            
            # Revenir au dossier original
            os.chdir('..')
            
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur lors des tests: {e}")
            return False
    
    def sync(self, force=False):
        """Procédure de synchronisation complète"""
        self.log("🎯 SYNCHRONISATION DEV -> PROD")
        self.log("=" * 50)
        
        # 1. Vérifier l'environnement de développement
        if not self.verify_dev():
            self.log("❌ Vérification dev échouée")
            return False
        
        # 2. Exécuter les tests
        if not force and not self.run_tests():
            self.log("❌ Tests échoués")
            return False
        
        # 3. Sauvegarder la production
        if not self.backup_prod():
            self.log("❌ Sauvegarde production échouée")
            return False
        
        # 4. Synchroniser les fichiers
        if not self.sync_files():
            self.log("❌ Synchronisation échouée")
            return False
        
        # 5. Vérifier la production
        if not self.verify_prod():
            self.log("❌ Vérification production échouée")
            return False
        
        self.log("🎉 SYNCHRONISATION RÉUSSIE!")
        return True

def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(description='Synchronisation dev -> prod')
    parser.add_argument('--force', action='store_true', help='Forcer la synchronisation sans tests')
    
    args = parser.parse_args()
    
    sync_manager = SyncManager()
    
    if sync_manager.sync(force=args.force):
        print("\n📋 RÉSUMÉ")
        print("=" * 50)
        print("✅ Synchronisation terminée avec succès")
        print(f"📝 Logs: {sync_manager.log_file}")
        print("\n⚠️  IMPORTANT")
        print("- Vérifiez l'application en production")
        print("- Utilisez deploy_production.py pour démarrer")
    else:
        print("\n❌ ÉCHEC DE LA SYNCHRONISATION")
        print(f"📝 Consultez les logs: {sync_manager.log_file}")
        sys.exit(1)

if __name__ == "__main__":
    main() 