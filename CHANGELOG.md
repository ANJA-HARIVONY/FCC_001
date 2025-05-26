# Changelog - Application de Gestion Client

## Version 1.1.0 - Amélioration des graphiques (25/05/2025)

### ✨ Nouvelles fonctionnalités

#### Graphique d'évolution des incidents avec 3 modes d'affichage :

1. **Par jour** (défaut)

   - Affichage quotidien des incidents
   - Format : `DD/MM`
   - Idéal pour voir les tendances sur le mois

2. **Par heure**

   - Regroupement des incidents par heure
   - Format : `DD/MM HH:MM`
   - Permet d'identifier les heures de pointe

3. **Détaillé**
   - Chaque incident avec sa date/heure exacte
   - Format : `DD/MM HH:MM`
   - Vue la plus précise pour l'analyse

#### Interface utilisateur améliorée :

- Boutons de sélection élégants avec animations
- Transitions fluides entre les modes d'affichage
- Graphiques interactifs avec tooltips améliorés
- Styles cohérents avec le thème rouge/blanc/noir

### 🔧 Améliorations techniques

#### API REST étendue :

- `GET /api/incidents-par-date?type=date` : Groupement par jour
- `GET /api/incidents-par-date?type=hour` : Groupement par heure
- `GET /api/incidents-par-date?type=datetime` : Affichage détaillé

#### Compatibilité base de données :

- Support SQLite avec fonctions `strftime()`
- Préparation pour migration MariaDB
- Gestion optimisée des requêtes temporelles

#### JavaScript amélioré :

- Gestion dynamique des graphiques Chart.js
- Destruction/recréation propre des instances
- Gestion d'erreurs robuste

### 🎨 Design

- Boutons de sélection avec effets hover
- Animation de mise à l'échelle pour le bouton actif
- Couleurs cohérentes avec la charte graphique
- Interface responsive maintenue

### 📊 Données de test

- Script utilitaire `utils/add_test_incidents.py`
- Génération d'incidents avec heures variées
- Simulation réaliste des heures de bureau (8h-18h)

### 🐛 Corrections

- Résolution du problème de sérialisation JSON des objets Row SQLAlchemy
- Amélioration de la gestion des erreurs d'affichage
- Optimisation des requêtes de base de données

---

## Version 1.0.0 - Version initiale

### Fonctionnalités de base

- Dashboard avec statistiques mensuelles
- CRUD complet pour clients, opérateurs, incidents
- Interface responsive Bootstrap 5
- Thème rouge/blanc/noir
- Support SQLite avec migration MariaDB prête
