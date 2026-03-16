# Guide de Déploiement - FCC_001

## 📋 Prérequis

### Système
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Python 3.8+
- MySQL/MariaDB 10.0+
- 2 GB RAM minimum
- 10 GB espace disque libre

### Logiciels requis
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv mysql-client git nginx

# CentOS/RHEL
sudo yum install python3 python3-pip git mysql nginx
```

## 🚀 Installation Rapide

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd FCC_001
```

### 2. Exécuter l'installation automatique
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

### 3. Configurer l'environnement
```bash
# Éditez le fichier .env avec vos paramètres
nano .env

# Exemple de configuration minimale:
SECRET_KEY=votre-clé-secrète-très-longue-et-complexe
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fcc_001_db
DB_USER=fcc_user
DB_PASSWORD=mot-de-passe-sécurisé
```

### 4. Démarrer en production
```bash
./scripts/start_production.sh
```

## 🔧 Configuration Manuelle

### 1. Créer la base de données
```sql
CREATE DATABASE fcc_001_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fcc_user'@'localhost' IDENTIFIED BY 'mot-de-passe-sécurisé';
GRANT ALL PRIVILEGES ON fcc_001_db.* TO 'fcc_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configuration de l'environnement virtuel
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration de la base de données
```bash
export FLASK_APP=app.py
flask db init
flask db upgrade
```

### 4. Test de l'application
```bash
python3 -c "from app import app; print('✅ Configuration OK')"
```

## 🌐 Configuration Nginx (Optionnel)

### 1. Créer la configuration Nginx
```bash
sudo nano /etc/nginx/sites-available/fcc001
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /chemin/vers/FCC_001/static;
        expires 30d;
    }

    # Logs
    access_log /var/log/nginx/fcc001_access.log;
    error_log /var/log/nginx/fcc001_error.log;
}
```

### 2. Activer la configuration
```bash
sudo ln -s /etc/nginx/sites-available/fcc001 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuration SSL avec Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 📊 Monitoring et Logs

### Logs de l'application
```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Logs d'accès Gunicorn
tail -f logs/access.log

# Logs d'erreur Gunicorn
tail -f logs/error.log
```

### Status du service
```bash
# Vérifier le statut
ps aux | grep gunicorn

# Ou avec systemd (si configuré)
sudo systemctl status fcc001
```

## 🔄 Gestion des Services

### Scripts disponibles
```bash
# Démarrer l'application
./scripts/start_production.sh

# Arrêter l'application
./scripts/stop_production.sh

# Redémarrer l'application
./scripts/restart_production.sh

# Sauvegarder la base de données
./scripts/backup.sh
```

### Service Systemd
```bash
# Démarrer automatiquement au boot
sudo systemctl enable fcc001

# Démarrer maintenant
sudo systemctl start fcc001

# Arrêter
sudo systemctl stop fcc001

# Redémarrer
sudo systemctl restart fcc001
```

## 💾 Sauvegardes

### Sauvegarde automatique
```bash
# Ajouter au crontab pour une sauvegarde quotidienne à 2h
crontab -e

# Ajouter cette ligne:
0 2 * * * cd /chemin/vers/FCC_001 && ./scripts/backup.sh >/dev/null 2>&1
```

### Restauration
```bash
# Restaurer depuis une sauvegarde
mysql -h localhost -u fcc_user -p fcc_001_db < backups/fcc_001_backup_YYYYMMDD_HHMMSS.sql
```

## 🔧 Maintenance

### Mise à jour de l'application
```bash
# Arrêter l'application
./scripts/stop_production.sh

# Mettre à jour le code
git pull origin main

# Mettre à jour les dépendances
source .venv/bin/activate
pip install -r requirements.txt

# Appliquer les migrations
flask db upgrade

# Redémarrer
./scripts/start_production.sh
```

### Nettoyage des logs
```bash
# Compresser les anciens logs
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Supprimer les logs très anciens
find logs/ -name "*.gz" -mtime +90 -delete
```

## 🚨 Résolution de Problèmes

### L'application ne démarre pas
1. Vérifier les logs: `tail -f logs/error.log`
2. Vérifier la configuration: `python3 -c "from app import app; print('OK')"`
3. Vérifier la base de données: `mysql -h $DB_HOST -u $DB_USER -p`

### Base de données non accessible
1. Vérifier que MySQL est démarré: `sudo systemctl status mysql`
2. Vérifier les paramètres dans `.env`
3. Tester la connexion: `mysql -h localhost -u fcc_user -p`

### Erreur 502 Bad Gateway (avec Nginx)
1. Vérifier que Gunicorn est démarré: `ps aux | grep gunicorn`
2. Vérifier les ports: `netstat -tlnp | grep 5001`
3. Vérifier les logs Nginx: `sudo tail -f /var/log/nginx/error.log`

### Performance lente
1. Augmenter le nombre de workers: modifier `WORKERS` dans `.env`
2. Optimiser la base de données: `ANALYZE TABLE client, incident, operateur;`
3. Activer le cache nginx pour les fichiers statiques

## 📈 Optimisations de Production

### Configuration Gunicorn optimisée
```python
# Dans gunicorn.conf.py
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 2
```

### Configuration MySQL optimisée
```sql
# Dans my.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 128M
query_cache_type = 1
```

## 🛡️ Sécurité

### Recommandations
1. Changer le port par défaut (5001 → autre)
2. Utiliser un reverse proxy (Nginx)
3. Configurer un firewall (ufw/iptables)
4. Activer SSL/TLS
5. Limiter les accès à la base de données
6. Faire des sauvegardes régulières
7. Maintenir le système à jour

### Configuration firewall
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Fermer l'accès direct à l'application
sudo ufw deny 5001
```

## 📞 Support

En cas de problème:
1. Consulter les logs: `tail -f logs/app.log`
2. Vérifier la documentation
3. Contacter l'équipe de support

---

**Version:** 1.0.0  
**Dernière mise à jour:** $(date +"%d/%m/%Y") 