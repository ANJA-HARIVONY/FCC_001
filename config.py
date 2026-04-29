# =============================================================================
# FCC_001 - Configuration multi-environnement
# Utilisé par core/app.py : from config import config
# =============================================================================

import os
from datetime import timedelta


class Config:
    """Configuration de base commune à tous les environnements"""

    # Sécurité
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Base de données
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
    }

    # Internationalisation (dict requis : base.html utilise LANGUAGES.items(), get_locale utilise .keys())
    LANGUAGES = {
        'fr': 'Français',
        'es': 'Español',
        'en': 'English'
    }
    BABEL_DEFAULT_LOCALE = os.environ.get('BABEL_DEFAULT_LOCALE', 'es')
    BABEL_DEFAULT_TIMEZONE = 'UTC'
    # Catalogues gettext : `i18n/translations/<locale>/LC_MESSAGES/messages.mo`
    BABEL_TRANSLATION_DIRECTORIES = os.path.join(
        os.path.abspath(os.path.dirname(__file__)), 'i18n', 'translations'
    )

    # Session
    # 12h max de session, 30 min d'inactivité (warning 2 min avant)
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)
    SESSION_IDLE_TIMEOUT = timedelta(minutes=30)
    SESSION_WARNING_BEFORE = timedelta(minutes=2)
    REMEMBER_COOKIE_DURATION = timedelta(days=7)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    # Cookie "remember me" Flask-Login : memes garanties que le cookie de session.
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'

    # Application
    APP_NAME = os.environ.get('APP_NAME', 'FCC_001 - Atención al Cliente')
    APP_VERSION = os.environ.get('APP_VERSION', '1.0.0')

    # Pagination
    ITEMS_PER_PAGE_DEFAULT = 10
    ITEMS_PER_PAGE_MAX = 100

    # Limite globale de la taille d'une requete (anti-DoS upload).
    # Override possible via MAX_CONTENT_LENGTH (en octets).
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))


class DevelopmentConfig(Config):
    """Configuration pour environnement de développement"""

    DEBUG = True
    TESTING = False

    # Base de données locale SQLite
    _instance_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(_instance_path, 'fcc_001.db')

    # Logs détaillés
    LOG_LEVEL = 'DEBUG'
    SQLALCHEMY_ECHO = True

    # WeasyPrint (optionnel en dev)
    WEASYPRINT_AVAILABLE = os.environ.get('WEASYPRINT_AVAILABLE', 'True').lower() == 'true'


_WEAK_SECRET_KEYS = {
    'dev-secret-key-change-in-production',
    'votre-cle-secrete-ici',
    'changez-moi-en-production-avec-une-cle-secrete-longue',
    'change_me_generate_with_openssl_rand_hex_32',
    'your-super-secret-key-change-this-in-production',
    'production-secret-key-2025',
    'production-secret-key-change-me-2025',
}


class ProductionConfig(Config):
    """Configuration pour environnement de production.

    En production, on **refuse de demarrer** si :
      - SECRET_KEY n'est pas defini, ou
      - SECRET_KEY correspond a un placeholder de developpement, ou
      - SECRET_KEY est trop court (< 32 caracteres).
    Cela evite qu'un deploiement utilise silencieusement la cle de fallback
    et permette la forge de cookies de session.
    """

    DEBUG = False
    TESTING = False

    # Validation stricte de la SECRET_KEY au moment du chargement de la config.
    _raw_secret = os.environ.get('SECRET_KEY', '')
    if not _raw_secret:
        raise RuntimeError(
            "SECRET_KEY est obligatoire en production. "
            "Generer avec: openssl rand -hex 32"
        )
    if _raw_secret.lower() in _WEAK_SECRET_KEYS or _raw_secret.startswith('CHANGE_ME'):
        raise RuntimeError(
            "SECRET_KEY est un placeholder de developpement. "
            "Generer une cle reelle avec: openssl rand -hex 32"
        )
    if len(_raw_secret) < 32:
        raise RuntimeError(
            "SECRET_KEY doit faire au moins 32 caracteres en production. "
            "Generer avec: openssl rand -hex 32"
        )
    SECRET_KEY = _raw_secret

    # Base de données production (MariaDB) - variables d'environnement Docker
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or (
        f"mysql+pymysql://{os.environ.get('DB_USER', 'fcc_user')}:"
        f"{os.environ.get('DB_PASSWORD', 'fcc_password')}@"
        f"{os.environ.get('DB_HOST', 'mariadb')}:"
        f"{os.environ.get('DB_PORT', '3306')}/"
        f"{os.environ.get('DB_NAME', 'fcc_001_db')}?charset=utf8mb4"
    )

    # Sécurité renforcée (pilotable par variable d'environnement)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    REMEMBER_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    WTF_CSRF_TIME_LIMIT = 3600

    # Performance
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }

    # Logs
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = 'logs/app.log'
    LOG_MAX_BYTES = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT = 10


class TestConfig(Config):
    """Configuration pour tests unitaires"""

    TESTING = True
    DEBUG = True

    # Base de données en mémoire
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

    # Désactivation CSRF pour tests
    WTF_CSRF_ENABLED = False

    # Accélération tests
    BCRYPT_LOG_ROUNDS = 4


# Dictionnaire de configuration (requis par app.py)
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestConfig,
    'default': DevelopmentConfig
}
