#!/bin/bash

# Script d'arrêt pour la production
# FCC_001 - Système de gestion d'incidents

set -e

# Couleurs pour les messages
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

echo "🛑 Arrêt de FCC_001..."

# Vérifier si le fichier PID existe
if [ ! -f "gunicorn.pid" ]; then
    log_warning "Fichier gunicorn.pid non trouvé."
    
    # Chercher les processus Gunicorn manuellement
    PIDS=$(pgrep -f "gunicorn.*wsgi:application" 2>/dev/null || true)
    
    if [ -z "$PIDS" ]; then
        log_info "Aucun processus Gunicorn trouvé."
        exit 0
    else
        log_info "Processus Gunicorn trouvés: $PIDS"
        for PID in $PIDS; do
            log_info "Arrêt du processus $PID..."
            kill -TERM $PID 2>/dev/null || true
        done
        
        # Attendre que les processus se terminent
        sleep 3
        
        # Vérifier si les processus sont toujours actifs
        for PID in $PIDS; do
            if ps -p $PID > /dev/null 2>&1; then
                log_warning "Processus $PID toujours actif. Forçage de l'arrêt..."
                kill -KILL $PID 2>/dev/null || true
            fi
        done
        
        log_success "Tous les processus Gunicorn ont été arrêtés."
        exit 0
    fi
fi

# Lire le PID depuis le fichier
PID=$(cat gunicorn.pid)

# Vérifier si le processus existe
if ! ps -p $PID > /dev/null 2>&1; then
    log_warning "Le processus $PID n'existe pas."
    rm -f gunicorn.pid
    log_info "Fichier PID nettoyé."
    exit 0
fi

log_info "Arrêt du processus Gunicorn (PID: $PID)..."

# Envoyer un signal TERM pour un arrêt propre
kill -TERM $PID

# Attendre que le processus se termine (maximum 30 secondes)
log_info "Attente de l'arrêt propre du serveur..."
for i in {1..30}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        log_success "Serveur arrêté proprement après $i secondes."
        rm -f gunicorn.pid
        exit 0
    fi
    sleep 1
done

# Si le processus ne s'est pas arrêté proprement, forcer l'arrêt
log_warning "Le serveur ne s'est pas arrêté proprement. Forçage de l'arrêt..."
kill -KILL $PID 2>/dev/null || true

# Attendre encore un peu
sleep 2

# Vérifier si le processus est vraiment arrêté
if ps -p $PID > /dev/null 2>&1; then
    log_error "Impossible d'arrêter le processus $PID."
    exit 1
else
    log_success "Serveur arrêté avec succès."
    rm -f gunicorn.pid
    log_info "Fichier PID nettoyé."
fi

# Nettoyage supplémentaire
log_info "Nettoyage des fichiers temporaires..."
rm -f *.pyc
find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

log_success "Arrêt terminé." 