@echo off
echo 🛑 Arrêt de FCC_001...

REM Arrêter tous les processus Gunicorn
echo 🔍 Recherche des processus Gunicorn...
tasklist /fi "imagename eq gunicorn.exe" 2>nul | find /i "gunicorn.exe" >nul
if %errorlevel% == 0 (
    echo 🛑 Arrêt des processus Gunicorn...
    taskkill /f /im gunicorn.exe
    echo ✅ Processus Gunicorn arrêtés
) else (
    echo ℹ️  Aucun processus Gunicorn trouvé
)

REM Arrêter aussi les processus Python liés à l'application
echo 🔍 Recherche des processus Python FCC_001...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| find "wsgi" 2^>nul') do (
    echo 🛑 Arrêt du processus Python %%i...
    taskkill /f /pid %%i 2>nul
)

REM Nettoyer les fichiers temporaires
echo 🧹 Nettoyage des fichiers temporaires...
del /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul

echo ✅ Arrêt terminé avec succès !
pause 