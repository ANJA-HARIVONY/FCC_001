# Application de Gestion Client

Une application web Flask moderne pour la gestion de la relation client avec un design élégant en rouge, blanc et noir. **Maintenant avec support multilingue et impression PDF !**

## 🌟 Fonctionnalités

- **Dashboard interactif** avec statistiques et graphiques
- **Gestion des clients** (CRUD complet)
- **Gestion des opérateurs**
- **Gestion des incidents** avec statuts (En attente, Résolut, Bitrix)
- **🌐 Support multilingue** : Français, Espagnol, Anglais
- **📄 Impression PDF** : Fiches clients détaillées avec historique des incidents
- **Fonction de recherche** avancée
- **Interface responsive** avec Bootstrap 5
- **Support SQLite et MariaDB**

## 🚀 Installation

### Prérequis

- Python 3.8+
- pip

### Étapes d'installation

1. **Cloner le projet**

```bash
git clone <url-du-repo>
cd FCC_001
```

2. **Créer un environnement virtuel**

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou
.venv\Scripts\activate     # Windows
```

3. **Installer les dépendances**

```bash
pip install -r requirements.txt
```

4. **Lancer l'application**

**Méthode simple (recommandée) :**

```bash
python3 start_app.py
```

**Méthode alternative :**

```bash
python3 test_app.py
```

**Pour macOS (si problèmes avec WeasyPrint) :**

Consultez le guide détaillé : [INSTALL_MACOS.md](INSTALL_MACOS.md)

**Méthode manuelle :**

```bash
source .venv/bin/activate
python3 app.py
```

L'application sera accessible sur `http://localhost:5001`

## 🌐 Support Multilingue

L'application supporte maintenant 3 langues :

- **🇫🇷 Français** (langue par défaut)
- **🇪🇸 Español**
- **🇬🇧 English**

### Changer de langue

1. Utiliser le sélecteur de langue dans la barre de navigation
2. La langue choisie est sauvegardée en session
3. Toute l'interface s'adapte automatiquement

### Gestion des traductions

Les traductions sont gérées avec Flask-Babel :

```bash
# Extraire les nouvelles chaînes à traduire
pybabel extract -F babel.cfg -k _ -o messages.pot .

# Mettre à jour les traductions existantes
pybabel update -i messages.pot -d translations

# Compiler les traductions
pybabel compile -d translations
```

## 📄 Impression PDF

### Fiches clients détaillées

Chaque client dispose maintenant d'une fiche détaillée imprimable en PDF contenant :

- **Informations du client** : nom, contact, adresse, IPs
- **Statistiques des incidents** : total, résolus, en attente, Bitrix
- **Historique complet** : tous les incidents avec dates, statuts, opérateurs et observations

### Accès aux fiches

1. **Depuis la liste des clients** : bouton "Voir la fiche" (icône 📄)
2. **URL directe** : `/clients/{id}/fiche`
3. **Impression PDF** : bouton "Imprimer PDF" dans la fiche

### Fonctionnalités PDF

- **Format A4** optimisé pour l'impression
- **Design professionnel** avec en-tête et pied de page
- **Tableaux structurés** pour l'historique des incidents
- **Badges colorés** pour les statuts
- **Date de génération** automatique
- **Support multilingue** : le PDF s'adapte à la langue sélectionnée

## Configuration de la base de données

### SQLite (par défaut)

L'application utilise SQLite par défaut. La base de données sera créée automatiquement au premier lancement.

### Migration vers MariaDB

1. **Installer MariaDB**
2. **Créer une base de données**

```sql
CREATE DATABASE gestion_client;
CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON gestion_client.* TO 'username'@'localhost';
```

3. **Configurer la variable d'environnement**

```bash
export DATABASE_URL="mysql+pymysql://username:password@localhost/gestion_client"
```

4. **Relancer l'application**

## Structure du projet

```
FCC_001/
├── app.py                 # Application principale Flask
├── run_app.py            # Script de démarrage avec vérifications
├── config.py             # Configuration des bases de données
├── babel.cfg             # Configuration Babel pour les traductions
├── requirements.txt      # Dépendances Python
├── README.md            # Documentation
├── templates/           # Templates HTML
│   ├── base.html        # Template de base avec sélecteur de langue
│   ├── dashboard.html
│   ├── clients.html
│   ├── fiche_client.html     # Nouvelle fiche client détaillée
│   ├── fiche_client_pdf.html # Template PDF optimisé
│   ├── operateurs.html
│   ├── incidents.html
│   └── ...
├── translations/        # Fichiers de traduction
│   ├── fr/LC_MESSAGES/
│   ├── es/LC_MESSAGES/
│   └── en/LC_MESSAGES/
└── static/             # Fichiers statiques
    └── css/
        └── style.css   # Styles personnalisés
```

## Utilisation

### Dashboard

- Vue d'ensemble des statistiques du mois
- Graphiques interactifs (Chart.js) avec 3 modes d'affichage :
  - **Par jour** : Évolution quotidienne des incidents
  - **Par heure** : Répartition horaire des incidents
  - **Détaillé** : Chaque incident avec sa date/heure exacte
- Liste des derniers incidents

### Gestion des Clients

- Ajouter/modifier/supprimer des clients
- **Nouvelle fonctionnalité** : Fiche client détaillée avec historique complet
- **Impression PDF** : Génération de rapports professionnels
- Informations : nom, contact, adresse, ville, IP router, IP Antea
- Validation des adresses IP

### Gestion des Opérateurs

- Gestion des opérateurs responsables des incidents
- Informations : nom, téléphone

### Gestion des Incidents

- Création et suivi des incidents
- Statuts disponibles :
  - **En attente** : Incident non traité
  - **Résolut** : Incident résolu
  - **Bitrix** : Incident transféré vers Bitrix
- Association client/opérateur
- Observations détaillées

### Recherche

- Recherche globale dans clients et incidents
- Résultats filtrés et organisés

## Design

L'application utilise un thème moderne avec :

- **Couleurs principales** : Rouge (#dc3545), Blanc (#ffffff), Noir (#000000)
- **Framework CSS** : Bootstrap 5
- **Icônes** : Font Awesome 6
- **Graphiques** : Chart.js
- **Interface responsive** pour mobile et desktop
- **Sélecteur de langue** intégré dans la navigation

## API

L'application expose une API REST pour les graphiques :

- `GET /api/incidents-par-date` : Données pour le graphique d'évolution
  - `?type=date` : Groupement par jour (défaut)
  - `?type=hour` : Groupement par heure
  - `?type=datetime` : Affichage détaillé avec date/heure exacte

## Nouvelles routes

- `GET /clients/{id}/fiche` : Affichage de la fiche client détaillée
- `GET /clients/{id}/imprimer` : Génération et téléchargement du PDF
- `GET /set_language/{language}` : Changement de langue

## Sécurité

- Protection CSRF avec Flask-WTF
- Validation des données côté serveur
- Échappement automatique des templates Jinja2
- Génération PDF sécurisée avec WeasyPrint

## Développement

Pour contribuer au projet :

1. Fork le repository
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Créer une Pull Request

### Ajouter de nouvelles traductions

1. Marquer les chaînes avec `{{ _('Texte à traduire') }}` dans les templates
2. Utiliser `gettext('Texte à traduire')` dans le code Python
3. Extraire et mettre à jour les traductions
4. Compiler les fichiers .mo

## Support

Pour toute question ou problème :

1. Consulter la page d'aide dans l'application
2. Vérifier les logs de l'application
3. S'assurer que tous les champs obligatoires sont remplis

## Dépendances principales

- **Flask** : Framework web
- **Flask-SQLAlchemy** : ORM pour base de données
- **Flask-Babel** : Support multilingue
- **WeasyPrint** : Génération de PDF
- **Bootstrap 5** : Framework CSS
- **Chart.js** : Graphiques interactifs

## Licence

Ce projet est sous licence MIT.
