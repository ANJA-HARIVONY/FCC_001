#!/bin/bash

# Script de démarrage simplifié pour la production locale
# Système de gestion de clients CONNEXIA

echo "🚀 Démarrage de l'application de gestion de clients..."

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "app.py" ]; then
    log_error "Le fichier app.py n'existe pas dans ce répertoire"
    log_error "Veuillez vous placer dans le répertoire du projet"
    exit 1
fi

# Créer les répertoires nécessaires
mkdir -p logs backups uploads

# Activer l'environnement virtuel s'il existe
if [ -d ".venv" ]; then
    log_info "Activation de l'environnement virtuel..."
    source .venv/bin/activate
    log_success "Environnement virtuel activé"
else
    log_warning "Aucun environnement virtuel trouvé"
    log_info "Installation directe des dépendances..."
fi

# Vérifier si la base de données existe
if [ ! -f "gestion_client.db" ]; then
    log_warning "Base de données non trouvée"
    log_info "Création des données de test..."
    if [ -f "test_data.py" ]; then
        python3 test_data.py
        log_success "Base de données créée avec des données de test"
    else
        log_error "Script de données de test non trouvé"
    fi
else
    log_success "Base de données trouvée"
fi

# Vérifier si le port est disponible
PORT=5001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    log_warning "Le port $PORT est déjà utilisé"
    log_info "Tentative d'arrêt des processus existants..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Sauvegarder la base de données
if [ -f "gestion_client.db" ]; then
    log_info "Sauvegarde de sécurité..."
    cp gestion_client.db "backups/gestion_client_$(date +%Y%m%d_%H%M%S).db" 2>/dev/null || true
fi

# Démarrer l'application
log_info "Démarrage de l'application sur le port $PORT..."
log_info "L'application sera accessible sur : http://localhost:$PORT"
log_info "Pour arrêter l'application, appuyez sur Ctrl+C"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🌟 SYSTÈME DE GESTION DE CLIENTS CONNEXIA"
echo "═══════════════════════════════════════════════════════"
echo "📊 Dashboard     : http://localhost:$PORT"
echo "👥 Clients       : http://localhost:$PORT/clients"
echo "🚨 Incidents     : http://localhost:$PORT/incidents"
echo "👤 Opérateurs    : http://localhost:$PORT/operateurs"
echo "═══════════════════════════════════════════════════════"
echo "⚠️  Note: Les fonctionnalités PDF sont désactivées"
echo "    Utilisez l'impression du navigateur à la place"
echo "═══════════════════════════════════════════════════════"
echo ""

# Définir les variables d'environnement pour éviter WeasyPrint
export WEASYPRINT_AVAILABLE=False

# Démarrer l'application
python3 app.py 