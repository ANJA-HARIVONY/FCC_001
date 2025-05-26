#!/bin/bash

echo "🚀 Démarrage de l'application de Gestion Client..."

# Activer l'environnement virtuel
source .venv/bin/activate

# Vérifier si les dépendances sont installées
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Installation des dépendances..."
    pip install -r requirements.txt
fi

# Créer la base de données si elle n'existe pas
if [ ! -f "gestion_client.db" ]; then
    echo "🗄️  Initialisation de la base de données..."
    python3 init_data.py
fi

echo "✅ Application prête !"
echo "🌐 Accédez à l'application sur : http://localhost:5001"
echo "📊 Dashboard avec statistiques et graphiques"
echo "👥 Gestion complète des clients, opérateurs et incidents"
echo ""
echo "Pour arrêter l'application, appuyez sur Ctrl+C"
echo ""

# Lancer l'application
python3 app.py 