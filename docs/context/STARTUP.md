# 🚀 Démarrage de l'Application FCC_001

## Version 2.0 - Architecture Réorganisée

### 📋 Nouvelle Procédure Simplifiée

L'application a été entièrement réorganisée avec une architecture modulaire claire. Le démarrage est maintenant **ultra-simplifié**.

### ⚡ Démarrage en Une Commande

```bash
python start_app.py
```

**C'est tout !** 🎉

### 🔧 Ce que fait `start_app.py` automatiquement :

1. **✅ Vérification de l'environnement virtuel**
   - Détecte `.venv/` automatiquement
   - Affiche des instructions claires si manquant

2. **✅ Installation automatique des dépendances**
   - Détecte si Flask est installé
   - Installe automatiquement `flask`, `flask-sqlalchemy`, `flask-babel`
   - Utilise `--no-cache-dir` pour une installation rapide

3. **✅ Configuration des chemins**
   - Ajoute `core/` au path Python automatiquement
   - Configure les chemins relatifs pour templates et static

4. **✅ Démarrage sécurisé**
   - Gestion d'erreurs complète
   - Messages informatifs à chaque étape
   - Fallback vers instructions manuelles si problème

### 🌐 Accès à l'Application

- **URL principale :** http://localhost:5001
- **Interface :** Responsive Bootstrap 5
- **Langues :** Français, Espagnol, Anglais
- **Mode debug :** Activé par défaut

### 📁 Structure des Chemins (Automatique)

```
Depuis start_app.py :
├── core/app.py              → Application Flask
├── presentation/templates/  → Templates Jinja2  
├── presentation/static/     → CSS, JS, Images
├── data/instance/          → Base de données SQLite
├── i18n/translations/      → Traductions
└── monitoring/logs/        → Fichiers de log
```

### 🔄 Arrêt de l'Application

- **Ctrl+C** dans le terminal
- Arrêt propre automatique

### 🛠️ Résolution de Problèmes

Si `python start_app.py` échoue :

```bash
# Solution manuelle
.venv\Scripts\activate
pip install flask flask-sqlalchemy flask-babel
python start_app.py
```

### 📊 Statut des Services

Au démarrage, l'application vérifie automatiquement :
- ✅ Flask et dépendances
- ✅ Connexion MariaDB (avec fallback SQLite)
- ⚠️ WeasyPrint (PDF optionnel)
- ✅ Templates et assets statiques

### 🔗 Scripts Alternatifs

Tous les anciens scripts sont dans `tools/` pour référence, mais **`start_app.py` est le seul nécessaire**.