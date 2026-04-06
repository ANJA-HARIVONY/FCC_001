#!/usr/bin/env python3
"""
Point d'entrée WSGI pour la production.
Utilisé par Gunicorn et autres serveurs WSGI.
"""

import os
import logging
from logging.handlers import RotatingFileHandler
from app import app

# Configuration de l'environnement
config_name = os.environ.get('FLASK_ENV', 'production')

# Configuration des logs pour la production
if config_name == 'production':
    # Créer le dossier de logs s'il n'existe pas
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Configuration du logging rotatif
    file_handler = RotatingFileHandler(
        'logs/app.log', 
        maxBytes=10240000,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Application de gestion d\'incidents démarrée')

# Point d'entrée pour WSGI
application = app

if __name__ == "__main__":
    # Mode de développement uniquement
    application.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False) 