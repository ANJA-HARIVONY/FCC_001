# 🚀 Guide de Développement FCC_001

## 📋 Architecture v2.0 - Ajouter des Nouvelles Fonctionnalités

### 🏗️ Philosophie de Développement

Avec la nouvelle architecture modulaire, l'ajout de fonctionnalités suit le principe **MVC + Modules** :

```
NOUVELLE FONCTIONNALITÉ
├── 🎯 Model      → data/models/
├── 🎨 View       → presentation/templates/
├── 🔧 Controller → core/routes/
├── 🌐 i18n       → i18n/translations/
└── 📊 Tests      → tools/tests/
```

## 🔄 Processus Recommandé (5 Étapes)

### **1. 📋 PLANIFICATION**

#### a) Définir la fonctionnalité
```bash
# Créer un fichier de spécification
echo "# Nouvelle fonctionnalité: [NOM]" > docs/specs/FEATURE_[NOM].md
```

#### b) Identifier les composants impactés
- 🗄️ **Base de données** : Nouveau modèle ? Migration ?
- 🎨 **Interface** : Nouvelles pages ? Modifications ?
- 🔧 **Logique** : Nouvelles routes ? API ?
- 🌐 **i18n** : Textes à traduire ?

### **2. 🗄️ MODÈLE DE DONNÉES**

#### a) Créer le modèle dans `core/app.py`
```python
# Exemple: Nouveau modèle "Contrat"
class Contrat(db.Model):
    __tablename__ = 'contrats'
    
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), unique=True, nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    date_debut = db.Column(db.Date, nullable=False)
    date_fin = db.Column(db.Date)
    status = db.Column(db.String(20), default='actif')
    
    # Relations
    client = db.relationship('Client', backref='contrats')
    
    def __repr__(self):
        return f'<Contrat {self.numero}>'
```

#### b) Créer la migration
```bash
# Activer l'environnement et créer la migration
.venv\Scripts\activate
cd core
python -c "from app import app, db; app.app_context().push(); from flask_migrate import init, migrate; migrate(message='Ajout modèle Contrat')"
```

### **3. 🎨 INTERFACE UTILISATEUR**

#### a) Créer les templates dans `presentation/templates/`
```html
<!-- presentation/templates/contrats.html -->
{% extends "base.html" %}
{% block title %}{{ _('Gestion des Contrats') }}{% endblock %}

{% block content %}
<div class="container-fluid">
    <h1>{{ _('Gestion des Contrats') }}</h1>
    <!-- Interface ici -->
</div>
{% endblock %}
```

#### b) Ajouter les styles si nécessaire dans `presentation/static/css/`

### **4. 🔧 LOGIQUE MÉTIER**

#### a) Ajouter les routes dans `core/app.py`
```python
@app.route('/contrats')
def contrats():
    """Page de gestion des contrats"""
    contrats = Contrat.query.order_by(Contrat.date_debut.desc()).all()
    return render_template('contrats.html', contrats=contrats)

@app.route('/contrats/nouveau', methods=['GET', 'POST'])
def nouveau_contrat():
    """Créer un nouveau contrat"""
    if request.method == 'POST':
        # Logique de création
        pass
    return render_template('nouveau_contrat.html')
```

#### b) Ajouter dans la navigation (`presentation/templates/base.html`)
```html
<li class="nav-item">
    <a class="nav-link" href="{{ url_for('contrats') }}">
        <i class="fas fa-file-contract"></i> {{ _('Contrats') }}
    </a>
</li>
```

### **5. 🌐 INTERNATIONALISATION**

#### a) Extraire les nouveaux textes
```bash
cd i18n
pybabel extract -F babel.cfg -k _l -o messages.pot ../
pybabel update -i messages.pot -d translations
```

#### b) Traduire dans `i18n/translations/[lang]/LC_MESSAGES/messages.po`

## 🎯 Exemples Pratiques

### **Exemple 1: Ajouter "Gestion des Équipements"**

```bash
# 1. Modèle (dans core/app.py)
class Equipement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'))

# 2. Route (dans core/app.py)
@app.route('/equipements')
def equipements():
    equipements = Equipement.query.all()
    return render_template('equipements.html', equipements=equipements)

# 3. Template (presentation/templates/equipements.html)
{% extends "base.html" %}
{% block title %}Équipements{% endblock %}

# 4. Navigation (dans base.html)
<a href="{{ url_for('equipements') }}">Équipements</a>
```

### **Exemple 2: Ajouter une API REST**

```python
# Dans core/app.py
@app.route('/api/clients', methods=['GET'])
def api_clients():
    """API REST pour les clients"""
    clients = Client.query.all()
    return jsonify([{
        'id': c.id,
        'nom': c.nom,
        'email': c.email
    } for c in clients])

@app.route('/api/clients', methods=['POST'])
def api_create_client():
    """Créer un client via API"""
    data = request.get_json()
    # Validation et création
    return jsonify({'status': 'success'})
```

## 📁 Organisation des Fichiers

### **Pour une grande fonctionnalité, créer un module :**

```
automation/modules/nouveau_module/
├── __init__.py
├── models.py          # Modèles spécifiques
├── routes.py          # Routes spécifiques  
├── utils.py           # Utilitaires
└── tests.py           # Tests unitaires
```

## 🧪 Tests et Qualité

### **1. Tests dans `tools/`**
```python
# tools/test_nouvelle_fonctionnalite.py
import unittest
from core.app import app, db

class TestNouvelleFeature(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        
    def test_nouvelle_route(self):
        response = self.app.get('/nouvelle-route')
        self.assertEqual(response.status_code, 200)
```

### **2. Validation avant commit**
```bash
# Tester l'application
python start_app.py

# Vérifier les traductions
cd i18n && pybabel compile -d translations

# Tester les nouvelles fonctionnalités
python tools/test_nouvelle_fonctionnalite.py
```

## ✅ Checklist de Développement

### **Avant de commencer :**
- [ ] Spécification écrite dans `docs/specs/`
- [ ] Architecture définie
- [ ] Impact évalué

### **Pendant le développement :**
- [ ] Modèle créé et migration générée
- [ ] Routes implémentées avec gestion d'erreurs
- [ ] Templates créés avec héritage de `base.html`
- [ ] Navigation mise à jour
- [ ] Textes extraits pour traduction

### **Avant de finaliser :**
- [ ] Tests unitaires écrits et passants
- [ ] Interface testée manuellement
- [ ] Traductions complétées
- [ ] Documentation mise à jour
- [ ] Performance vérifiée

## 🚀 Déploiement

### **Version de développement :**
```bash
python start_app.py
```

### **Version de production :**
```bash
python tools/start_production.py
```

## 📚 Ressources Utiles

- **Architecture :** `docs/context/ARCHITECTURE.md`
- **Configuration :** `docs/context/CONFIGURATION.md`
- **API Routes :** `docs/context/API_ROUTES.md`
- **Modèles :** `docs/context/MODELES_DONNEES.md`

## 💡 Bonnes Pratiques

1. **🎯 Une fonctionnalité = Une branche Git**
2. **📝 Commits atomiques et descriptifs**
3. **🧪 Tests avant intégration**
4. **🌐 i18n dès le développement**
5. **📖 Documentation synchronisée**
6. **⚡ Performance considérée**

**Avec cette méthodologie, vos nouvelles fonctionnalités s'intégreront parfaitement dans l'architecture v2.0 ! 🎉**