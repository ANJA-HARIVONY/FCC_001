# 🚀 FCC_001 - Application de Gestion Client

## Démarrage SIMPLE

```bash
python start_app.py
```

## Structure du projet

```
FCC_001/
├── core/           # 🎯 Application principale
├── data/           # 🗄️ Base de données
├── presentation/   # 🎨 Interface utilisateur
├── i18n/           # 🌐 Internationalisation
├── automation/     # 🔧 Scripts et utilitaires
├── monitoring/     # 📊 Surveillance
├── docs/           # 📚 Documentation complète
├── config/         # ⚙️ Configuration
└── tools/          # 🛠️ Outils de développement
```

## Fonctionnalités

- 👥 **Gestion des clients** (ajout, modification, recherche)
- 👨‍💼 **Gestion des opérateurs**
- 🚨 **Gestion des incidents**
- 📄 **Impression PDF** des fiches clients
- 🌍 **Interface multilingue** (FR/ES/EN)
- 📊 **Dashboard** avec statistiques

## Gestion de session et sécurité

- ⏱️ **Inactivité** : déconnexion automatique après **30 minutes** sans activité.
- 🕛 **Durée maximale** : une session active expire au bout de **12 heures**.
- ✅ **Alerte avant expiration** : message affiché **2 minutes** avant la déconnexion pour inactivité.
- 🔐 **Option "Recordarme"** : cookie de reconnexion limité à **7 jours**.

Ces règles sont configurées dans `config.py` et appliquées côté serveur dans `core/app.py`, avec une alerte côté interface.

## Déploiement Docker

```bash
# 1. Créer .env depuis le template
cp .env.example .env
# 2. Modifier .env avec vos paramètres (SECRET_KEY, mots de passe, etc.)

# 3. Lancer les services
docker compose up -d

# L'app est accessible sur http://localhost:8089
# Avec Nginx : docker compose --profile with-nginx up -d
```

---

## Déploiement en production avec Portainer

Ce guide décrit les étapes pour déployer FCC_001 sur un serveur avec Portainer.

### Prérequis

- Serveur avec Docker et Portainer installés
- Accès à l'interface web Portainer (admin)
- Nom de domaine ou IP du serveur

### Étape 1 : Préparer le projet en local

```bash
# 1. Cloner ou copier le projet sur votre machine
cd FCC_001

# 2. Créer et configurer le fichier .env
cp .env.example .env
# Éditer .env : SECRET_KEY, DB_PASSWORD, DB_ROOT_PASSWORD (mots de passe forts !)
```

**Variables importantes à modifier pour la production :**

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Clé secrète unique et longue (générer avec `openssl rand -hex 32`) |
| `DB_ROOT_PASSWORD` | Mot de passe root MariaDB |
| `DB_PASSWORD` | Mot de passe utilisateur BDD |
| `APP_PORT` | Port exposé (ex: 8089) |

### Étape 2 : Transférer le projet sur le serveur

**Option A – Via Git (recommandé) :**

```bash
# Sur le serveur (SSH)
git clone <url-du-repo> FCC_001
cd FCC_001
```

**Option B – Via SCP/SFTP :**

```bash
# Depuis votre machine locale
scp -r FCC_001/ user@votre-serveur:/chemin/destination/
```

Vérifier que ces fichiers/dossiers sont présents sur le serveur :
- `docker-compose.yml`
- `Dockerfile`
- `.env`
- `config/`, `core/`, `presentation/`, `data/init/`, `docker/`, `i18n/`, etc.
- `docker-entrypoint.sh`

### Étape 3 : Déployer avec Portainer

1. **Connexion à Portainer**  
   - Ouvrir `http://IP-DU-SERVEUR:9000` (ou le port configuré)  
   - Se connecter avec vos identifiants admin  

2. **Créer une Stack**  
   - Menu **Stacks** → **Add stack**  
   - Nom : `fcc_001`  

3. **Configuration du déploiement**  

   **Option A – Depuis un dépôt Git (recommandé) :**

   - Build method : **Git repository** – URL du dépôt, branche `main`  
   - Compose path : `docker-compose.yml`  
   - Dans **Environment variables**, coller le contenu de `.env` (car `.env` n'est pas versionné)  

   **Option B – Projet déjà sur le serveur :** Exécuter `docker compose up -d --build` dans le dossier du projet. **Option C – Web editor :** Si l'image est sur un registry, remplacer `build:` par `image: ...`.

   - Compose path : `docker-compose.yml`  
   - Si Git : saisir l’URL du repo et la branche  

4. **Variables d’environnement**  
   - À définir : `SECRET_KEY`, `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `DB_NAME`, `DB_USER`, `APP_PORT`  
   - Le fichier `.env` n'est pas versionné ; le créer sur le serveur ou saisir les variables dans Portainer  

5. **Démarrer la stack**  
   - Cliquer sur **Deploy the stack**  
   - L’image sera buildée puis les services démarrés (MariaDB + app)  

6. **Surveiller le déploiement**  
   - Onglet **Containers** : vérifier que `fcc_001_app` et `fcc_001_mariadb` sont en état "running"  
   - Consulter les logs en cas d’erreur : clic sur le conteneur → **Logs**  

### Étape 4 : Vérifier l’accès

- Application : `http://IP-DU-SERVEUR:8089` (ou le port défini dans `APP_PORT`)  
- Base de données (optionnel) : `IP:3307` pour un accès externe à MariaDB  

### Étape 5 : Mise à jour de l’application

1. Mettre à jour le code sur le serveur (`git pull` ou upload des fichiers)
2. Dans Portainer : **Stacks** → `fcc_001` → **Editor**
3. Sauvegarder puis **Update the stack** (avec option "Pull and redeploy" si applicable)
4. Ou en ligne de commande sur le serveur :
   ```bash
   cd FCC_001
   docker compose pull  # si images sur un registry
   docker compose up -d --build
   ```

### Dépannage

| Problème | Solution |
|----------|----------|
| Container app redémarre en boucle | Vérifier les logs, la connexion DB et les variables d’environnement |
| Erreur "env_file .env" | Vérifier que `.env` existe dans le projet sur le serveur |
| Port déjà utilisé | Changer `APP_PORT` dans `.env` |
| WeasyPrint / PDF en erreur | Vérifier les logs ; éventuellement mettre `WEASYPRINT_AVAILABLE=false` |

### Nginx (optionnel)

Pour exposer l’app derrière Nginx en production :

```bash
docker compose --profile with-nginx up -d
```

---

## Accès

- **Local (dev) :** http://localhost:5001
- **Docker :** http://localhost:8089 (ou port configuré dans APP_PORT)
- **Base de données :** MariaDB (avec fallback SQLite)

## Support

Consultez `docs/` pour la documentation complète.