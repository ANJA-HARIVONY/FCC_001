# 📋 Vue d'Ensemble du Projet FCC_001

## 🎯 Description Générale

**FCC_001** est une application web de gestion de la relation client développée avec Flask. Elle permet aux entreprises de services techniques de gérer efficacement leurs clients, opérateurs et incidents.

## 🏢 Contexte Métier

### Objectif Principal
Centraliser la gestion des incidents techniques pour une entreprise de services avec :
- Suivi des clients et leurs équipements (Router/Antena)
- Gestion des opérateurs techniques
- Traçabilité complète des incidents

### Utilisateurs Cibles
- **Responsables techniques** : Supervision globale
- **Opérateurs de terrain** : Saisie et résolution d'incidents
- **Service client** : Consultation et impression de rapports

## 🎨 Identité Visuelle

### Palette de Couleurs
- **Rouge principal** : #dc3545 (branding)
- **Blanc** : #ffffff (fond principal)
- **Noir/Gris foncé** : #212529 (textes et navigation)
- **Gris clair** : #f8f9fa (zones secondaires)

### Style d'Interface
- Design moderne et responsive
- Bootstrap 5 pour la cohérence
- Icons Font Awesome pour les pictogrammes
- Layout card-based pour l'organisation

## 🌐 Support Multilingue

### Langues Supportées
- 🇫🇷 **Français** 
- 🇪🇸 **Español**(langue par défaut) 
- 🇬🇧 **English**

### Implémentation
- Flask-Babel pour l'internationalisation
- Fichiers de traduction dans `/translations/`
- Sélecteur de langue dans la navigation

## 📊 Modules Principaux

### 1. Dashboard
- Statistiques du mois en cours
- Graphiques d'évolution des incidents
- Répartition par opérateur
- Liste des derniers incidents

### 2. Gestion des Clients
- CRUD complet des clients
- Informations techniques (IP Router/Antea)
- Fiche client détaillée avec historique
- Impression PDF des rapports

### 3. Gestion des Opérateurs
- CRUD des opérateurs techniques
- Attribution aux incidents

### 4. Gestion des Incidents
- Création et suivi d'incidents
- Statuts : Pendiente, Solucionadas, Bitrix
- Observations et horodatage
- Recherche avancée

## 🗄️ Données Principales

### Entités Métier
- **Clients** : Informations contact + configuration réseau
- **Opérateurs** : Techniciens responsables
- **Incidents** : Problèmes techniques avec traçabilité

### Relations
- Client → Incidents (1:N)
- Opérateur → Incidents (1:N)
- Incident → Client + Opérateur (N:1 chacun)

## 🚀 Déploiement

### Environnements
- **Développement** : SQLite local
- **Production** : MariaDB/MySQL
- **Test** : SQLite avec données de démo

### Modes de Démarrage
- **Rapide** : `start_production_simple.sh`
- **Complet** : Configuration manuelle avec environnement virtuel
- **Debug** : Mode développement avec reload automatique

## 📈 Points Forts

### Fonctionnalités Avancées
- ✅ Pagination intelligente avec conservation des filtres
- ✅ Recherche multi-critères
- ✅ Tri dynamique sur toutes les colonnes
- ✅ Génération PDF intégrée
- ✅ Sauvegarde automatique des données
- ✅ Migration automatique SQLite ↔ MariaDB

### Performance
- Optimisation des requêtes avec SQLAlchemy
- Pagination pour gérer de gros volumes
- Cache des sessions multilingues
- Fallback automatique entre bases de données

## 🛠️ Maintenance

### Scripts d'Automatisation
- Nettoyage des données
- Migration entre environnements
- Génération de données de test
- Vérification de l'état du système

### Monitoring
- Logs structurés
- Sauvegarde automatique
- Vérification de l'état des bases de données

---

## 📚 Documentation Associée

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Architecture technique détaillée
- [`MODELES_DONNEES.md`](./MODELES_DONNEES.md) - Structure des données
- [`FONCTIONNALITES.md`](./FONCTIONNALITES.md) - Spécifications fonctionnelles
- [`TECHNOLOGIES.md`](./TECHNOLOGIES.md) - Stack technique
- [`CONFIGURATION.md`](./CONFIGURATION.md) - Configuration et déploiement
- [`WORKFLOWS.md`](./WORKFLOWS.md) - Processus métier
- [`API_ROUTES.md`](./API_ROUTES.md) - Endpoints et API

---

*Dernière mise à jour : Juillet 2025*