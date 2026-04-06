#!/bin/bash

# Script de démarrage ultra-simple SANS PDF
# Système de gestion de clients CONNEXIA

echo "🚀 Démarrage de l'application (SANS PDF)..."

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Désactivation des fonctionnalités PDF..."

# Vérifier le répertoire
if [ ! -f "app.py" ]; then
    echo "❌ Fichier app.py non trouvé. Vérifiez le répertoire."
    exit 1
fi

# Créer les répertoires
mkdir -p logs backups uploads

# Activer l'environnement virtuel si disponible
if [ -d ".venv" ]; then
    echo -e "${BLUE}[INFO]${NC} Activation de l'environnement virtuel..."
    source .venv/bin/activate
fi

# Créer la base de données si nécessaire
if [ ! -f "gestion_client.db" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Création de la base de données..."
    python3 test_data.py
fi

# Sauvegarder
if [ -f "gestion_client.db" ]; then
    cp gestion_client.db "backups/gestion_client_$(date +%Y%m%d_%H%M%S).db" 2>/dev/null || true
fi

# Arrêter les processus existants sur le port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
sleep 1

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🌟 SYSTÈME DE GESTION DE CLIENTS CONNEXIA"
echo "═══════════════════════════════════════════════════════"
echo "📊 Dashboard     : http://localhost:5001"
echo "👥 Clients       : http://localhost:5001/clients"
echo "🚨 Incidents     : http://localhost:5001/incidents"
echo "👤 Opérateurs    : http://localhost:5001/operateurs"
echo "═══════════════════════════════════════════════════════"
echo "✅ Mode SANS PDF - Utilisez l'impression du navigateur"
echo "═══════════════════════════════════════════════════════"
echo ""

# Désactiver WeasyPrint via variable d'environnement
export WEASYPRINT_AVAILABLE=False

# Démarrer l'application
echo -e "${GREEN}[SUCCESS]${NC} Démarrage de l'application..."
python3 app.py 