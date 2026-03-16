#!/bin/bash

# Script d'installation pour FCC_001
# Système de gestion d'incidents

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

echo "📦 Installation de FCC_001 - Système de gestion d'incidents"
echo "============================================================"

# Vérifier que le script est exécuté depuis le bon répertoire
if [ ! -f "app.py" ]; then
    log_error "Fichier app.py non trouvé. Exécutez ce script depuis le répertoire de l'application."
    exit 1
fi

# Vérifier Python 3
log_info "Vérification de Python..."
if ! command -v python3 >/dev/null 2>&1; then
    log_error "Python 3 n'est pas installé. Installez Python 3.8 ou supérieur."
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
log_success "Python $PYTHON_VERSION détecté"

# Vérifier pip
if ! command -v pip3 >/dev/null 2>&1; then
    log_error "pip3 n'est pas installé. Installez pip pour Python 3."
    exit 1
fi

# Créer l'environnement virtuel
log_info "Création de l'environnement virtuel..."
if [ -d ".venv" ]; then
    log_warning "Environnement virtuel existant trouvé. Suppression..."
    rm -rf .venv
fi

python3 -m venv .venv
source .venv/bin/activate
log_success "Environnement virtuel créé et activé"

# Mettre à jour pip
log_info "Mise à jour de pip..."
pip install --upgrade pip

# Installer les dépendances
log_info "Installation des dépendances..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    log_success "Dépendances installées"
else
    log_error "Fichier requirements.txt non trouvé"
    exit 1
fi

# Créer les répertoires nécessaires
log_info "Création des répertoires..."
mkdir -p logs uploads static/uploads backups
log_success "Répertoires créés"

# Configurer les permissions
log_info "Configuration des permissions..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod 755 logs uploads static/uploads backups
log_success "Permissions configurées"

# Copier le fichier d'environnement
log_info "Configuration de l'environnement..."
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        log_warning "Fichier .env créé depuis env.example"
        log_warning "IMPORTANT: Configurez vos variables d'environnement dans .env"
    else
        log_error "Fichier env.example non trouvé"
        exit 1
    fi
else
    log_info "Fichier .env existant trouvé"
fi

# Vérifier la configuration de la base de données
log_info "Vérification de la configuration..."
source .env

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your-very-secret-key-here-change-me" ]; then
    log_error "ERREUR: SECRET_KEY doit être configurée dans .env"
    log_info "Générez une clé secrète avec: python3 -c 'import secrets; print(secrets.token_hex(32))'"
    exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your-database-password" ]; then
    log_error "ERREUR: DB_PASSWORD doit être configurée dans .env"
    exit 1
fi

log_success "Configuration validée"

# Tester la connexion à la base de données
log_info "Test de connexion à la base de données..."
if command -v mysql >/dev/null 2>&1; then
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
        log_success "Connexion à la base de données OK"
    else
        log_error "Impossible de se connecter à la base de données"
        log_info "Vérifiez vos paramètres dans .env"
        exit 1
    fi
else
    log_warning "Client MySQL non trouvé. Test de connexion ignoré."
fi

# Initialiser la base de données
log_info "Initialisation de la base de données..."
export FLASK_APP=app.py
export FLASK_ENV=development

if [ ! -d "migrations" ]; then
    log_info "Création des migrations..."
    flask db init
fi

log_info "Application des migrations..."
flask db upgrade

# Test de l'application
log_info "Test de l'application..."
python3 -c "from app import app; print('✅ Application OK')" || {
    log_error "Erreur lors du test de l'application"
    exit 1
}

# Créer un service systemd (optionnel)
if command -v systemctl >/dev/null 2>&1 && [ -w "/etc/systemd/system" ]; then
    log_info "Création du service systemd..."
    
    SERVICE_FILE="/etc/systemd/system/fcc001.service"
    CURRENT_DIR=$(pwd)
    USER=$(whoami)
    
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=FCC_001 - Sistema de gestion de incidencias
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$CURRENT_DIR
Environment=PATH=$CURRENT_DIR/.venv/bin
ExecStart=$CURRENT_DIR/scripts/start_production.sh
ExecStop=$CURRENT_DIR/scripts/stop_production.sh
ExecReload=$CURRENT_DIR/scripts/restart_production.sh
PIDFile=$CURRENT_DIR/gunicorn.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_success "Service systemd créé: $SERVICE_FILE"
    log_info "Pour démarrer automatiquement: sudo systemctl enable fcc001"
    log_info "Pour démarrer maintenant: sudo systemctl start fcc001"
else
    log_info "Systemd non disponible ou permissions insuffisantes. Service non créé."
fi

# Résumé de l'installation
echo ""
log_success "🎉 Installation terminée avec succès !"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Configurez vos variables dans .env si ce n'est pas fait"
echo "   2. Pour démarrer en production: ./scripts/start_production.sh"
echo "   3. Pour démarrer en développement: python3 app.py"
echo "   4. Accédez à l'application: http://localhost:5001"
echo ""
echo "🔧 Scripts disponibles:"
echo "   - ./scripts/start_production.sh    # Démarrer en production"
echo "   - ./scripts/stop_production.sh     # Arrêter le serveur"
echo "   - ./scripts/restart_production.sh  # Redémarrer le serveur"
echo "   - ./scripts/backup.sh              # Sauvegarder la base de données"
echo ""
echo "📁 Répertoires créés:"
echo "   - logs/         # Logs de l'application"
echo "   - uploads/      # Fichiers uploadés"
echo "   - backups/      # Sauvegardes"
echo ""
echo "📚 Documentation:"
echo "   - README.md pour plus d'informations"
echo "   - Logs en temps réel: tail -f logs/app.log"
echo ""

# Proposer de démarrer l'application
read -p "Voulez-vous démarrer l'application maintenant ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Démarrage de l'application en mode développement..."
    echo "Appuyez sur Ctrl+C pour arrêter"
    python3 app.py
fi 