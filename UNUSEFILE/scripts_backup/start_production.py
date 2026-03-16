#!/usr/bin/env python3
"""
Script de démarrage en production pour l'application de gestion des clients
Usage: python start_production.py
"""

import os
import sys
import subprocess
import time
import signal
import psutil
from datetime import datetime
import pymysql

# Configuration
PRODUCTION_APP = "app_production.py"
PID_FILE = "app_production.pid"
LOG_FILE = "logs/startup.log"

class ProductionManager:
    """Gestionnaire de production pour l'application"""
    
    def __init__(self):
        self.app_process = None
        self.pid = None
        
    def log(self, message):
        """Écrire dans le fichier de log"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}\n"
        
        # Créer le dossier logs si nécessaire
        os.makedirs('logs', exist_ok=True)
        
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(log_message)
        print(log_message.strip())
    
    def check_dependencies(self):
        """Vérifier les dépendances"""
        self.log("🔍 Vérification des dépendances...")
        
        required_modules = ['flask', 'flask_sqlalchemy', 'flask_babel', 'pymysql']
        missing_modules = []
        
        for module in required_modules:
            try:
                __import__(module)
                self.log(f"✅ {module}: OK")
            except ImportError:
                missing_modules.append(module)
                self.log(f"❌ {module}: MANQUANT")
        
        if missing_modules:
            self.log(f"⚠️  Modules manquants: {missing_modules}")
            return False
        
        return True
    
    def check_database(self):
        """Vérifier la connexion à la base de données"""
        self.log("🔍 Vérification de la base de données...")
        
        try:
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
            
            self.log(f"✅ Base de données connectée")
            self.log(f"📊 {clients_count} clients, {incidents_count} incidents")
            return True
            
        except Exception as e:
            self.log(f"❌ Erreur de base de données: {e}")
            return False
    
    def check_port(self, port=5001):
        """Vérifier si le port est disponible"""
        self.log(f"🔍 Vérification du port {port}...")
        
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                self.log(f"⚠️  Port {port} déjà utilisé par PID {conn.pid}")
                return False
        
        self.log(f"✅ Port {port} disponible")
        return True
    
    def stop_existing(self):
        """Arrêter les instances existantes"""
        self.log("🛑 Arrêt des instances existantes...")
        
        # Vérifier le fichier PID
        if os.path.exists(PID_FILE):
            try:
                with open(PID_FILE, 'r') as f:
                    old_pid = int(f.read().strip())
                
                if psutil.pid_exists(old_pid):
                    process = psutil.Process(old_pid)
                    process.terminate()
                    process.wait(timeout=10)
                    self.log(f"✅ Instance PID {old_pid} arrêtée")
                
                os.remove(PID_FILE)
                
            except Exception as e:
                self.log(f"⚠️  Erreur lors de l'arrêt: {e}")
        
        # Arrêter tous les processus Python Flask sur le port 5001
        try:
            subprocess.run(['taskkill', '/f', '/im', 'python.exe'], 
                         capture_output=True, text=True)
            self.log("✅ Processus Python arrêtés")
            time.sleep(2)
        except:
            pass
    
    def create_directories(self):
        """Créer les dossiers nécessaires"""
        self.log("📁 Création des dossiers...")
        
        directories = ['logs', 'instance', 'static', 'templates']
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            self.log(f"✅ Dossier {directory}")
    
    def start_application(self):
        """Démarrer l'application en production"""
        self.log("🚀 Démarrage de l'application en production...")
        
        try:
            # Démarrer l'application
            self.app_process = subprocess.Popen(
                [sys.executable, PRODUCTION_APP],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.pid = self.app_process.pid
            
            # Sauvegarder le PID
            with open(PID_FILE, 'w') as f:
                f.write(str(self.pid))
            
            self.log(f"✅ Application démarrée (PID: {self.pid})")
            
            # Attendre que l'application soit prête
            time.sleep(3)
            
            if self.app_process.poll() is None:
                self.log("✅ Application en cours d'exécution")
                return True
            else:
                stdout, stderr = self.app_process.communicate()
                self.log(f"❌ Erreur au démarrage: {stderr}")
                return False
                
        except Exception as e:
            self.log(f"❌ Erreur lors du démarrage: {e}")
            return False
    
    def test_application(self):
        """Tester que l'application répond"""
        self.log("🧪 Test de l'application...")
        
        import requests
        max_retries = 5
        
        for attempt in range(max_retries):
            try:
                response = requests.get('http://localhost:5001/health', timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"✅ Application réactive: {data['status']}")
                    self.log(f"📊 Clients: {data['clients']}, Incidents: {data['incidents']}")
                    return True
                else:
                    self.log(f"⚠️  Réponse HTTP {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                self.log(f"⏳ Tentative {attempt + 1}/{max_retries} - En attente...")
                time.sleep(2)
            except Exception as e:
                self.log(f"❌ Erreur de test: {e}")
        
        return False
    
    def show_info(self):
        """Afficher les informations de l'application"""
        self.log("📋 INFORMATIONS DE L'APPLICATION")
        self.log("=" * 50)
        self.log(f"🌐 URL: http://localhost:5001")
        self.log(f"📊 Health Check: http://localhost:5001/health")
        self.log(f"📈 Métriques: http://localhost:5001/metrics")
        self.log(f"🗂️  Logs: {LOG_FILE}")
        self.log(f"🆔 PID: {self.pid}")
        self.log("=" * 50)
    
    def setup_signal_handlers(self):
        """Configuration des gestionnaires de signaux"""
        def signal_handler(signum, frame):
            self.log(f"🛑 Signal {signum} reçu - Arrêt gracieux...")
            self.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def stop(self):
        """Arrêter l'application"""
        if self.app_process:
            self.log("🛑 Arrêt de l'application...")
            self.app_process.terminate()
            try:
                self.app_process.wait(timeout=10)
                self.log("✅ Application arrêtée")
            except subprocess.TimeoutExpired:
                self.app_process.kill()
                self.log("⚠️  Application forcée à s'arrêter")
        
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    
    def run(self):
        """Lancer l'application en production"""
        self.log("🎯 DÉMARRAGE EN MODE PRODUCTION")
        self.log("=" * 50)
        
        # Vérifications préalables
        if not self.check_dependencies():
            self.log("❌ Dépendances manquantes - Arrêt")
            return False
        
        if not self.check_database():
            self.log("❌ Base de données inaccessible - Arrêt")
            return False
        
        # Préparation
        self.stop_existing()
        self.create_directories()
        
        if not self.check_port():
            self.log("❌ Port occupé - Arrêt")
            return False
        
        # Démarrage
        if not self.start_application():
            self.log("❌ Échec du démarrage")
            return False
        
        # Test
        if not self.test_application():
            self.log("❌ Application non responsive")
            self.stop()
            return False
        
        # Configuration des signaux
        self.setup_signal_handlers()
        
        # Informations
        self.show_info()
        
        self.log("🎉 APPLICATION EN PRODUCTION DÉMARRÉE AVEC SUCCÈS!")
        
        return True

def main():
    """Fonction principale"""
    manager = ProductionManager()
    
    try:
        if manager.run():
            # Garder l'application en vie
            while True:
                time.sleep(60)
                # Vérification périodique
                if manager.app_process and manager.app_process.poll() is not None:
                    manager.log("⚠️  Application arrêtée de manière inattendue")
                    break
        else:
            print("❌ Échec du démarrage en production")
            sys.exit(1)
            
    except KeyboardInterrupt:
        manager.log("🛑 Interruption utilisateur")
    except Exception as e:
        manager.log(f"❌ Erreur fatale: {e}")
    finally:
        manager.stop()

if __name__ == "__main__":
    main() 