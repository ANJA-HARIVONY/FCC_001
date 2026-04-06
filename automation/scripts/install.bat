@echo off
echo 📦 Installation de FCC_001 - Système de gestion d'incidents
echo ============================================================

REM Vérifier que le script est exécuté depuis le bon répertoire
if not exist "app.py" (
    echo ❌ Erreur: Fichier app.py non trouvé. Exécutez ce script depuis le répertoire de l'application.
    pause
    exit /b 1
)

REM Vérifier Python
echo 🐍 Vérification de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python n'est pas installé ou pas dans le PATH.
    echo    Installez Python 3.8+ depuis https://python.org
    pause
    exit /b 1
)

python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"
if %errorlevel% neq 0 (
    echo ❌ Python 3.8+ requis. Votre version:
    python --version
    pause
    exit /b 1
)

echo ✅ Python OK

REM Créer l'environnement virtuel
echo 🐍 Création de l'environnement virtuel...
if exist ".venv" (
    echo ⚠️  Environnement virtuel existant trouvé. Suppression...
    rmdir /s /q .venv
)

python -m venv .venv
call .venv\Scripts\activate.bat
echo ✅ Environnement virtuel créé et activé

REM Mettre à jour pip
echo 📦 Mise à jour de pip...
python -m pip install --upgrade pip

REM Installer les dépendances
echo 📦 Installation des dépendances...
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo ✅ Dépendances installées
) else (
    echo ❌ Fichier requirements.txt non trouvé
    pause
    exit /b 1
)

REM Créer les répertoires nécessaires
echo 📁 Création des répertoires...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "static\uploads" mkdir static\uploads
if not exist "backups" mkdir backups
echo ✅ Répertoires créés

REM Copier le fichier d'environnement
echo ⚙️  Configuration de l'environnement...
if not exist ".env" (
    if exist "env.example" (
        copy "env.example" ".env"
        echo ⚠️  Fichier .env créé depuis env.example
        echo ⚠️  IMPORTANT: Configurez vos variables d'environnement dans .env
    ) else (
        echo ❌ Fichier env.example non trouvé
        pause
        exit /b 1
    )
) else (
    echo ℹ️  Fichier .env existant trouvé
)

REM Charger les variables d'environnement pour vérification
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%%"=="#" set %%a=%%b
)

if "%SECRET_KEY%"=="your-very-secret-key-here-change-me" (
    echo ❌ ERREUR: SECRET_KEY doit être configurée dans .env
    echo    Générez une clé secrète avec: python -c "import secrets; print(secrets.token_hex(32))"
    pause
    exit /b 1
)

if "%DB_PASSWORD%"=="your-database-password" (
    echo ❌ ERREUR: DB_PASSWORD doit être configurée dans .env
    pause
    exit /b 1
)

echo ✅ Configuration validée

REM Initialiser la base de données
echo 🗄️  Initialisation de la base de données...
set FLASK_APP=app.py
set FLASK_ENV=development

if not exist "migrations" (
    echo 🗄️  Création des migrations...
    flask db init
)

echo 🗄️  Application des migrations...
flask db upgrade

REM Test de l'application
echo ✅ Test de l'application...
python -c "from app import app; print('✅ Application OK')" || (
    echo ❌ Erreur lors du test de l'application
    pause
    exit /b 1
)

REM Résumé de l'installation
echo.
echo ✅ 🎉 Installation terminée avec succès !
echo.
echo 📋 Prochaines étapes:
echo    1. Configurez vos variables dans .env si ce n'est pas fait
echo    2. Pour démarrer en production: scripts\start_production.bat
echo    3. Pour démarrer en développement: python app.py
echo    4. Accédez à l'application: http://localhost:5001
echo.
echo 🔧 Scripts disponibles:
echo    - scripts\start_production.bat    # Démarrer en production
echo    - scripts\stop_production.bat     # Arrêter le serveur
echo    - python app.py                   # Mode développement
echo.
echo 📁 Répertoires créés:
echo    - logs\         # Logs de l'application
echo    - uploads\      # Fichiers uploadés
echo    - backups\      # Sauvegardes
echo.

REM Proposer de démarrer l'application
choice /c YN /m "Voulez-vous démarrer l'application maintenant"
if %errorlevel%==1 (
    echo 🚀 Démarrage de l'application en mode développement...
    echo Appuyez sur Ctrl+C pour arrêter
    python app.py
)

echo.
echo ✅ Installation terminée !
pause 