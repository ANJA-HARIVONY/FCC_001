import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'votre-cle-secrete-ici'
    
    # Configuration de la base de données MariaDB
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://root:toor@localhost/fcc_001_db?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True
    }
    
    # Configuration multilingue
    LANGUAGES = {
        'fr': 'Français',
        'es': 'Español', 
        'en': 'English'
    }
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # Configuration optimisée pour la production
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
