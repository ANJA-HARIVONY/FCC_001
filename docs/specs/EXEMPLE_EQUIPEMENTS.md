# 🔧 Gestion des Équipements

> **Exemple concret d'une nouvelle fonctionnalité pour FCC_001**

## 📊 Métadonnées

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion des Équipements |
| **Version cible** | v2.1 |
| **Priorité** | Moyenne |
| **Estimation** | 2-3 jours |
| **Status** | 📋 Exemple / Template |

## 🎯 Objectif

### Description
Ajouter une fonctionnalité de gestion des équipements techniques (routers, antenas, etc.) pour chaque client, permettant un suivi détaillé du matériel installé.

### Problème résolu
Actuellement, les informations d'équipement sont stockées comme texte dans le modèle Client. Une gestion séparée permettra :
- Historique des équipements par client
- Maintenance et suivi technique
- Statistiques sur le parc matériel

### Valeur ajoutée
- Meilleure traçabilité du matériel
- Planification maintenance préventive
- Rapports sur le parc d'équipements

## 👥 Utilisateurs Concernés

- [x] **Opérateur technique** : Gestion complète des équipements
- [x] **Service client** : Consultation des équipements clients
- [ ] **Administrateur** : Rapports et statistiques
- [ ] **Client final** : Pas d'accès direct

## 📋 Spécifications Fonctionnelles

### Fonctionnalités Principales

1. **Liste des équipements**
   - Description : Vue d'ensemble de tous les équipements
   - Comportement : Tableau paginé avec recherche et filtres
   - Contraintes : Accès selon permissions utilisateur

2. **Fiche équipement**
   - Description : Détails complets d'un équipement
   - Comportement : Affichage des informations techniques et historique
   - Contraintes : Lien obligatoire avec un client

3. **Ajout/Modification équipement**
   - Description : Formulaire de gestion des équipements
   - Comportement : Validation des données et sauvegarde
   - Contraintes : Numéro de série unique

### Règles Métier

- **Unicité** : Un numéro de série = un seul équipement
- **Association** : Tout équipement doit être lié à un client
- **Historique** : Conservation de tous les changements de statut
- **Types** : Router, Antena, Switch, Autre (extensible)

## 🎨 Interface Utilisateur

### Pages à créer/modifier

| Page | URL | Template | Description |
|------|-----|----------|-------------|
| Liste équipements | `/equipements` | `equipements.html` | Vue d'ensemble |
| Détail équipement | `/equipements/<id>` | `detail_equipement.html` | Fiche complète |
| Nouvel équipement | `/equipements/nouveau` | `nouveau_equipement.html` | Formulaire création |
| Modifier équipement | `/equipements/<id>/modifier` | `modifier_equipement.html` | Formulaire modification |

### Navigation

- **Menu principal** : Ajouter "Équipements" après "Opérateurs"
- **Breadcrumb** : Accueil > Équipements > [Détail]
- **Liens rapides** : Depuis la fiche client vers ses équipements

### Formulaires

#### Formulaire Équipement
```html
<form method="POST" class="needs-validation" novalidate>
    <div class="row">
        <div class="col-md-6">
            <label class="form-label">{{ _('Type d\'équipement') }}</label>
            <select name="type" class="form-select" required>
                <option value="">{{ _('Sélectionner...') }}</option>
                <option value="router">{{ _('Router') }}</option>
                <option value="antena">{{ _('Antena') }}</option>
                <option value="switch">{{ _('Switch') }}</option>
                <option value="autre">{{ _('Autre') }}</option>
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">{{ _('Numéro de série') }}</label>
            <input name="numero_serie" type="text" class="form-control" required>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-6">
            <label class="form-label">{{ _('Client') }}</label>
            <select name="client_id" class="form-select" required>
                {% for client in clients %}
                <option value="{{ client.id }}">{{ client.nom }}</option>
                {% endfor %}
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">{{ _('Statut') }}</label>
            <select name="statut" class="form-select">
                <option value="actif">{{ _('Actif') }}</option>
                <option value="maintenance">{{ _('En maintenance') }}</option>
                <option value="defaillant">{{ _('Défaillant') }}</option>
                <option value="retire">{{ _('Retiré') }}</option>
            </select>
        </div>
    </div>
    
    <div class="row">
        <div class="col-12">
            <label class="form-label">{{ _('Notes techniques') }}</label>
            <textarea name="notes" class="form-control" rows="3"></textarea>
        </div>
    </div>
    
    <button type="submit" class="btn btn-primary">{{ _('Enregistrer') }}</button>
</form>
```

## 🗄️ Modèle de Données

### Nouveau Modèle : Equipement

```python
class Equipement(db.Model):
    __tablename__ = 'equipements'
    
    # Champs principaux
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # router, antena, switch, autre
    numero_serie = db.Column(db.String(100), unique=True, nullable=False)
    modele = db.Column(db.String(100))
    marque = db.Column(db.String(50))
    
    # Statut et localisation
    statut = db.Column(db.String(20), default='actif')  # actif, maintenance, defaillant, retire
    adresse_installation = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # Dates importantes
    date_installation = db.Column(db.Date)
    date_derniere_maintenance = db.Column(db.Date)
    date_garantie_fin = db.Column(db.Date)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    client = db.relationship('Client', backref='equipements')
    
    def __repr__(self):
        return f'<Equipement {self.type} - {self.numero_serie}>'
    
    @property
    def age_en_jours(self):
        """Calcule l'âge de l'équipement en jours"""
        if self.date_installation:
            return (datetime.now().date() - self.date_installation).days
        return None
    
    @property
    def sous_garantie(self):
        """Vérifie si l'équipement est encore sous garantie"""
        if self.date_garantie_fin:
            return datetime.now().date() <= self.date_garantie_fin
        return False
```

### Migration

```sql
-- Script de migration : add_equipements_table
CREATE TABLE equipements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL,
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    modele VARCHAR(100),
    marque VARCHAR(50),
    statut VARCHAR(20) DEFAULT 'actif',
    adresse_installation TEXT,
    notes TEXT,
    date_installation DATE,
    date_derniere_maintenance DATE,
    date_garantie_fin DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE UNIQUE INDEX idx_equipement_numero_serie ON equipements(numero_serie);
CREATE INDEX idx_equipement_client ON equipements(client_id);
CREATE INDEX idx_equipement_type ON equipements(type);
CREATE INDEX idx_equipement_statut ON equipements(statut);
```

## 🔧 Impact Technique

### Routes à ajouter

```python
@app.route('/equipements')
def equipements():
    """Liste de tous les équipements"""
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    type_filter = request.args.get('type', '')
    
    query = Equipement.query
    
    if search:
        query = query.filter(Equipement.numero_serie.contains(search))
    if type_filter:
        query = query.filter(Equipement.type == type_filter)
    
    equipements = query.order_by(Equipement.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    return render_template('equipements.html', 
                         equipements=equipements,
                         search=search,
                         type_filter=type_filter)

@app.route('/equipements/<int:id>')
def detail_equipement(id):
    """Détail d'un équipement"""
    equipement = Equipement.query.get_or_404(id)
    # Récupérer les incidents liés à cet équipement
    incidents = Incident.query.filter_by(client_id=equipement.client_id).limit(5).all()
    return render_template('detail_equipement.html', 
                         equipement=equipement,
                         incidents=incidents)

@app.route('/equipements/nouveau', methods=['GET', 'POST'])
def nouveau_equipement():
    """Créer un nouvel équipement"""
    if request.method == 'POST':
        try:
            equipement = Equipement(
                type=request.form['type'],
                numero_serie=request.form['numero_serie'],
                modele=request.form.get('modele', ''),
                marque=request.form.get('marque', ''),
                statut=request.form.get('statut', 'actif'),
                client_id=request.form['client_id'],
                notes=request.form.get('notes', '')
            )
            
            db.session.add(equipement)
            db.session.commit()
            
            flash(_('Équipement créé avec succès'), 'success')
            return redirect(url_for('detail_equipement', id=equipement.id))
            
        except Exception as e:
            db.session.rollback()
            flash(_('Erreur lors de la création : ') + str(e), 'error')
    
    clients = Client.query.order_by(Client.nom).all()
    return render_template('nouveau_equipement.html', clients=clients)

@app.route('/equipements/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_equipement(id):
    """Modifier un équipement existant"""
    equipement = Equipement.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            equipement.type = request.form['type']
            equipement.numero_serie = request.form['numero_serie']
            equipement.modele = request.form.get('modele', '')
            equipement.marque = request.form.get('marque', '')
            equipement.statut = request.form.get('statut', 'actif')
            equipement.client_id = request.form['client_id']
            equipement.notes = request.form.get('notes', '')
            equipement.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            flash(_('Équipement modifié avec succès'), 'success')
            return redirect(url_for('detail_equipement', id=equipement.id))
            
        except Exception as e:
            db.session.rollback()
            flash(_('Erreur lors de la modification : ') + str(e), 'error')
    
    clients = Client.query.order_by(Client.nom).all()
    return render_template('modifier_equipement.html', 
                         equipement=equipement, 
                         clients=clients)
```

### Navigation à modifier

Dans `presentation/templates/base.html` :

```html
<!-- Ajouter après "Opérateurs" -->
<li class="nav-item">
    <a class="nav-link" href="{{ url_for('equipements') }}">
        <i class="fas fa-tools"></i> {{ _('Équipements') }}
    </a>
</li>
```

## 🌐 Internationalisation

### Textes à traduire

| Clé | Français | Espagnol | Anglais |
|-----|----------|----------|---------|
| `equipements` | Équipements | Equipos | Equipment |
| `type_equipement` | Type d'équipement | Tipo de equipo | Equipment type |
| `numero_serie` | Numéro de série | Número de serie | Serial number |
| `router` | Router | Router | Router |
| `antena` | Antena | Antena | Antenna |
| `switch` | Switch | Switch | Switch |
| `actif` | Actif | Activo | Active |
| `maintenance` | En maintenance | En mantenimiento | Under maintenance |
| `defaillant` | Défaillant | Defectuoso | Faulty |
| `retire` | Retiré | Retirado | Retired |
| `sous_garantie` | Sous garantie | En garantía | Under warranty |
| `age_equipement` | Âge : {0} jours | Edad: {0} días | Age: {0} days |

## ✅ Critères d'Acceptation

### Fonctionnels
- [x] L'utilisateur peut voir la liste de tous les équipements
- [x] L'utilisateur peut créer un nouvel équipement
- [x] L'utilisateur peut modifier un équipement existant
- [x] L'utilisateur peut voir le détail d'un équipement
- [x] Le numéro de série doit être unique
- [x] Un équipement doit être lié à un client
- [x] L'interface est disponible en FR/ES/EN

### Techniques  
- [x] Migration DB s'exécute sans erreur
- [x] Relations avec le modèle Client fonctionnent
- [x] Validation des données côté serveur
- [x] Gestion d'erreurs complète (try/catch)
- [x] Performance : <2s pour afficher la liste

### Interface
- [x] Design cohérent avec l'existant
- [x] Formulaires avec validation Bootstrap
- [x] Navigation mise à jour
- [x] Messages flash pour le feedback utilisateur
- [x] Pagination pour de grandes listes

## 🧪 Plan de Tests

### Tests Unitaires
```python
# tools/test_equipements.py
class TestEquipements(unittest.TestCase):
    
    def setUp(self):
        self.app = app.test_client()
        app.config['TESTING'] = True
        
    def test_creation_equipement(self):
        """Test création d'un équipement"""
        with app.app_context():
            # Créer un client de test
            client = Client(nom="Test Client", email="test@test.com")
            db.session.add(client)
            db.session.commit()
            
            # Créer un équipement
            equipement = Equipement(
                type="router",
                numero_serie="TEST123",
                client_id=client.id
            )
            db.session.add(equipement)
            db.session.commit()
            
            self.assertEqual(equipement.numero_serie, "TEST123")
            self.assertEqual(equipement.client.nom, "Test Client")
        
    def test_unicite_numero_serie(self):
        """Test unicité du numéro de série"""
        # Implémenter test de contrainte d'unicité
        pass
        
    def test_liste_equipements_route(self):
        """Test de la route liste des équipements"""
        response = self.app.get('/equipements')
        self.assertEqual(response.status_code, 200)
```

### Tests d'Intégration
- [x] Test du workflow création → consultation → modification
- [x] Test des relations Client ↔ Équipements
- [x] Test de la pagination avec de nombreux équipements
- [x] Test des filtres de recherche

### Tests Manuels
- [x] Navigation intuitive depuis différents points d'entrée
- [x] Validation des formulaires en temps réel
- [x] Gestion des erreurs utilisateur (champs manquants, etc.)
- [x] Performance avec 100+ équipements

## 📈 Métriques de Succès

- **Performance** : <2s pour afficher 100 équipements
- **Utilisation** : 80% des clients ont au moins un équipement renseigné
- **Qualité** : 0 erreur de contrainte d'unicité en production

---

> **📅 Spécification créée le** : Juillet 2025  
> **👤 Créé par** : Équipe FCC_001  
> **📝 Statut** : Template d'exemple