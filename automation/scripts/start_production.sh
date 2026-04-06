#!/bin/bash

# Script de démarrage pour la production locale
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

# Créer le répertoire logs s'il n'existe pas
if [ ! -d "logs" ]; then
    log_info "Création du répertoire logs..."
    mkdir logs
fi

# Créer le répertoire backups s'il n'existe pas
if [ ! -d "backups" ]; then
    log_info "Création du répertoire backups..."
    mkdir backups
fi

# Activer l'environnement virtuel
log_info "Activation de l'environnement virtuel..."
if [ -d ".venv" ]; then
    source .venv/bin/activate
    log_success "Environnement virtuel activé"
else
    log_warning "Environnement virtuel non trouvé. Création en cours..."
    python3 -m venv .venv
    source .venv/bin/activate
    log_info "Installation des dépendances..."
    pip install -r requirements.txt
    log_success "Environnement virtuel créé et configuré"
fi

# Vérifier la base de données
log_info "Vérification de la base de données..."
if [ ! -f "gestion_client.db" ]; then
    log_warning "Base de données non trouvée. Création en cours..."
    flask db upgrade
    log_info "Création de données de test..."
    python3 test_data.py
    log_success "Base de données créée avec des données de test"
else
    log_success "Base de données trouvée"
fi

# Sauvegarder la base de données avant démarrage
log_info "Sauvegarde de la base de données..."
cp gestion_client.db "backups/gestion_client_$(date +%Y%m%d_%H%M%S).db"
log_success "Sauvegarde créée"

# Vérifier si le port est disponible
PORT=5001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    log_error "Le port $PORT est déjà utilisé"
    log_info "Processus utilisant le port :"
    lsof -Pi :$PORT -sTCP:LISTEN
    log_info "Voulez-vous arrêter ces processus ? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        lsof -ti:$PORT | xargs kill -9
        log_success "Processus arrêtés"
    else
        log_error "Impossible de démarrer - port occupé"
        exit 1
    fi
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
echo ""

# Démarrer l'application
python3 app.py 