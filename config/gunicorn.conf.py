"""Configuration Gunicorn pour la production"""

import os
import multiprocessing

# Configuration du serveur (priorité aux variables d'environnement)
bind = f"0.0.0.0:{os.environ.get('PORT', '5001')}"
workers = int(os.environ.get('WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"
worker_connections = 1000
timeout = int(os.environ.get('TIMEOUT', '120'))
keepalive = int(os.environ.get('KEEPALIVE', '2'))
max_requests = 1000
max_requests_jitter = 50

# Configuration des processus
preload_app = True
reload = False
daemon = False

# Configuration des logs
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
accesslog = os.environ.get('ACCESS_LOG', 'logs/gunicorn_access.log')
errorlog = os.environ.get('ERROR_LOG', 'logs/gunicorn_error.log')
loglevel = (os.environ.get('LOG_LEVEL', 'info')).lower()
capture_output = True
enable_stdio_inheritance = True

# Configuration de sécurité
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Hooks
def on_starting(server):
    """Hook appelé avant le démarrage du serveur"""
    server.log.info("Démarrage du serveur Gunicorn")

def when_ready(server):
    """Appelé quand le serveur est prêt à recevoir des connexions"""
    server.log.info("Serveur Gunicorn prêt sur %s", server.address)

def on_reload(server):
    """Hook appelé lors du rechargement"""
    server.log.info("Rechargement du serveur Gunicorn")

def worker_int(worker):
    """Hook appelé lors de l'interruption d'un worker"""
    worker.log.info("Worker interrompu (PID: %s)", worker.pid)

def on_exit(server):
    """Hook appelé à l'arrêt du serveur"""
    server.log.info("Arrêt du serveur Gunicorn")
