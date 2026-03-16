# ⚙️ Configuration et Environnement - FCC_001

## 🎯 Vue d'Ensemble de la Configuration

L'application FCC_001 utilise une **configuration multi-environnement** flexible avec fallback automatique et gestion intelligente des dépendances.

```
┌─────────────────────────────────────────────────────────────┐
│                   ENVIRONNEMENTS                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│  DEVELOPMENT    │   PRODUCTION    │        TEST             │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • SQLite local  │ • MariaDB/MySQL │ • SQLite mémoire        │
│ • Debug ON      │ • Debug OFF     │ • Données factices      │
│ • Hot reload    │ • Logs fichier  │ • Tests unitaires       │
│ • WeasyPrint    │ • Performance   │ • Isolation complète    │
│   optionnel     │   optimisée     │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 📁 Fichiers de Configuration

### 🎯 Configuration Principale (`core/config.py`)

```python
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
    
    # Internationalisation
    LANGUAGES = ['fr', 'es', 'en']
    BABEL_DEFAULT_LOCALE = 'fr'
    BABEL_DEFAULT_TIMEZONE = 'UTC'
    
    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False  # True en production HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Application
    APP_NAME = 'FCC_001 - Atención al Cliente'
    APP_VERSION = '1.0.0'
    
    # Pagination
    ITEMS_PER_PAGE_DEFAULT = 10
    ITEMS_PER_PAGE_MAX = 100

class DevelopmentConfig(Config):
    """Configuration pour environnement de développement"""
    
    DEBUG = True
    TESTING = False
    
    # Base de données locale
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'gestion_client.db')
    
    # Logs détaillés
    LOG_LEVEL = 'DEBUG'
    SQLALCHEMY_ECHO = True  # Log toutes les requêtes SQL
    
    # WeasyPrint (optionnel en dev)
    WEASYPRINT_AVAILABLE = os.environ.get('WEASYPRINT_AVAILABLE', 'True').lower() == 'true'

class ProductionConfig(Config):
    """Configuration pour environnement de production"""
    
    DEBUG = False
    TESTING = False
    
    # Base de données production avec fallback
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f"mysql+pymysql://{os.environ.get('DB_USER', 'root')}:" \
        f"{os.environ.get('DB_PASSWORD', 'toor')}@" \
        f"{os.environ.get('DB_HOST', 'localhost')}:" \
        f"{os.environ.get('DB_PORT', '3306')}/" \
        f"{os.environ.get('DB_NAME', 'fcc_001_db')}"
    
    # Sécurité renforcée
    SESSION_COOKIE_SECURE = True  # HTTPS uniquement
    WTF_CSRF_TIME_LIMIT = 3600
    
    # Performance
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 20
    }
    
    # Logs
    LOG_LEVEL = 'INFO'
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

# Dictionnaire de configuration
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestConfig,
    'default': DevelopmentConfig
}
```

## 🌍 Variables d'Environnement

### 📁 Emplacement : `config/env/`

Les fichiers d'environnement sont maintenant organisés dans le dossier `config/env/` :

### 📋 Fichier `.env` (Développement)

```bash
# === CONFIGURATION GÉNÉRALE ===
FLASK_ENV=development
FLASK_APP=app.py
SECRET_KEY=your-super-secret-key-here

# === BASE DE DONNÉES ===
# Pour SQLite (par défaut)
DEV_DATABASE_URL=sqlite:///gestion_client.db

# Pour MySQL/MariaDB (optionnel)
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/fcc_001_db
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fcc_001_db
DB_USER=root
DB_PASSWORD=toor

# === APPLICATION ===
APP_NAME=FCC_001 - Atención al Cliente
APP_VERSION=1.0.0

# === FONCTIONNALITÉS OPTIONNELLES ===
WEASYPRINT_AVAILABLE=True
LOG_LEVEL=DEBUG

# === PAGINATION ===
ITEMS_PER_PAGE_DEFAULT=10
ITEMS_PER_PAGE_MAX=100

# === INTERNATIONALISATION ===
BABEL_DEFAULT_LOCALE=fr
SUPPORTED_LANGUAGES=fr,es,en
```

### 🚀 Fichier `env.example` (Template)

```bash
# === EXEMPLE DE CONFIGURATION ===
# Copiez ce fichier vers .env et modifiez les valeurs

# Configuration Flask
FLASK_ENV=development
SECRET_KEY=changez-cette-clé-secrète

# Base de données (choisir une option)
# Option 1: SQLite (simple, par défaut)
DEV_DATABASE_URL=sqlite:///gestion_client.db

# Option 2: MySQL/MariaDB (production)
DATABASE_URL=mysql+pymysql://utilisateur:motdepasse@localhost:3306/nom_base
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fcc_001_db
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe

# Fonctionnalités
WEASYPRINT_AVAILABLE=True
LOG_LEVEL=INFO

# Application
APP_NAME=Mon Application Client
BABEL_DEFAULT_LOCALE=fr
```

## 🔧 Configuration Avancée

### 🗄️ Configuration Base de Données

#### Stratégie Multi-DB avec Fallback
```python
def configure_database(app):
    """Configuration intelligente de la base de données"""
    
    # 1. Tentative MySQL/MariaDB
    if app.config.get('FLASK_ENV') == 'production':
        try:
            mysql_uri = construct_mysql_uri()
            test_mysql_connection(mysql_uri)
            app.config['SQLALCHEMY_DATABASE_URI'] = mysql_uri
            app.logger.info("✅ Connexion MySQL/MariaDB établie")
            return 'mysql'
        except Exception as e:
            app.logger.warning(f"⚠️ MySQL indisponible: {e}")
    
    # 2. Fallback SQLite
    sqlite_uri = 'sqlite:///gestion_client.db'
    app.config['SQLALCHEMY_DATABASE_URI'] = sqlite_uri
    app.logger.info("✅ Utilisation SQLite")
    return 'sqlite'

def construct_mysql_uri():
    """Construction URI MySQL à partir variables environnement"""
    return (
        f"mysql+pymysql://"
        f"{os.environ.get('DB_USER', 'root')}:"
        f"{os.environ.get('DB_PASSWORD', 'toor')}@"
        f"{os.environ.get('DB_HOST', 'localhost')}:"
        f"{os.environ.get('DB_PORT', '3306')}/"
        f"{os.environ.get('DB_NAME', 'fcc_001_db')}"
    )

def test_mysql_connection(uri):
    """Test de connexion MySQL"""
    from sqlalchemy import create_engine, text
    engine = create_engine(uri)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    engine.dispose()
```

### 🌐 Configuration Babel (i18n)

#### `babel.cfg`
```ini
[python: **.py]
[jinja2: **/templates/**.html]
extensions=jinja2.ext.autoescape,jinja2.ext.with_
```

#### Sélecteur de Langue
```python
@babel.localeselector
def get_locale():
    """Détermination automatique de la langue"""
    
    # 1. Priorité: Langue en session (sélection utilisateur)
    if 'language' in session:
        return session['language']
    
    # 2. Langue du navigateur
    return request.accept_languages.best_match(
        app.config['LANGUAGES']
    ) or app.config['BABEL_DEFAULT_LOCALE']

# Route pour changer de langue
@app.route('/set_language/<language>')
def set_language(language):
    if language in app.config['LANGUAGES']:
        session['language'] = language
        session.permanent = True
    return redirect(request.referrer or url_for('dashboard'))
```

### 📊 Configuration Logging

#### Logging Structuré
```python
def configure_logging(app):
    """Configuration complète du système de logs"""
    
    if not app.debug and not app.testing:
        # Création dossier logs
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        # Handler fichier avec rotation
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            'logs/app.log',
            maxBytes=app.config.get('LOG_MAX_BYTES', 10240),
            backupCount=app.config.get('LOG_BACKUP_COUNT', 10)
        )
        
        # Format détaillé
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d] [%(process)d]'
        ))
        
        # Niveau selon configuration
        file_handler.setLevel(getattr(logging, app.config.get('LOG_LEVEL', 'INFO')))
        app.logger.addHandler(file_handler)
        
        # Handler console pour erreurs critiques
        import sys
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.ERROR)
        app.logger.addHandler(console_handler)
        
        app.logger.setLevel(getattr(logging, app.config.get('LOG_LEVEL', 'INFO')))
        app.logger.info('🚀 Application FCC_001 démarrée')
```

## 🚀 Scripts de Démarrage

### 🔧 Script de Développement (`start_app.py`)

```python
#!/usr/bin/env python3
"""Script de démarrage intelligent avec vérifications"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Vérification version Python >= 3.8"""
    if sys.version_info < (3, 8):
        raise Exception("Python 3.8+ requis")
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")

def check_dependencies():
    """Vérification et installation dépendances"""
    requirements_file = 'requirements.txt'
    if Path(requirements_file).exists():
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', '-r', requirements_file
            ])
            print("✅ Dépendances installées")
        except subprocess.CalledProcessError:
            print("⚠️ Problème installation dépendances")

def setup_database():
    """Initialisation base de données"""
    try:
        from flask_migrate import upgrade
        from app import app, db
        
        with app.app_context():
            # Création tables si nécessaire
            db.create_all()
            
            # Application migrations
            try:
                upgrade()
                print("✅ Base de données mise à jour")
            except Exception:
                print("ℹ️ Pas de migrations à appliquer")
                
    except ImportError:
        print("⚠️ Flask-Migrate non disponible")

def run_application():
    """Démarrage application Flask"""
    from app import app
    print("🚀 Démarrage application sur http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)

def main():
    """Point d'entrée principal"""
    try:
        print("🔧 Vérification environnement FCC_001")
        check_python_version()
        check_dependencies()
        setup_database()
        run_application()
    except KeyboardInterrupt:
        print("\n👋 Arrêt de l'application")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### 🚀 Script de Production (`start_production_simple.sh`)

```bash
#!/bin/bash
# Script de démarrage production simplifié

set -e  # Arrêt si erreur

echo "🚀 Démarrage FCC_001 - Production"

# Variables d'environnement
export FLASK_ENV=production
export PYTHONPATH=$PWD

# Vérification Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 non trouvé"
    exit 1
fi

# Environnement virtuel
if [ ! -d ".venv" ]; then
    echo "📦 Création environnement virtuel"
    python3 -m venv .venv
fi

echo "🔧 Activation environnement virtuel"
source .venv/bin/activate

# Installation dépendances
echo "📥 Installation dépendances"
pip install -r requirements_production.txt

# Base de données
echo "🗄️ Initialisation base de données"
python3 -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('✅ Base de données prête')
"

# Démarrage
echo "🚀 Démarrage application"
echo "📍 URL: http://localhost:5001"
python3 app.py
```

## 🔧 Configuration de Déploiement

### 🐳 Docker (Futur)

```dockerfile
# Dockerfile (préparé pour évolution)
FROM python:3.9-slim

WORKDIR /app

# Dépendances système pour WeasyPrint
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements_production.txt .
RUN pip install --no-cache-dir -r requirements_production.txt

# Code application
COPY . .

# Variables d'environnement
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Port d'exposition
EXPOSE 5001

# Démarrage
CMD ["python", "app.py"]
```

### 🔧 Gunicorn (Production WSGI)

```python
# gunicorn.conf.py
bind = "0.0.0.0:5001"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2

# Logs
accesslog = "logs/gunicorn_access.log"
errorlog = "logs/gunicorn_error.log"
loglevel = "info"

# Process
daemon = False
pidfile = "gunicorn.pid"
user = "www-data"
group = "www-data"

# Performance
preload_app = True
worker_tmp_dir = "/dev/shm"

# Hooks
def when_ready(server):
    server.log.info("🚀 Serveur Gunicorn prêt")

def worker_int(worker):
    worker.log.info("🔄 Worker interrompu")
```

### 🌐 Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/fcc_001
server {
    listen 80;
    server_name votre-domaine.com;
    
    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    # SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Sécurité
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Logs
    access_log /var/log/nginx/fcc_001_access.log;
    error_log /var/log/nginx/fcc_001_error.log;
    
    # Fichiers statiques
    location /static {
        alias /path/to/fcc_001/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy vers Flask/Gunicorn
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🔒 Sécurité Configuration

### 🛡️ Variables Sensibles

```python
# Chargement sécurisé des secrets
def load_secret(key, default=None):
    """Chargement sécurisé avec priorités"""
    
    # 1. Variable d'environnement
    value = os.environ.get(key)
    if value:
        return value
    
    # 2. Fichier .env
    try:
        from dotenv import load_dotenv
        load_dotenv()
        value = os.environ.get(key)
        if value:
            return value
    except ImportError:
        pass
    
    # 3. Valeur par défaut (development seulement)
    if default and os.environ.get('FLASK_ENV') == 'development':
        return default
    
    # 4. Erreur si pas trouvé en production
    if os.environ.get('FLASK_ENV') == 'production':
        raise ValueError(f"Variable {key} requise en production")
    
    return default

# Usage
SECRET_KEY = load_secret('SECRET_KEY', 'dev-key-not-secure')
DB_PASSWORD = load_secret('DB_PASSWORD')
```

### 🔐 Headers de Sécurité

```python
@app.after_request
def security_headers(response):
    """Ajout headers de sécurité"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response
```

---

## ✅ Checklist de Configuration

### 🔧 Développement
- [ ] Python 3.8+ installé
- [ ] Variables d'environnement `.env` configurées
- [ ] Dépendances `requirements.txt` installées
- [ ] Base de données SQLite créée
- [ ] Migrations appliquées
- [ ] WeasyPrint testé (optionnel)

### 🚀 Production
- [ ] Secrets sécurisés (jamais en plaintext)
- [ ] Base de données externe configurée
- [ ] HTTPS activé
- [ ] Logs configurés avec rotation
- [ ] Monitoring en place
- [ ] Sauvegardes automatiques
- [ ] Reverse proxy (Nginx)
- [ ] WSGI server (Gunicorn)

---

*Cette configuration garantit un déploiement sécurisé et performant dans tous les environnements.*