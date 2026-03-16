# Guide de Déploiement Docker - FCC_001

## 📋 Prérequis

- **Docker** 20.10+ et **Docker Compose** v2+
- 2 GB RAM minimum
- 10 GB espace disque libre

```bash
# Vérifier l'installation
docker --version
docker compose version
```

---

## 🚀 Démarrage Rapide

### 1. Configuration initiale

```bash
# Copier le fichier de configuration
cp .env.example .env

# Modifier les valeurs sensibles (obligatoire en production)
nano .env
```

**Variables à modifier impérativement en production :**
- `SECRET_KEY` : générer une clé unique (ex: `openssl rand -hex 32`)
- `DB_ROOT_PASSWORD` : mot de passe root MariaDB
- `DB_PASSWORD` : mot de passe utilisateur application

### 2. Lancer l'application

```bash
# Build et démarrage
docker compose up -d

# L'application est accessible sur http://localhost:8089
```

### 3. Avec Nginx (recommandé pour production)

```bash
docker compose --profile with-nginx up -d

# Application via Nginx : http://localhost:80
# L'application directe reste sur le port 8089
```

---

## 📁 Structure des Fichiers Docker

| Fichier | Rôle |
|---------|------|
| `Dockerfile` | Image multi-étapes (base → builder → production) |
| `docker-compose.yml` | Orchestration MariaDB + App + Nginx (optionnel) |
| `docker-entrypoint.sh` | Initialisation DB, attente MariaDB, démarrage |
| `.dockerignore` | Exclusions du contexte de build |
| `.env.example` | Template de variables d'environnement |
| `docker/nginx/` | Configuration Nginx (reverse proxy) |
| `data/init/` | Scripts SQL exécutés au premier démarrage MariaDB |

---

## ⚙️ Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DB_ROOT_PASSWORD` | rootpassword | Mot de passe root MariaDB |
| `DB_NAME` | fcc_001_db | Nom de la base de données |
| `DB_USER` | fcc_user | Utilisateur application |
| `DB_PASSWORD` | fcc_password | Mot de passe utilisateur |
| `DB_PORT_EXTERNAL` | 3307 | Port MariaDB exposé (accès externe) |
| `SECRET_KEY` | *à changer* | Clé secrète Flask |
| `APP_PORT` | 8089 | Port HTTP de l'application |
| `WORKERS` | 4 | Nombre de workers Gunicorn |
| `TIMEOUT` | 120 | Timeout requêtes (secondes) |
| `LOG_LEVEL` | INFO | Niveau de logs |
| `WEASYPRINT_AVAILABLE` | true | Activer/désactiver la génération PDF |
| `INIT_SAMPLE_DATA` | true | Créer des données exemple si base vide |
| `NGINX_HTTP_PORT` | 80 | Port HTTP Nginx |
| `NGINX_HTTPS_PORT` | 443 | Port HTTPS Nginx |

---

## 📦 Commandes Utiles

### Build et démarrage

```bash
# Build sans cache (après modification du Dockerfile)
docker compose build --no-cache

# Démarrage
docker compose up -d

# Logs en temps réel
docker compose logs -f app
```

### Arrêt et nettoyage

```bash
# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker compose down -v
```

### Maintenance

```bash
# Redémarrer uniquement l'application
docker compose restart app

# Exécuter une commande dans le conteneur
docker compose exec app flask db upgrade

# Accès au shell MariaDB
docker compose exec mariadb mysql -u fcc_user -p fcc_001_db
```

### Healthchecks

```bash
# Vérifier le statut des conteneurs
docker compose ps

# Inspecter les healthchecks
docker inspect --format='{{.State.Health.Status}}' fcc_001_app
```

---

## 🔧 Volumes et persistance

Les données sont persistées via 5 volumes nommés :

| Volume | Contenu |
|--------|---------|
| `fcc_001_mariadb_data` | Base de données MariaDB |
| `fcc_001_app_logs` | Logs Gunicorn et application |
| `fcc_001_app_uploads` | Fichiers uploadés (présentation/uploads) |
| `fcc_001_app_monitoring` | Logs et sauvegardes monitoring |
| `fcc_001_app_instance` | Instance SQLite de fallback |

---

## 🔒 Sécurité en production

1. **Ne jamais commiter `.env`** : déjà ignoré par `.gitignore` et `.dockerignore`
2. **Changer tous les mots de passe** par défaut
3. **Ne pas exposer le port MariaDB** (3307) en production : retirer la section `ports` du service mariadb ou utiliser un réseau interne
4. **Activer HTTPS** : décommenter la section SSL dans `docker/nginx/nginx.conf` et monter les certificats
5. **Désactiver les données exemple** : `INIT_SAMPLE_DATA=false` en production

---

## 🚨 Résolution de problèmes

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs app

# Vérifier que MariaDB est prêt
docker compose logs mariadb
```

### Erreur de connexion à la base

- Attendre 30-60 secondes (healthcheck MariaDB + init)
- Vérifier `DB_HOST=mariadb` (nom du service, pas localhost)
- Tester : `docker compose exec app python -c "import pymysql; pymysql.connect(host='mariadb', user='fcc_user', password='...', db='fcc_001_db')"`

### Port déjà utilisé

Modifier dans `.env` :
- `APP_PORT` : port de l'application
- `DB_PORT_EXTERNAL` : port MariaDB
- `NGINX_HTTP_PORT` : port Nginx

### Rebuild après modification du code

```bash
docker compose build --no-cache app
docker compose up -d app
```

---

## 📚 Documentation associée

- [Rapport de dockerisation](RAPPORT_DOCKERISATION.md) - Analyse détaillée
- [Guide de déploiement manuel](DEPLOYMENT.md) - Installation sans Docker

---

*Dernière mise à jour : mars 2025*
