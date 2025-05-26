# Configuration Gunicorn pour la production
# Système de gestion de clients CONNEXIA

import multiprocessing
import os

# Configuration du serveur
bind = "0.0.0.0:5001"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True
timeout = 30
keepalive = 2

# Configuration des logs
accesslog = "logs/gunicorn_access.log"
errorlog = "logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Configuration des processus
daemon = False
pidfile = "logs/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# Configuration de la sécurité
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Configuration du reload (pour le développement)
reload = False
reload_engine = 'auto'

# Fonction de configuration du worker
def when_ready(server):
    """Appelé quand le serveur est prêt à recevoir des connexions"""
    server.log.info("Serveur Gunicorn prêt sur %s", server.address)

def worker_int(worker):
    """Appelé quand un worker reçoit un signal SIGINT ou SIGQUIT"""
    worker.log.info("Worker reçu SIGINT or SIGQUIT")

def pre_fork(server, worker):
    """Appelé juste avant qu'un worker soit forké"""
    server.log.info("Worker spawné (pid: %s)", worker.pid)

def post_fork(server, worker):
    """Appelé juste après qu'un worker soit forké"""
    server.log.info("Worker spawné (pid: %s)", worker.pid)

def worker_abort(worker):
    """Appelé quand un worker reçoit un signal SIGABRT"""
    worker.log.info("Worker reçu SIGABRT (pid: %s)", worker.pid) 