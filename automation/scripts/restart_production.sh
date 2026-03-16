#!/bin/bash

# Script de redémarrage pour la production
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

echo "🔄 Redémarrage de FCC_001..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "app.py" ]; then
    log_error "Fichier app.py non trouvé. Assurez-vous d'être dans le répertoire de l'application."
    exit 1
fi

# Arrêter le serveur s'il est en cours d'exécution
log_info "Arrêt du serveur actuel..."
./scripts/stop_production.sh

# Attendre un peu pour s'assurer que tout est arrêté
sleep 2

# Vérifier que Git est disponible et le répertoire est un dépôt Git
if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    log_info "Mise à jour du code depuis Git..."
    
    # Sauvegarder les modifications locales si elles existent
    if ! git diff-index --quiet HEAD --; then
        log_warning "Modifications locales détectées. Création d'un backup..."
        git stash push -m "Backup avant redémarrage $(date)"
        STASHED=true
    else
        STASHED=false
    fi
    
    # Mettre à jour le code
    git pull origin main || git pull origin master || {
        log_warning "Impossible de mettre à jour depuis Git. Continuation avec le code local."
    }
    
    # Restaurer les modifications si elles ont été sauvegardées
    if [ "$STASHED" = true ]; then
        log_info "Restauration des modifications locales..."
        git stash pop || {
            log_warning "Impossible de restaurer les modifications. Vérifiez manuellement."
        }
    fi
else
    log_info "Git non disponible ou pas un dépôt Git. Pas de mise à jour du code."
fi

# Activer l'environnement virtuel si nécessaire
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    log_warning "Environnement virtuel non trouvé."
fi

# Mettre à jour les dépendances si requirements.txt a changé
if [ -f "requirements.txt" ]; then
    log_info "Vérification des dépendances..."
    pip install -r requirements.txt --upgrade --quiet
fi

# Appliquer les migrations de base de données
log_info "Application des migrations de base de données..."
flask db upgrade 2>/dev/null || {
    log_warning "Erreur lors des migrations. Continuation du redémarrage."
}

# Nettoyer les fichiers temporaires
log_info "Nettoyage des fichiers temporaires..."
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Créer les répertoires nécessaires
log_info "Vérification des répertoires..."
mkdir -p logs uploads static/uploads

# Redémarrer le serveur
log_info "Démarrage du nouveau serveur..."
./scripts/start_production.sh &

# Attendre que le serveur démarre
log_info "Attente du démarrage du serveur..."
sleep 5

# Vérifier que le serveur a bien démarré
if [ -f "gunicorn.pid" ]; then
    PID=$(cat gunicorn.pid)
    if ps -p $PID > /dev/null 2>&1; then
        log_success "Serveur redémarré avec succès (PID: $PID)"
        
        # Test de connectivité
        PORT=${PORT:-5001}
        if command -v curl >/dev/null 2>&1; then
            log_info "Test de connectivité..."
            if curl -s "http://localhost:$PORT" >/dev/null; then
                log_success "Serveur accessible sur le port $PORT"
            else
                log_warning "Serveur non accessible. Vérifiez les logs."
            fi
        fi
        
        log_info "Logs disponibles dans le dossier 'logs/'"
        log_info "Pour arrêter le serveur: ./scripts/stop_production.sh"
        log_info "Pour voir les logs en temps réel: tail -f logs/app.log"
    else
        log_error "Le serveur n'a pas pu démarrer. Vérifiez les logs."
        exit 1
    fi
else
    log_error "Fichier PID non créé. Le serveur n'a pas pu démarrer."
    exit 1
fi

log_success "Redémarrage terminé avec succès !" 