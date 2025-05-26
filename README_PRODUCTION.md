# 🚀 Mise en Production Locale - Système de Gestion de Clients CONNEXIA

## 🏁 Démarrage Rapide

### Option 1 : Configuration Automatique (Recommandée)

```bash
# Cloner ou se placer dans le répertoire du projet
cd FCC_001

# Lancer la configuration automatique
./setup_production.sh

# Démarrer l'application
./start_production.sh
```

### Option 2 : Configuration Manuelle

1. **Créer l'environnement virtuel**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Installer les dépendances**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configurer la base de données**

   ```bash
   flask db init
   flask db migrate -m "Configuration initiale"
   flask db upgrade
   ```

4. **Créer des données de test**

   ```bash
   python3 test_data.py
   ```

5. **Démarrer l'application**
   ```bash
   python3 app.py
   ```

## 📋 Prérequis

- **Python 3.8+** installé sur le système
- **pip** (gestionnaire de paquets Python)
- **macOS/Linux** (testé sur macOS 14.4.0)

## 🌐 Accès à l'Application

Une fois démarrée, l'application est accessible sur :

- **URL principale** : http://localhost:5001
- **Dashboard** : http://localhost:5001
- **Clients** : http://localhost:5001/clients
- **Incidents** : http://localhost:5001/incidents
- **Opérateurs** : http://localhost:5001/operateurs

## 🔧 Scripts Disponibles

| Script                | Description                      | Utilisation             |
| --------------------- | -------------------------------- | ----------------------- |
| `setup_production.sh` | Configuration initiale complète  | `./setup_production.sh` |
| `start_production.sh` | Démarrage de l'application       | `./start_production.sh` |
| `backup.sh`           | Sauvegarde de la base de données | `./backup.sh`           |

## 📁 Structure du Projet

```
FCC_001/
├── 📄 app.py                      # Application Flask principale
├── ⚙️ config.py                   # Configuration
├── 📦 requirements.txt            # Dépendances Python
├── 🔐 .env                       # Variables d'environnement
├── 📁 .venv/                     # Environnement virtuel Python
├── 🎨 templates/                 # Templates HTML
├── 📊 static/                    # Fichiers statiques (CSS, JS)
├── 🗃️ migrations/                # Migrations de base de données
├── 💾 gestion_client.db          # Base de données SQLite
├── 🧪 test_data.py              # Script de données de test
├── 🚀 start_production.sh       # Script de démarrage
├── 💾 backup.sh                 # Script de sauvegarde
├── ⚙️ setup_production.sh       # Script de configuration
├── 📝 gunicorn.conf.py          # Configuration Gunicorn
├── 📂 logs/                     # Fichiers de logs
├── 💾 backups/                  # Sauvegardes automatiques
└── 📁 uploads/                  # Fichiers uploadés
```

## 🛠️ Maintenance et Administration

### Sauvegardes

```bash
# Sauvegarde manuelle
./backup.sh

# Les sauvegardes sont stockées dans le dossier backups/
# Format : gestion_client_YYYYMMDD_HHMMSS.db
```

### Logs

```bash
# Voir les logs en temps réel
tail -f logs/gestion_client.log

# Voir les logs Gunicorn (si utilisé)
tail -f logs/gunicorn_access.log
tail -f logs/gunicorn_error.log
```

### Arrêter l'Application

```bash
# Méthode 1 : Ctrl+C dans le terminal où l'app tourne

# Méthode 2 : Trouver et arrêter le processus
ps aux | grep python3
kill PID_DU_PROCESSUS
```

## 🔄 Mise à Jour

1. **Sauvegarder les données**

   ```bash
   ./backup.sh
   ```

2. **Mettre à jour le code**

   ```bash
   git pull  # Si vous utilisez Git
   ```

3. **Mettre à jour les dépendances**

   ```bash
   source .venv/bin/activate
   pip install --upgrade -r requirements.txt
   ```

4. **Appliquer les migrations**

   ```bash
   flask db upgrade
   ```

5. **Redémarrer l'application**
   ```bash
   ./start_production.sh
   ```

## 🚨 Dépannage

### Problèmes Courants

1. **Port 5001 déjà utilisé**

   ```bash
   # Trouver le processus utilisant le port
   lsof -i :5001

   # Arrêter le processus
   kill -9 PID
   ```

2. **Problème de permissions**

   ```bash
   chmod +x *.sh
   ```

3. **Base de données corrompue**

   ```bash
   # Sauvegarder l'ancienne
   mv gestion_client.db gestion_client_corrupt.db

   # Recréer
   flask db upgrade
   python3 test_data.py
   ```

4. **Dépendances manquantes**
   ```bash
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### Vérifications de Santé

```bash
# Vérifier que l'application répond
curl http://localhost:5001

# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h  # Linux
top      # macOS/Linux
```

## 📊 Monitoring

### Métriques Importantes

- **Espace disque** : Vérifier régulièrement l'espace disponible
- **Taille de la base** : Surveiller la croissance de `gestion_client.db`
- **Logs** : Nettoyer périodiquement les anciens logs
- **Sauvegardes** : Vérifier que les sauvegardes se créent correctement

### Commandes Utiles

```bash
# Taille de la base de données
ls -lh gestion_client.db

# Nombre d'enregistrements
sqlite3 gestion_client.db "SELECT
    (SELECT COUNT(*) FROM client) as clients,
    (SELECT COUNT(*) FROM incident) as incidents,
    (SELECT COUNT(*) FROM operateur) as operateurs;"

# Espace utilisé par les sauvegardes
du -sh backups/

# Processus Python en cours
ps aux | grep python3
```

## 🔒 Sécurité

### Bonnes Pratiques

1. **Changer la clé secrète** dans le fichier `.env`
2. **Sauvegarder régulièrement** la base de données
3. **Monitorer les logs** pour détecter les anomalies
4. **Limiter l'accès** au serveur (pare-feu, VPN, etc.)
5. **Mettre à jour** régulièrement les dépendances

### Configuration Réseau

L'application écoute par défaut sur `0.0.0.0:5001`, ce qui la rend accessible depuis :

- **Localhost** : http://localhost:5001
- **Réseau local** : http://IP_LOCAL:5001

Pour limiter l'accès au localhost uniquement, modifier dans `app.py` :

```python
app.run(debug=False, host='127.0.0.1', port=5001)
```

## 📞 Support

En cas de problème :

1. **Consulter les logs** : `logs/gestion_client.log`
2. **Vérifier la configuration** : fichier `.env`
3. **Tester la base de données** : `sqlite3 gestion_client.db ".tables"`
4. **Redémarrer** l'application : `./start_production.sh`

---

**Version** : 1.0  
**Dernière mise à jour** : 26 Mai 2024  
**Système testé** : macOS 14.4.0 avec Python 3.11
