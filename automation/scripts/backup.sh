#!/bin/bash

# Script de sauvegarde pour l'application de gestion de clients
# Système CONNEXIA

echo "💾 Script de sauvegarde - Système de gestion de clients"

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

# Variables
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gestion_client.db"

# Créer le répertoire de sauvegarde s'il n'existe pas
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Création du répertoire de sauvegarde..."
    mkdir -p "$BACKUP_DIR"
fi

# Vérifier que la base de données existe
if [ ! -f "$DB_NAME" ]; then
    log_error "La base de données $DB_NAME n'existe pas"
    exit 1
fi

log_info "Début de la sauvegarde..."

# Sauvegarde de la base de données
log_info "Sauvegarde de la base de données..."
DB_BACKUP="$BACKUP_DIR/${DB_NAME%.db}_$DATE.db"
cp "$DB_NAME" "$DB_BACKUP"

if [ $? -eq 0 ]; then
    log_success "Base de données sauvegardée : $DB_BACKUP"
    
    # Vérifier la taille du fichier
    DB_SIZE=$(stat -f%z "$DB_BACKUP" 2>/dev/null || stat -c%s "$DB_BACKUP" 2>/dev/null)
    if [ "$DB_SIZE" -gt 0 ]; then
        log_success "Taille de la sauvegarde : $(($DB_SIZE / 1024)) KB"
    else
        log_error "La sauvegarde semble vide"
    fi
else
    log_error "Échec de la sauvegarde de la base de données"
    exit 1
fi

# Sauvegarde des fichiers de configuration
log_info "Sauvegarde des fichiers de configuration..."
CONFIG_BACKUP="$BACKUP_DIR/config_$DATE.tar.gz"

tar -czf "$CONFIG_BACKUP" \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='backups' \
    --exclude='logs' \
    --exclude="$DB_NAME" \
    . 2>/dev/null

if [ $? -eq 0 ]; then
    log_success "Configuration sauvegardée : $CONFIG_BACKUP"
else
    log_warning "Problème lors de la sauvegarde de la configuration"
fi

# Nettoyage des anciennes sauvegardes (garder 30 jours)
log_info "Nettoyage des anciennes sauvegardes..."

# Compter les sauvegardes avant nettoyage
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "*.db" -o -name "*.tar.gz" | wc -l)

# Supprimer les fichiers de plus de 30 jours
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Compter les sauvegardes après nettoyage
AFTER_COUNT=$(find "$BACKUP_DIR" -name "*.db" -o -name "*.tar.gz" | wc -l)
DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

if [ $DELETED_COUNT -gt 0 ]; then
    log_info "$DELETED_COUNT anciennes sauvegardes supprimées"
else
    log_info "Aucune ancienne sauvegarde à supprimer"
fi

# Statistiques finales
log_info "Résumé de la sauvegarde :"
echo "  📁 Répertoire : $BACKUP_DIR"
echo "  🗃️  Base de données : $DB_BACKUP"
echo "  ⚙️  Configuration : $CONFIG_BACKUP"
echo "  📊 Nombre total de sauvegardes : $AFTER_COUNT"

# Espace disque utilisé par les sauvegardes
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log_success "Espace utilisé par les sauvegardes : $BACKUP_SIZE"

# Vérification de l'espace disque disponible
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
log_info "Espace disque disponible : $AVAILABLE_SPACE"

echo ""
log_success "✅ Sauvegarde terminée avec succès"
echo "═══════════════════════════════════════════════════════" 