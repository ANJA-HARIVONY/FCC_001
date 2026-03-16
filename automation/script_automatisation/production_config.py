#!/usr/bin/env python3
"""
Configuration de production pour l'application Flask
"""

import os
from datetime import timedelta

class ProductionConfig:
    """Configuration pour l'environnement de production"""
    
    # Configuration de base
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production-secret-key-change-me-2025'
    DEBUG = False
    TESTING = False
    
    # Configuration de la base de données MariaDB
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://root:toor@localhost/fcc_001_db?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20,
        'echo': False  # Désactiver les logs SQL en production
    }
    
    # Configuration des sessions
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    SESSION_COOKIE_SECURE = False  # True si HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Configuration de sécurité
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600
    
    # Configuration de l'application
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Configuration de logging
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'logs/application.log'
    
    # Configuration de cache
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Configuration des langues
    LANGUAGES = {
        'en': 'English',
        'fr': 'Français',
        'es': 'Español'
    }
    
    # Configuration de performance
    SEND_FILE_MAX_AGE_DEFAULT = timedelta(hours=12)
    
    @staticmethod
    def init_app(app):
        """Initialisation spécifique à la production"""
        import logging
        from logging.handlers import RotatingFileHandler
        
        # Créer le dossier de logs
        os.makedirs('logs', exist_ok=True)
        
        # Configuration du logging
        if not app.debug:
            file_handler = RotatingFileHandler(
                ProductionConfig.LOG_FILE, 
                maxBytes=10240000, 
                backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Application startup - Production mode') 