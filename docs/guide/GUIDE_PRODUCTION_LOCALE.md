# Guide de mise en production locale

## 🚀 Étapes pour déployer le projet localement

### Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)
- Git (optionnel, pour cloner le projet)

### 1. Préparation de l'environnement

```bash
# Se placer dans le répertoire du projet
cd /Users/anjaharivony/Documents/Fianarana\ /Reflex/FCC_001

# Créer un environnement virtuel (si pas déjà fait)
python3 -m venv .venv

# Activer l'environnement virtuel
source .venv/bin/activate  # Sur macOS/Linux
# ou
.venv\Scripts\activate     # Sur Windows

# Vérifier que l'environnement est activé
which python3  # Doit pointer vers .venv/bin/python3
```

### 2. Installation des dépendances

```bash
# Installer toutes les dépendances requises
pip install -r requirements.txt

# Vérifier l'installation
pip list
```

### 3. Configuration de la base de données

```bash
# Initialiser la base de données (si pas déjà fait)
flask db init

# Créer la migration initiale
flask db migrate -m "Migration initiale"

# Appliquer les migrations
flask db upgrade

# Créer des données de test (optionnel)
python3 test_data.py
```

### 4. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
# Variables d'environnement pour la production
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=votre-clé-secrète-très-longue-et-complexe
DATABASE_URL=sqlite:///gestion_client.db
```

### 5. Test de l'application

```bash
# Tester que l'application démarre correctement
python3 app.py

# L'application devrait être accessible sur http://localhost:5001
```

### 6. Configuration pour la production

#### Option A : Utilisation de Gunicorn (recommandé)

```bash
# Installer Gunicorn
pip install gunicorn

# Créer un fichier de configuration Gunicorn
touch gunicorn.conf.py
```

#### Option B : Utilisation du serveur Flask intégré (développement uniquement)

```bash
# Modifier app.py pour la production
# Remplacer app.run(debug=True) par app.run(debug=False, host='0.0.0.0', port=5001)
```

### 7. Scripts de démarrage

Créer des scripts pour faciliter le démarrage :

```bash
# Script de démarrage simple
touch start_production.sh
chmod +x start_production.sh
```

### 8. Sauvegarde et maintenance

```bash
# Créer un script de sauvegarde
touch backup.sh
chmod +x backup.sh

# Créer un script de maintenance
touch maintenance.sh
chmod +x maintenance.sh
```

## 📁 Structure finale du projet

```
FCC_001/
├── app.py                      # Application Flask principale
├── config.py                   # Configuration
├── requirements.txt            # Dépendances Python
├── .env                       # Variables d'environnement
├── .venv/                     # Environnement virtuel
├── templates/                 # Templates HTML
├── static/                    # Fichiers statiques (CSS, JS, images)
├── migrations/                # Migrations de base de données
├── gestion_client.db          # Base de données SQLite
├── test_data.py              # Script de données de test
├── start_production.sh       # Script de démarrage
├── backup.sh                 # Script de sauvegarde
├── maintenance.sh            # Script de maintenance
└── logs/                     # Fichiers de logs (à créer)
```

## 🔧 Configuration avancée

### Logging

```python
# Ajouter dans app.py pour les logs de production
import logging
from logging.handlers import RotatingFileHandler
import os

if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/gestion_client.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Application de gestion client démarrée')
```

### Sécurité

1. **Clé secrète forte** : Générer une clé secrète complexe
2. **HTTPS** : Configurer SSL/TLS si nécessaire
3. **Sauvegarde** : Planifier des sauvegardes régulières
4. **Monitoring** : Surveiller les logs et performances

## 🚦 Commandes de production

### Démarrage

```bash
# Démarrage simple
python3 app.py

# Démarrage avec Gunicorn
gunicorn -c gunicorn.conf.py app:app

# Démarrage en arrière-plan
nohup python3 app.py > logs/app.log 2>&1 &
```

### Arrêt

```bash
# Trouver le processus
ps aux | grep python3

# Arrêter le processus
kill PID_DU_PROCESSUS
```

### Monitoring

```bash
# Voir les logs en temps réel
tail -f logs/gestion_client.log

# Vérifier l'état de l'application
curl http://localhost:5001

# Vérifier l'utilisation des ressources
top | grep python3
```

## 📊 Maintenance

### Sauvegarde quotidienne

```bash
# Sauvegarder la base de données
cp gestion_client.db backups/gestion_client_$(date +%Y%m%d).db

# Nettoyer les anciennes sauvegardes (garder 30 jours)
find backups/ -name "*.db" -mtime +30 -delete
```

### Mise à jour

```bash
# Sauvegarder avant mise à jour
./backup.sh

# Mettre à jour les dépendances
pip install --upgrade -r requirements.txt

# Appliquer les nouvelles migrations
flask db upgrade

# Redémarrer l'application
./start_production.sh
```

## 🔍 Dépannage

### Problèmes courants

1. **Port déjà utilisé** : Changer le port dans app.py
2. **Permissions** : Vérifier les permissions des fichiers
3. **Base de données** : Recréer si corrompue
4. **Dépendances** : Réinstaller requirements.txt

### Logs utiles

- Logs de l'application : `logs/gestion_client.log`
- Logs du système : `journalctl -u votre-service`
- Logs Python : Variables d'environnement PYTHONPATH

## ✅ Checklist de déploiement

- [ ] Environnement virtuel créé et activé
- [ ] Dépendances installées
- [ ] Base de données créée et migrée
- [ ] Variables d'environnement configurées
- [ ] Tests passés avec succès
- [ ] Scripts de démarrage créés
- [ ] Sauvegarde configurée
- [ ] Monitoring en place
- [ ] Documentation à jour
- [ ] Accès utilisateur configuré
