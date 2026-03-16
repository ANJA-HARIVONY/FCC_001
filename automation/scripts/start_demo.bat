@echo off
echo 🚀 Démarrage rapide de FCC_001 - Mode Démonstration
echo =====================================================

REM Copier le fichier d'environnement de test
if not exist ".env" (
    echo 📄 Copie du fichier d'environnement de test...
    copy "test.env" ".env"
    echo ✅ Fichier .env créé
)

REM Créer les répertoires nécessaires
echo 📁 Création des répertoires...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

REM Activer l'environnement virtuel
if exist ".venv\Scripts\activate.bat" (
    echo 🐍 Activation de l'environnement virtuel...
    call .venv\Scripts\activate.bat
) else (
    echo ⚠️  Environnement virtuel non trouvé. Création...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo 📦 Installation des dépendances...
    pip install -r requirements.txt
)

REM Démarrer l'application
echo 🚀 Démarrage de l'application...
echo.
echo 💡 L'application va démarrer avec SQLite si MySQL n'est pas disponible
echo 📊 Des données d'exemple seront créées automatiquement
echo 🌐 Accès: http://localhost:5001
echo.
echo ❌ Pour arrêter: Ctrl+C
echo.

python app.py

echo.
echo ✅ Application arrêtée
pause 