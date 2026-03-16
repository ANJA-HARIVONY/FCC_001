# 🗄️ Modèles de Données - FCC_001

## 📊 Schéma de Base de Données

### Diagramme Entité-Relation

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     CLIENT      │       │    INCIDENT     │       │   OPERATEUR     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ 🔑 id (PK)      │◄──────│ 🔗 id_client(FK)│──────►│ 🔑 id (PK)      │
│ nom             │   1:N │ 🔗 id_operateur │   N:1 │ nom             │
│ telephone       │       │ intitule        │       │ telephone       │
│ adresse         │       │ observations    │       └─────────────────┘
│ ville           │       │ status          │
│ ip_router       │       │ date_heure      │
│ ip_antea        │       │ 🔑 id (PK)      │
└─────────────────┘       └─────────────────┘
```

## 🔧 Définitions des Modèles

### 1. Modèle CLIENT

#### Structure
```python
class Client(db.Model):
    __tablename__ = 'client'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Informations personnelles
    nom = db.Column(db.String(100), nullable=False, index=True)
    telephone = db.Column(db.String(20))
    
    # Informations géographiques
    adresse = db.Column(db.String(200))
    ville = db.Column(db.String(100), index=True)
    
    # Configuration réseau
    ip_router = db.Column(db.String(15))    # Format IPv4 xxx.xxx.xxx.xxx
    ip_antea = db.Column(db.String(15))     # Format IPv4 xxx.xxx.xxx.xxx
    
    # Relations
    incidents = db.relationship('Incident', backref='client', lazy=True, cascade='all, delete-orphan')
```

#### Contraintes et Validations
- **nom** : Obligatoire, indexé pour recherche rapide
- **ip_router/ip_antea** : Format IPv4 validé côté application
- **ville** : Indexé pour filtrage par localisation
- **Cascade delete** : Suppression des incidents liés lors de suppression client

#### Données Exemple
```json
{
    "id": 1,
    "nom": "Juan Martinez",
    "telephone": "+34 612 345 678",
    "adresse": "Calle Mayor 123, 2º A",
    "ville": "Centro",
    "ip_router": "192.168.1.1",
    "ip_antea": "192.168.1.2"
}
```

### 2. Modèle OPERATEUR

#### Structure
```python
class Operateur(db.Model):
    __tablename__ = 'operateur'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Informations personnelles
    nom = db.Column(db.String(100), nullable=False, index=True)
    telephone = db.Column(db.String(20))
    
    # Relations
    incidents = db.relationship('Incident', backref='operateur', lazy=True)
```

#### Contraintes et Validations
- **nom** : Obligatoire, indexé pour recherche rapide
- **telephone** : Optionnel, pour contact d'urgence
- **Pas de cascade delete** : Conservation historique des incidents

#### Données Exemple
```json
{
    "id": 1,
    "nom": "Carlos Rodriguez",
    "telephone": "+34 654 321 987"
}
```

### 3. Modèle INCIDENT

#### Structure
```python
class Incident(db.Model):
    __tablename__ = 'incident'
    
    # Clé primaire
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Relations (clés étrangères)
    id_client = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False, index=True)
    id_operateur = db.Column(db.Integer, db.ForeignKey('operateur.id'), index=True)
    
    # Détails de l'incident
    intitule = db.Column(db.String(200), nullable=False)
    observations = db.Column(db.Text)
    
    # Workflow et statut
    status = db.Column(db.String(20), default='Pendiente', index=True)
    
    # Horodatage
    date_heure = db.Column(db.DateTime, default=datetime.utcnow, index=True)
```

#### Statuts Possibles
```python
STATUTS_INCIDENTS = [
    'Pendiente',    # Incident en attente de traitement
    'Solucionadas', # Incident résolu
    'Bitrix'        # Incident transféré vers Bitrix
]
```

#### Contraintes et Validations
- **id_client** : Obligatoire, indexé pour performance
- **id_operateur** : Optionnel (peut être assigné plus tard)
- **status** : Valeurs contrôlées, indexé pour filtrage
- **date_heure** : Indexé pour tri chronologique

#### Données Exemple
```json
{
    "id": 1,
    "id_client": 1,
    "id_operateur": 1,
    "intitule": "Problème de connexion internet",
    "observations": "Client signale une coupure depuis ce matin. Vérifier configuration router.",
    "status": "Pendiente",
    "date_heure": "2025-07-30T14:30:00"
}
```

## 🔍 Index et Performance

### Index Automatiques (Clés Primaires)
- `client.id`
- `operateur.id` 
- `incident.id`

### Index Explicites (Performance)
```sql
-- Recherche clients
CREATE INDEX ix_client_nom ON client(nom);
CREATE INDEX ix_client_ville ON client(ville);

-- Recherche opérateurs  
CREATE INDEX ix_operateur_nom ON operateur(nom);

-- Filtrage incidents
CREATE INDEX ix_incident_id_client ON incident(id_client);
CREATE INDEX ix_incident_id_operateur ON incident(id_operateur);
CREATE INDEX ix_incident_status ON incident(status);
CREATE INDEX ix_incident_date_heure ON incident(date_heure);
```

### Requêtes Optimisées
```python
# Dashboard : Statistiques du mois
incidents_mois = Incident.query.filter(
    func.extract('month', Incident.date_heure) == datetime.now().month,
    func.extract('year', Incident.date_heure) == datetime.now().year
).all()

# Recherche clients avec pagination
clients = Client.query.filter(
    or_(
        Client.nom.contains(search_query),
        Client.telephone.contains(search_query),
        Client.adresse.contains(search_query),
        Client.ip_router.contains(search_query),
        Client.ip_antea.contains(search_query)
    )
).paginate(page=page, per_page=per_page)

# Incidents par client avec détails opérateur
incidents = Incident.query.join(Operateur).filter(
    Incident.id_client == client_id
).order_by(Incident.date_heure.desc()).all()
```

## 🔄 Migrations et Évolution

### Historique des Migrations

#### Migration Initiale (58af6f64a5ce)
```python
# Création des tables de base
def upgrade():
    op.create_table('client', ...)
    op.create_table('operateur', ...)
    op.create_table('incident', ...)
```

#### Ajout Champs IP (2adc92440c6c)
```python
# Ajout des champs ip_router et ip_antea
def upgrade():
    op.add_column('client', sa.Column('ip_router', sa.String(15)))
    op.add_column('client', sa.Column('ip_antea', sa.String(15)))
```

### Stratégie de Migration
```bash
# Génération automatique
flask db migrate -m "Description du changement"

# Application
flask db upgrade

# Rollback si nécessaire  
flask db downgrade
```

## 📈 Statistiques et Métriques

### Données de Volumétrie Typique
```
- Clients : 100-500 enregistrements
- Opérateurs : 5-20 enregistrements  
- Incidents : 1000-5000 enregistrements/an
```

### Croissance Prévue
- **Clients** : +50 par an
- **Incidents** : +100 par mois
- **Retention** : 5 ans d'historique

### Optimisations Futures
```sql
-- Partitioning par année sur incidents
CREATE TABLE incident_2025 PARTITION OF incident 
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Archive des anciens incidents
CREATE TABLE incident_archive AS 
SELECT * FROM incident WHERE date_heure < '2023-01-01';
```

## 🔐 Sécurité et Intégrité

### Contraintes Référentielles
- **Foreign Key Cascade** : Suppression client → suppression incidents
- **Restrict** : Suppression opérateur bloquée si incidents actifs

### Validation des Données
```python
# Validation IP côté application
import re
IP_PATTERN = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')

def validate_ip(ip_address):
    if not ip_address:
        return True  # Optionnel
    return bool(IP_PATTERN.match(ip_address))
```

### Audit Trail
```python
# Ajout futur possible d'audit
class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(50))
    record_id = db.Column(db.Integer)
    action = db.Column(db.String(10))  # INSERT, UPDATE, DELETE
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    user_id = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
```

---

## 🚀 Évolutions Prévues

### Court Terme
- Ajout champ `priorite` sur incidents
- Table `type_incident` pour catégorisation
- Champs `date_resolution` pour SLA

### Moyen Terme  
- Historique des modifications
- Système de notifications
- API REST complète

### Long Terme
- Multi-tenant (plusieurs entreprises)
- Synchronisation mobile
- Analytics avancées

---

*Cette structure de données assure l'évolutivité et les performances pour une croissance sur plusieurs années.*