#!/bin/bash
# =============================================================================
# FCC_001 - Script d'entrée Docker
# Initialisation et démarrage de l'application
# =============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions de logging
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

# =============================================================================
# Vérification de la connexion à la base de données
# =============================================================================
wait_for_db() {
    log_info "Attente de la disponibilité de la base de données..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if python -c "
import pymysql
import os
try:
    conn = pymysql.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', ''),
        charset='utf8mb4'
    )
    conn.close()
    exit(0)
except Exception as e:
    print(f'Tentative {attempt}: {e}')
    exit(1)
" 2>/dev/null; then
            log_success "Base de données accessible!"
            return 0
        fi
        
        log_warning "Tentative $attempt/$max_attempts - Base de données non disponible, attente 2s..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Impossible de se connecter à la base de données après $max_attempts tentatives"
    return 1
}

# =============================================================================
# Création de la base de données si elle n'existe pas
# =============================================================================
create_database_if_not_exists() {
    log_info "Vérification/création de la base de données..."
    
    python -c "
import pymysql
import os

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = int(os.environ.get('DB_PORT', '3306'))
DB_NAME = os.environ.get('DB_NAME', 'fcc_001_db')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')

try:
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        charset='utf8mb4'
    )
    
    with conn.cursor() as cursor:
        cursor.execute(f\"CREATE DATABASE IF NOT EXISTS \\\`{DB_NAME}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\")
        print(f'Base de données {DB_NAME} créée/vérifiée')
    
    conn.close()
except Exception as e:
    print(f'Erreur: {e}')
    exit(1)
"
    
    if [ $? -eq 0 ]; then
        log_success "Base de données prête!"
    else
        log_error "Erreur lors de la création de la base de données"
        return 1
    fi
}

# =============================================================================
# Initialisation des tables et données
# =============================================================================
init_database() {
    log_info "Initialisation des tables de la base de données..."
    
    cd /app
    
    python -c "
import os
import sys
sys.path.insert(0, '/app')

# Configurer l'environnement
os.environ['FLASK_APP'] = 'core/app.py'

from core.app import app, db, create_sample_data

with app.app_context():
    try:
        # Créer toutes les tables
        db.create_all()
        print('Tables créées avec succès')
        
        # Vérifier si des données existent déjà et INIT_SAMPLE_DATA
        from core.app import Client
        init_sample = os.environ.get('INIT_SAMPLE_DATA', 'true').lower() == 'true'
        if Client.query.count() == 0:
            if init_sample:
                print('Base de données vide - création des données exemple...')
                create_sample_data()
                print('Données exemple créées')
            else:
                print('Base de données vide (INIT_SAMPLE_DATA=false - pas de données exemple)')
        else:
            print(f'Base de données existante avec {Client.query.count()} clients')
            
    except Exception as e:
        print(f'Erreur initialisation: {e}')
        exit(1)
"
    
    if [ $? -eq 0 ]; then
        log_success "Base de données initialisée!"
    else
        log_warning "Problème lors de l'initialisation (peut être normal si déjà initialisée)"
    fi
}

# =============================================================================
# Création des répertoires nécessaires
# =============================================================================
setup_directories() {
    log_info "Configuration des répertoires..."
    
    mkdir -p /app/logs
    mkdir -p /app/instance
    mkdir -p /app/monitoring/logs
    mkdir -p /app/monitoring/backups
    mkdir -p /app/presentation/uploads
    
    log_success "Répertoires configurés!"
}

# =============================================================================
# Affichage des informations de démarrage
# =============================================================================
show_startup_info() {
    echo ""
    echo "=============================================="
    echo "   FCC_001 - Gestion d'Incidents Client"
    echo "=============================================="
    echo ""
    log_info "Configuration:"
    echo "  - FLASK_ENV: ${FLASK_ENV:-production}"
    echo "  - DB_HOST: ${DB_HOST:-localhost}"
    echo "  - DB_NAME: ${DB_NAME:-fcc_001_db}"
    echo "  - PORT: ${PORT:-5001}"
    echo "  - WORKERS: ${WORKERS:-4}"
    echo ""
}

# =============================================================================
# Point d'entrée principal
# =============================================================================
main() {
    show_startup_info
    
    # Configuration des répertoires
    setup_directories
    
    # Si on utilise MariaDB/MySQL, attendre la connexion
    if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
        wait_for_db
        create_database_if_not_exists
    fi
    
    # Initialiser la base de données
    init_database
    
    log_success "Application prête à démarrer!"
    echo ""
    
    # Exécuter la commande passée en argument
    exec "$@"
}

# Exécuter le script principal
main "$@"

