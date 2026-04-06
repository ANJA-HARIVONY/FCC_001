#!/bin/bash

# Script de configuration initiale pour la production
# Système de gestion de clients CONNEXIA

echo "⚙️ Configuration pour la production locale"

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

echo "════════════════════════════════════════════════════════"
echo "🌟 CONFIGURATION SYSTÈME GESTION CLIENTS CONNEXIA"
echo "════════════════════════════════════════════════════════"

# 1. Créer l'environnement virtuel
log_info "Étape 1/8: Création de l'environnement virtuel..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    log_success "Environnement virtuel créé"
else
    log_warning "Environnement virtuel déjà existant"
fi

# Activer l'environnement virtuel
source .venv/bin/activate
log_success "Environnement virtuel activé"

# 2. Installer les dépendances
log_info "Étape 2/8: Installation des dépendances..."
pip install --upgrade pip
pip install -r requirements.txt
log_success "Dépendances installées"

# 3. Créer les répertoires nécessaires
log_info "Étape 3/8: Création des répertoires..."
mkdir -p logs
mkdir -p backups
mkdir -p uploads
log_success "Répertoires créés"

# 4. Configuration de la base de données
log_info "Étape 4/8: Configuration de la base de données..."
if [ ! -d "migrations" ]; then
    flask db init
    log_success "Base de données initialisée"
else
    log_warning "Migrations déjà existantes"
fi

flask db migrate -m "Configuration initiale pour production"
flask db upgrade
log_success "Base de données configurée"

# 5. Créer des données de test
log_info "Étape 5/8: Création de données de test..."
if [ -f "test_data.py" ]; then
    python3 test_data.py
    log_success "Données de test créées"
else
    log_warning "Script de données de test non trouvé"
fi

# 6. Rendre les scripts exécutables
log_info "Étape 6/8: Configuration des permissions..."
chmod +x start_production.sh
chmod +x backup.sh
chmod +x setup_production.sh
log_success "Permissions configurées"

# 7. Créer le fichier .env
log_info "Étape 7/8: Création du fichier de configuration..."
cat > .env << EOL
# Configuration pour la production locale
# Système de gestion de clients CONNEXIA

# Configuration Flask
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=connexia-gestion-client-secret-key-2024-production

# Configuration de la base de données
DATABASE_URL=sqlite:///gestion_client.db

# Configuration de l'application
DEBUG=False
TESTING=False

# Configuration des langues
LANGUAGES=fr,es,en
BABEL_DEFAULT_LOCALE=fr
BABEL_DEFAULT_TIMEZONE=UTC

# Configuration des logs
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Configuration du serveur
HOST=0.0.0.0
PORT=5001

# Configuration de sécurité
WTF_CSRF_ENABLED=True
SESSION_COOKIE_SECURE=False
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Configuration des uploads
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads

# Configuration PDF
PDF_ENABLED=True
WEASYPRINT_DPI=96
EOL

log_success "Fichier .env créé"

# 8. Test de l'installation
log_info "Étape 8/8: Test de l'installation..."
python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from app import app, db
    with app.app_context():
        print('✅ Application importée avec succès')
        print(f'✅ Base de données: {app.config[\"SQLALCHEMY_DATABASE_URI\"]}')
        print('✅ Configuration validée')
except Exception as e:
    print(f'❌ Erreur: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    log_success "Test d'installation réussi"
else
    log_error "Échec du test d'installation"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ CONFIGURATION TERMINÉE AVEC SUCCÈS"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🚀 Pour démarrer l'application :"
echo "   ./start_production.sh"
echo ""
echo "💾 Pour sauvegarder :"
echo "   ./backup.sh"
echo ""
echo "🌐 L'application sera accessible sur :"
echo "   http://localhost:5001"
echo ""
echo "📁 Structure du projet :"
echo "   ├── app.py                 # Application principale"
echo "   ├── gestion_client.db      # Base de données"
echo "   ├── .venv/                 # Environnement virtuel"
echo "   ├── logs/                  # Fichiers de logs"
echo "   ├── backups/               # Sauvegardes"
echo "   └── start_production.sh    # Script de démarrage"
echo ""
echo "════════════════════════════════════════════════════════" 