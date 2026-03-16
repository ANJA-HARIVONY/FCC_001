#!/usr/bin/env python3
"""
Application Flask en mode production simplifié
Usage: python production_simple.py
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from flask import Flask

# Configuration d'environnement pour la production
os.environ['FLASK_ENV'] = 'production'

# Import de l'application principale
from app import app, db

# Configuration de production
app.config.update(
    DEBUG=False,
    TESTING=False,
    SECRET_KEY=os.environ.get('SECRET_KEY') or 'production-secret-key-2025',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SEND_FILE_MAX_AGE_DEFAULT=timedelta(hours=12)
)

# Configuration de logging pour la production
if not app.debug:
    # Créer le dossier logs
    os.makedirs('logs', exist_ok=True)
    
    # Configuration du logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
        handlers=[
            logging.FileHandler('logs/production.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    app.logger.setLevel(logging.INFO)
    app.logger.info('=== APPLICATION DÉMARRÉE EN PRODUCTION ===')

# Nouvelles routes pour la production
@app.route('/health')
def health_check():
    """Point de contrôle de santé"""
    try:
        from app import Client, Incident
        
        db.session.execute('SELECT 1')
        clients_count = Client.query.count()
        incidents_count = Incident.query.count()
        
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'clients': clients_count,
            'incidents': incidents_count,
            'version': '1.0.0'
        }
    except Exception as e:
        app.logger.error(f'Health check failed: {e}')
        return {'status': 'unhealthy', 'error': str(e)}, 500

@app.route('/production-info')
def production_info():
    """Informations de production"""
    return {
        'environment': 'production',
        'debug': app.debug,
        'testing': app.testing,
        'database_uri': app.config['SQLALCHEMY_DATABASE_URI'][:50] + '...',
        'timestamp': datetime.now().isoformat()
    }

if __name__ == '__main__':
    from datetime import datetime
    
    print("🚀 DÉMARRAGE APPLICATION EN PRODUCTION")
    print("=" * 45)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}")
    print(f"🗄️  Base de données: MariaDB")
    print(f"🔒 Mode sécurisé: Activé")
    print(f"🌐 URL: http://localhost:5001")
    print("=" * 45)
    
    # Créer les tables si nécessaire
    with app.app_context():
        try:
            db.create_all()
            app.logger.info("Tables de base de données vérifiées")
        except Exception as e:
            app.logger.error(f"Erreur base de données: {e}")
            sys.exit(1)
    
    # Démarrer en mode production
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        threaded=True
    ) 