@echo off
echo 🚀 Démarrage de FCC_001 en mode production (Windows)...

REM Vérifier que nous sommes dans le bon répertoire
if not exist "app.py" (
    echo ❌ Erreur: Fichier app.py non trouvé. Exécutez ce script depuis le répertoire de l'application.
    pause
    exit /b 1
)

REM Charger les variables d'environnement
if exist ".env" (
    echo 📄 Chargement des variables d'environnement...
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%%"=="#" set %%a=%%b
    )
) else (
    echo ⚠️  Fichier .env non trouvé. Utilisation des valeurs par défaut.
    if exist "env.example" (
        copy "env.example" ".env"
        echo ⚠️  Fichier .env créé depuis env.example. CONFIGUREZ VOS VARIABLES !
        pause
        exit /b 1
    )
)

REM Définir l'environnement
set FLASK_ENV=production
set FLASK_APP=wsgi.py

REM Créer les répertoires nécessaires
echo 📁 Création des répertoires nécessaires...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "static\uploads" mkdir static\uploads

REM Activer l'environnement virtuel
if exist ".venv\Scripts\activate.bat" (
    echo 🐍 Activation de l'environnement virtuel...
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    echo 🐍 Activation de l'environnement virtuel...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️  Environnement virtuel non trouvé. Création...
    python -m venv .venv
    call .venv\Scripts\activate.bat
)

REM Installer/Mettre à jour les dépendances
echo 📦 Installation des dépendances...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Effectuer les migrations de base de données
echo 🗄️  Vérification de la base de données...
if not exist "migrations" (
    echo 🗄️  Initialisation de la base de données...
    flask db init
)

echo 🗄️  Application des migrations...
flask db upgrade

REM Vérifier la configuration
echo ✅ Vérification de la configuration...
python -c "from app import app; print('✅ Configuration OK')" || (
    echo ❌ Erreur de configuration. Vérifiez vos variables d'environnement.
    pause
    exit /b 1
)

REM Arrêter l'ancien processus s'il existe
echo 🛑 Vérification des processus existants...
taskkill /f /im gunicorn.exe 2>nul

REM Démarrer Gunicorn
echo 🚀 Démarrage du serveur Gunicorn...
echo Port: %PORT%
if "%PORT%"=="" set PORT=5001
if "%WORKERS%"=="" set WORKERS=4
if "%TIMEOUT%"=="" set TIMEOUT=120

start "FCC_001_Server" gunicorn --config gunicorn.conf.py wsgi:application

echo ✅ Serveur démarré avec succès !
echo 📝 Logs disponibles dans le dossier 'logs/'
echo 🌐 Accédez à l'application: http://localhost:%PORT%
echo 🛑 Pour arrêter le serveur, utilisez: scripts\stop_production.bat

pause 