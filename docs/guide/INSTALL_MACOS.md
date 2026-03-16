# Guide d'Installation pour macOS

Ce guide vous aidera à installer et configurer l'application de gestion client sur macOS.

## 🚀 Installation Rapide

### 1. Prérequis

- **Python 3.8+** (recommandé : Python 3.12)
- **pip** (gestionnaire de paquets Python)
- **Git** (pour cloner le projet)

### 2. Installation

```bash
# 1. Cloner le projet
git clone <url-du-repo>
cd FCC_001

# 2. Créer un environnement virtuel
python3 -m venv .venv
source .venv/bin/activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Compiler les traductions
pybabel compile -d translations

# 5. Démarrer l'application
python3 test_app.py
```

L'application sera accessible sur `http://localhost:5001`

## 🌐 Fonctionnalités Disponibles

### ✅ Fonctionnalités Actives

- **Support multilingue** : Français, Espagnol, Anglais
- **Gestion complète** : Clients, Opérateurs, Incidents
- **Dashboard interactif** avec graphiques
- **Recherche avancée**
- **Interface responsive**
- **Impression HTML** optimisée

### ⚠️ Fonctionnalités Limitées

- **Génération PDF** : WeasyPrint nécessite des bibliothèques système supplémentaires sur macOS
  - **Alternative** : Impression via le navigateur (Cmd+P)
  - **Solution** : Utiliser la version HTML optimisée pour l'impression

## 🔧 Résolution des Problèmes

### Problème : WeasyPrint ne fonctionne pas

**Symptôme** :

```
OSError: cannot load library 'gobject-2.0-0'
```

**Solution 1 - Utiliser l'alternative HTML** (Recommandée) :
L'application fonctionne sans WeasyPrint et propose une alternative HTML pour l'impression.

**Solution 2 - Installer les dépendances système** :

```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer les dépendances
brew install cairo pango gdk-pixbuf libffi

# Réinstaller WeasyPrint
pip install weasyprint
```

### Problème : Flask-Babel

**Symptôme** :

```
AttributeError: 'Babel' object has no attribute 'localeselector'
```

**Solution** :
Ce problème est déjà résolu dans la version actuelle. Assurez-vous d'utiliser la dernière version du code.

### Problème : Port déjà utilisé

**Symptôme** :

```
OSError: [Errno 48] Address already in use
```

**Solution** :

```bash
# Trouver le processus utilisant le port 5001
lsof -ti:5001

# Arrêter le processus
kill -9 $(lsof -ti:5001)

# Ou utiliser un autre port
python3 -c "from app import app; app.run(port=5002)"
```

## 📄 Impression PDF

### Option 1 : Impression via le navigateur (Recommandée)

1. Aller sur la fiche client : `/clients/{id}/fiche`
2. Cliquer sur "Imprimer PDF"
3. Utiliser Cmd+P pour imprimer ou sauvegarder en PDF

### Option 2 : Installation complète de WeasyPrint

Si vous souhaitez la génération PDF automatique :

```bash
# Installer les dépendances système
brew install cairo pango gdk-pixbuf libffi

# Installer WeasyPrint
pip install weasyprint

# Redémarrer l'application
python3 test_app.py
```

## 🌐 Changement de Langue

1. Utiliser le sélecteur de langue (🌐) dans la barre de navigation
2. Choisir entre :
   - 🇫🇷 **Français** (par défaut)
   - 🇪🇸 **Español**
   - 🇬🇧 **English**

## 🔗 URLs Importantes

- **Application principale** : `http://localhost:5001`
- **Gestion des clients** : `http://localhost:5001/clients`
- **Gestion des incidents** : `http://localhost:5001/incidents`
- **Gestion des opérateurs** : `http://localhost:5001/operateurs`
- **Fiche client** : `http://localhost:5001/clients/{id}/fiche`

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** dans le terminal
2. **Consultez la page d'aide** dans l'application
3. **Redémarrez l'application** : Ctrl+C puis relancer
4. **Vérifiez les dépendances** : `pip list`

## 📝 Notes Techniques

- **Base de données** : SQLite (créée automatiquement)
- **Port par défaut** : 5001
- **Mode debug** : Activé par défaut
- **Traductions** : Compilées automatiquement

## 🎯 Prochaines Étapes

1. **Ajouter des données de test** via l'interface
2. **Tester les fonctionnalités multilingues**
3. **Essayer l'impression des fiches clients**
4. **Explorer les graphiques du dashboard**
