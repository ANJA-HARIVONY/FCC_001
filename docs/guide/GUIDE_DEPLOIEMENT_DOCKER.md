# 🐳 Guide de Déploiement Docker - FCC_001

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Structure des fichiers Docker](#structure-des-fichiers-docker)
3. [Configuration](#configuration)
4. [Déploiement rapide](#déploiement-rapide)
5. [Déploiement avec Nginx](#déploiement-avec-nginx)
6. [Commandes utiles](#commandes-utiles)
7. [Maintenance](#maintenance)
8. [Dépannage](#dépannage)

---

## 🔧 Prérequis

### Logiciels requis

- **Docker** >= 20.10
- **Docker Compose** >= 2.0

### Vérification de l'installation

```bash
# Vérifier Docker
docker --version

# Vérifier Docker Compose
docker compose version
```

### Installation Docker (si nécessaire)

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Windows:**
Télécharger et installer [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 📁 Structure des fichiers Docker

```
FCC_001/
├── Dockerfile                    # Image de l'application
├── docker-compose.yml           # Orchestration des services
├── docker-entrypoint.sh         # Script d'initialisation
├── .dockerignore                # Fichiers à exclure du build
├── config/
│   └── env/
│       └── docker.env.example   # Variables d'environnement
└── docker/
    └── nginx/
        ├── nginx.conf           # Configuration Nginx
        └── conf.d/
            └── default.conf     # Configuration par défaut
```

---

## ⚙️ Configuration

### 1. Créer le fichier d'environnement

```bash
# Copier le fichier exemple
cp config/env/docker.env.example .env

# Éditer les variables
nano .env  # ou votre éditeur préféré
```

### 2. Variables importantes à modifier

```env
# OBLIGATOIRE - Clé secrète unique pour Flask
SECRET_KEY=votre-cle-securisee-unique-32-caracteres

# OBLIGATOIRE - Mots de passe de base de données
DB_PASSWORD=mot-de-passe-securise
DB_ROOT_PASSWORD=mot-de-passe-root-securise

# OPTIONNEL - Port de l'application
APP_PORT=5001

# OPTIONNEL - Nombre de workers Gunicorn
WORKERS=4
```

### 3. Générer une clé secrète sécurisée

```bash
# Python
python -c "import secrets; print(secrets.token_hex(32))"

# OpenSSL
openssl rand -hex 32
```

---

## 🚀 Déploiement rapide

### Démarrage simple (sans Nginx)

```bash
# 1. Se placer dans le répertoire du projet
cd /chemin/vers/FCC_001

# 2. Créer le fichier .env
cp config/env/docker.env.example .env
# Éditer .env avec vos valeurs

# 3. Construire et démarrer les conteneurs
docker compose up -d --build

# 4. Vérifier les logs
docker compose logs -f

# 5. Accéder à l'application
# http://localhost:5001
```

### Première exécution

Lors du premier démarrage :
1. MariaDB est initialisé avec la base de données `fcc_001_db`
2. Les tables sont créées automatiquement
3. Des données d'exemple sont ajoutées si la base est vide

---

## 🌐 Déploiement avec Nginx

### Démarrage avec le reverse proxy Nginx

```bash
# Démarrer avec le profil nginx
docker compose --profile with-nginx up -d --build

# L'application est accessible sur :
# - http://localhost (port 80)
# - https://localhost (port 443, nécessite des certificats SSL)
```

### Configuration SSL (Production)

1. Générer ou obtenir des certificats SSL
2. Placer les fichiers dans `docker/nginx/ssl/`
3. Décommenter la section HTTPS dans `docker/nginx/nginx.conf`
4. Redémarrer Nginx

```bash
# Générer un certificat auto-signé (test uniquement)
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/nginx/ssl/key.pem \
    -out docker/nginx/ssl/cert.pem
```

---

## 📝 Commandes utiles

### Gestion des conteneurs

```bash
# Démarrer les services
docker compose up -d

# Arrêter les services
docker compose down

# Redémarrer les services
docker compose restart

# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f app
docker compose logs -f mariadb
```

### Construction et mise à jour

```bash
# Reconstruire l'image de l'application
docker compose build app

# Reconstruire sans cache
docker compose build --no-cache app

# Mettre à jour et redémarrer
docker compose up -d --build
```

### Accès aux conteneurs

```bash
# Shell dans le conteneur de l'application
docker compose exec app bash

# Shell dans MariaDB
docker compose exec mariadb mysql -u fcc_user -p fcc_001_db

# Exécuter une commande Flask
docker compose exec app flask shell
```

### Base de données

```bash
# Sauvegarder la base de données
docker compose exec mariadb mysqldump -u root -p fcc_001_db > backup.sql

# Restaurer une sauvegarde
docker compose exec -T mariadb mysql -u root -p fcc_001_db < backup.sql

# Accéder à MariaDB depuis l'hôte
mysql -h localhost -P 3307 -u fcc_user -p fcc_001_db
```

---

## 🔧 Maintenance

### Mise à jour de l'application

```bash
# 1. Tirer les dernières modifications
git pull origin main

# 2. Reconstruire et redémarrer
docker compose up -d --build

# 3. Vérifier les logs
docker compose logs -f app
```

### Nettoyage Docker

```bash
# Supprimer les conteneurs arrêtés
docker container prune

# Supprimer les images non utilisées
docker image prune

# Supprimer les volumes non utilisés (ATTENTION: perte de données!)
docker volume prune

# Nettoyage complet
docker system prune -a
```

### Sauvegarde des données

```bash
# Script de sauvegarde complet
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

# Sauvegarder MariaDB
docker compose exec -T mariadb mysqldump -u root -p$DB_ROOT_PASSWORD fcc_001_db > $BACKUP_DIR/db_$DATE.sql

# Sauvegarder les volumes
docker run --rm -v fcc_001_app_uploads:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

echo "Sauvegarde terminée: $BACKUP_DIR"
```

---

## 🔍 Dépannage

### Problèmes courants

#### 1. L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs app

# Vérifier l'état des conteneurs
docker compose ps

# Redémarrer le conteneur
docker compose restart app
```

#### 2. Erreur de connexion à la base de données

```bash
# Vérifier que MariaDB est prêt
docker compose logs mariadb

# Tester la connexion
docker compose exec mariadb mysql -u fcc_user -p -e "SHOW DATABASES;"

# Vérifier les variables d'environnement
docker compose exec app env | grep DB_
```

#### 3. Port déjà utilisé

```bash
# Vérifier quel processus utilise le port
netstat -tlnp | grep 5001

# Modifier le port dans .env
APP_PORT=5002
```

#### 4. Problèmes de permissions

```bash
# Corriger les permissions des volumes
docker compose exec app chown -R appuser:appgroup /app/logs /app/uploads

# Ou depuis l'hôte
sudo chown -R 1000:1000 ./logs ./uploads
```

#### 5. WeasyPrint ne fonctionne pas

```bash
# Vérifier que WeasyPrint est disponible
docker compose exec app python -c "import weasyprint; print('OK')"

# Désactiver WeasyPrint si nécessaire
# Dans .env: WEASYPRINT_AVAILABLE=false
```

### Logs et debugging

```bash
# Logs détaillés de l'application
docker compose exec app tail -f /app/logs/app.log

# Logs Gunicorn
docker compose exec app tail -f /app/logs/gunicorn_access.log
docker compose exec app tail -f /app/logs/gunicorn_error.log

# Mode debug (développement uniquement)
# Modifier dans docker-compose.yml:
# FLASK_ENV: development
```

---

## 📊 Monitoring

### Vérifier la santé des services

```bash
# État des conteneurs
docker compose ps

# Utilisation des ressources
docker stats

# Health check de l'application
curl http://localhost:5001/
```

### Alertes et notifications

Pour une surveillance en production, considérez :
- **Prometheus** + **Grafana** pour les métriques
- **ELK Stack** pour les logs centralisés
- **Uptime Kuma** pour le monitoring simple

---

## 🔐 Sécurité en production

### Checklist de sécurité

- [ ] Changer `SECRET_KEY` avec une valeur unique et sécurisée
- [ ] Utiliser des mots de passe forts pour MariaDB
- [ ] Activer HTTPS avec des certificats valides
- [ ] Ne pas exposer le port MariaDB (3307) en production
- [ ] Configurer un firewall
- [ ] Mettre à jour régulièrement les images Docker

### Configuration pare-feu (UFW)

```bash
# Autoriser uniquement les ports nécessaires
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📞 Support

En cas de problème :
1. Consulter les logs : `docker compose logs -f`
2. Vérifier la documentation
3. Contacter l'équipe de support

---

**Version:** 1.0.0  
**Dernière mise à jour:** Décembre 2025

