# 🏗️ Architecture Technique - FCC_001

## 📐 Architecture Générale

### Pattern Architectural
L'application suit une **architecture MVC (Model-View-Controller)** classique avec Flask :

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TEMPLATES     │    │    FLASK APP    │    │    MODELS       │
│   (Views)       │◄───│  (Controller)   │◄───│   (Data)        │
│                 │    │                 │    │                 │
│ • HTML/Jinja2   │    │ • Routes        │    │ • SQLAlchemy    │
│ • CSS/Bootstrap │    │ • Business Logic│    │ • Database      │
│ • JavaScript    │    │ • Session Mgmt  │    │ • Migrations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
    User Interface          Application Layer         Data Layer
```

## 📁 Structure des Répertoires

```
FCC_001/
├── 📄 start_app.py              # 🚀 Script de démarrage principal
├── 📄 README.md                 # 📖 Documentation essentielle
├── 📄 .gitignore               # Configuration Git
│
├── 🎯 core/                     # CORE APPLICATION
│   ├── app.py                   # Application Flask principale
│   ├── config.py                # Configuration multi-environnement
│   ├── wsgi.py                  # Point d'entrée WSGI pour production
│   └── run_app.py              # Script de démarrage avec vérifications
│
├── 🗄️ data/                    # DATA LAYER
│   ├── migrations/             # Migrations Alembic
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/          # Scripts de migration
│   └── instance/              # Base de données SQLite locale
│
├── 🎨 presentation/            # PRESENTATION LAYER
│   ├── templates/             # Templates Jinja2
│   │   ├── base.html         # Template de base
│   │   ├── dashboard.html    # Tableau de bord
│   │   ├── clients.html      # Gestion clients
│   │   ├── incidents.html    # Gestion incidents
│   │   ├── operateurs.html   # Gestion opérateurs
│   │   ├── fiche_client.html # Détail client
│   │   ├── fiche_client_pdf.html # Version PDF
│   │   └── errors/           # Pages d'erreur
│   ├── static/               # Assets statiques
│   │   ├── css/style.css     # Styles personnalisés
│   │   ├── js/               # Scripts JavaScript
│   │   ├── img/              # Images et favicons
│   │   └── uploads/          # Fichiers utilisateur
│
├── 🌐 i18n/                   # INTERNATIONALIZATION
│   ├── babel.cfg             # Configuration Babel
│   ├── messages.pot          # Template de traduction
│   └── translations/         # Traductions par langue
│       ├── fr/LC_MESSAGES/   # Français
│       ├── es/LC_MESSAGES/   # Espagnol
│       └── en/LC_MESSAGES/   # Anglais
│
├── 🔧 automation/            # AUTOMATION & UTILITIES
│   ├── script_automatisation/ # Scripts principaux
│   ├── check_data/           # Vérifications et tests
│   ├── utils/                # Utilitaires divers
│   └── scripts/              # Scripts de déploiement
│
├── 📊 monitoring/            # MONITORING & BACKUP
│   ├── logs/                 # Fichiers de logs
│   ├── backups/              # Sauvegardes automatiques
│   └── SAV_DATA/             # Données de sauvegarde
│
├── 📚 docs/                  # DOCUMENTATION
│   ├── README.md             # Documentation générale
│   ├── CHANGELOG.md          # Historique des versions
│   ├── context/              # Documentation technique
│   └── guide/                # Guides utilisateur
│
├── ⚙️ config/                # CONFIGURATION FILES
│   ├── requirements.txt      # Dépendances Python
│   ├── env/                  # Fichiers d'environnement
│   └── archive/              # Archives de configuration
│
├── 🛠️ tools/                 # DEVELOPMENT TOOLS
│   ├── test_*.py             # Scripts de test
│   ├── start_*.py            # Scripts de démarrage alternatifs
│   └── setup_*.py            # Scripts d'installation
│
└── 🐍 .venv/                 # PYTHON VIRTUAL ENVIRONMENT
```

## 🔩 Composants Techniques

### 1. Application Flask (`app.py`)

#### Configuration Multi-Environnement
```python
# Configuration dynamique selon FLASK_ENV
config_name = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[config_name])
```

#### Extensions Intégrées
- **SQLAlchemy** : ORM et gestion BDD
- **Flask-Migrate** : Migrations de schéma
- **Flask-Babel** : Internationalisation
- **WeasyPrint** : Génération PDF (optionnel)

#### Gestion des Erreurs
```python
# Basculement automatique SQLite ↔ MariaDB
try:
    # Test connexion MariaDB
    test_mysql_connection()
except Exception:
    # Fallback vers SQLite
    switch_to_sqlite()
```

### 2. Modèles de Données (SQLAlchemy)

#### Entités Principales
```python
class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    telephone = db.Column(db.String(20))
    adresse = db.Column(db.String(200))
    ville = db.Column(db.String(100))
    ip_router = db.Column(db.String(15))     # Format IPv4
    ip_antea = db.Column(db.String(15))      # Format IPv4
    incidents = db.relationship('Incident', backref='client', lazy=True)

class Operateur(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    telephone = db.Column(db.String(20))
    incidents = db.relationship('Incident', backref='operateur', lazy=True)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_client = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    intitule = db.Column(db.String(200), nullable=False)
    observations = db.Column(db.Text)
    status = db.Column(db.String(20), default='Pendiente')  # Pendiente, Solucionadas, Bitrix
    id_operateur = db.Column(db.Integer, db.ForeignKey('operateur.id'))
    date_heure = db.Column(db.DateTime, default=datetime.utcnow)
```

### 3. Configuration (`config.py`)

#### Classes de Configuration
```python
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key'
    LANGUAGES = ['fr', 'es', 'en']
    BABEL_DEFAULT_LOCALE = 'fr'

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = 'sqlite:///gestion_client.db'
    DEBUG = True

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

## 🔄 Flux de Traitement

### 1. Requête HTTP
```
Client Browser → Flask Route → Business Logic → Database → Response
```

### 2. Gestion des Sessions
```python
# Langue sélectionnée stockée en session
@babel.localeselector
def get_locale():
    if 'language' in session:
        return session['language']
    return request.accept_languages.best_match(app.config['LANGUAGES']) or 'fr'
```

### 3. Pagination et Filtrage
```python
# Pagination avec conservation des paramètres
clients = Client.query.filter(
    Client.nom.contains(search_query)
).paginate(
    page=page, per_page=per_page, error_out=False
)
```

## 🛡️ Sécurité et Robustesse

### Validation des Données
- Validation des adresses IP avec regex
- Échappement automatique des templates Jinja2
- Validation des formulaires côté serveur

### Gestion des Erreurs
- Pages d'erreur personnalisées (404, 500)
- Logs structurés avec rotation
- Fallback automatique entre bases de données

### Performance
- Lazy loading des relations SQLAlchemy
- Pagination pour limiter les résultats
- Cache des traductions Babel

## 🔌 Intégrations

### Base de Données
- **SQLite** : Développement et déploiement simple
- **MariaDB/MySQL** : Production avec performance
- **Migration automatique** entre les deux

### Génération PDF
- **WeasyPrint** : Génération PDF côté serveur
- **Fallback navigateur** : Impression via Ctrl+P si WeasyPrint indisponible

### Internationalisation
- **Flask-Babel** : Gestion des traductions
- **GNU gettext** : Format standard des traductions
- **Extraction automatique** des chaînes à traduire

## 📊 Monitoring et Logs

### Structure des Logs
```python
# Configuration logging avec rotation
handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
```

### Métriques Suivies
- Connexions à la base de données
- Erreurs d'application
- Performances des requêtes
- Utilisation des fonctionnalités

---

## 🔧 Points d'Extension

### Ajout de Modules
1. Créer les modèles dans `app.py`
2. Ajouter les routes
3. Créer les templates correspondants
4. Ajouter les traductions

### Intégration API
- Structure prête pour ajouter des endpoints REST
- Sérialisation JSON possible avec SQLAlchemy
- Authentification extensible

---

*Cette architecture garantit la scalabilité, la maintenabilité et la robustesse de l'application.*