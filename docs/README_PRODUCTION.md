# 🚀 FCC_001 - Guide de Mise en Production

## Installation Rapide

### Windows
```bash
# 1. Cloner le projet
git clone <votre-repo>
cd FCC_001

# 2. Exécuter l'installation
scripts\install.bat

# 3. Configurer .env (éditer avec votre éditeur préféré)
notepad .env

# 4. Démarrer en production
scripts\start_production.bat
```

### Linux/macOS
```bash
# 1. Cloner le projet
git clone <votre-repo>
cd FCC_001

# 2. Exécuter l'installation
chmod +x scripts/*.sh
./scripts/install.sh

# 3. Configurer .env
nano .env

# 4. Démarrer en production
./scripts/start_production.sh
```

## Configuration Minimale (.env)

```bash
# OBLIGATOIRE - Générez une clé secrète sécurisée
SECRET_KEY=votre-clé-secrète-très-longue-et-complexe

# Configuration de la base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fcc_001_db
DB_USER=votre_utilisateur_db
DB_PASSWORD=votre_mot_de_passe_db

# Configuration du serveur
PORT=5001
WORKERS=4
```

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `scripts/install.sh(.bat)` | Installation complète |
| `scripts/start_production.sh(.bat)` | Démarrer en production |
| `scripts/stop_production.sh(.bat)` | Arrêter le serveur |
| `scripts/restart_production.sh(.bat)` | Redémarrer |
| `scripts/backup.sh` | Sauvegarder la DB |

## Accès à l'Application

- **URL:** http://localhost:5001
- **Logs:** `tail -f logs/app.log` (Linux) ou voir le dossier `logs/`
- **Arrêt:** Ctrl+C ou script d'arrêt

## Architecture de Production

```
FCC_001/
├── app.py              # Application principale
├── wsgi.py             # Point d'entrée WSGI
├── config.py           # Configuration multi-environnement
├── gunicorn.conf.py    # Configuration Gunicorn
├── requirements.txt    # Dépendances Python
├── .env               # Variables d'environnement (à créer)
├── scripts/           # Scripts de gestion
│   ├── install.sh|.bat
│   ├── start_production.sh|.bat
│   ├── stop_production.sh|.bat
│   └── backup.sh
├── logs/              # Logs de l'application
├── uploads/           # Fichiers uploadés
└── backups/           # Sauvegardes DB
```

## Fonctionnalités de Production

✅ **Serveur WSGI** - Gunicorn avec configuration optimisée  
✅ **Logs rotatifs** - Gestion automatique des logs  
✅ **Variables d'environnement** - Configuration sécurisée  
✅ **Auto-refresh dashboard** - Actualisation automatique  
✅ **Sélecteur de période** - Affichage flexible des données  
✅ **Sauvegarde DB** - Script de sauvegarde automatisé  
✅ **Support multi-plateforme** - Windows et Linux  
✅ **Gestion d'erreurs** - Logs détaillés et récupération  

## Sécurité

⚠️ **Important:** Avant la mise en production
1. Changez la `SECRET_KEY` dans `.env`
2. Configurez un mot de passe fort pour la DB
3. Limitez l'accès réseau si nécessaire
4. Activez HTTPS avec un reverse proxy (Nginx)
5. Mettez en place des sauvegardes régulières

## Support et Logs

- **Logs application:** `logs/app.log`
- **Logs Gunicorn:** `logs/access.log`, `logs/error.log`
- **Monitoring:** `ps aux | grep gunicorn`
- **Test connectivité:** `curl http://localhost:5001`

---

Pour plus de détails, consultez `DEPLOYMENT.md` 