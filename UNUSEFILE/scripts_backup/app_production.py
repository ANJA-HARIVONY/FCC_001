#!/usr/bin/env python3
"""
Application Flask en mode production
Usage: python app_production.py
"""

import os
import sys
import logging
from datetime import datetime
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_babel import Babel, gettext, ngettext, get_locale
from flask_migrate import Migrate
from sqlalchemy import func, extract
from production_config import ProductionConfig

# Configuration de l'application
app = Flask(__name__)
app.config.from_object(ProductionConfig)

# Initialisation des extensions
db = SQLAlchemy(app)
babel = Babel(app)
migrate = Migrate(app, db)

# Initialisation de la configuration de production
ProductionConfig.init_app(app)

# Import des modèles depuis l'application principale
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import Client, Operateur, Incident
    app.logger.info("Modèles importés avec succès")
except ImportError as e:
    app.logger.error(f"Erreur lors de l'import des modèles: {e}")
    sys.exit(1)

@babel.localeselector
def get_locale():
    """Sélection de la langue"""
    return request.accept_languages.best_match(app.config['LANGUAGES'].keys()) or 'fr'

@app.context_processor
def inject_conf_vars():
    """Injection de variables globales dans les templates"""
    return {
        'LANGUAGES': app.config['LANGUAGES'],
        'CURRENT_LANGUAGE': str(get_locale()),
        'VERSION': '1.0.0',
        'ENV': 'production'
    }

@app.before_request
def log_request_info():
    """Logging des requêtes en production"""
    if not app.debug:
        app.logger.info(f'{request.method} {request.url} - {request.remote_addr}')

@app.errorhandler(404)
def not_found_error(error):
    """Gestion des erreurs 404"""
    app.logger.warning(f'Page non trouvée: {request.url}')
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Gestion des erreurs 500"""
    db.session.rollback()
    app.logger.error(f'Erreur serveur: {error}')
    return render_template('errors/500.html'), 500

@app.errorhandler(Exception)
def handle_exception(e):
    """Gestion globale des exceptions"""
    app.logger.error(f'Exception non gérée: {e}', exc_info=True)
    return render_template('errors/500.html'), 500

# Routes principales
@app.route('/')
def dashboard():
    """Tableau de bord principal"""
    try:
        # Statistiques du mois en cours
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        total_clients = Client.query.count()
        total_operateurs = Operateur.query.count()
        
        incidents_ce_mois = Incident.query.filter(
            extract('month', Incident.date_heure) == current_month,
            extract('year', Incident.date_heure) == current_year
        ).count()
        
        # Statistiques par statut
        incidents_resolus = Incident.query.filter(
            Incident.status == 'Solucionada',
            extract('month', Incident.date_heure) == current_month,
            extract('year', Incident.date_heure) == current_year
        ).count()
        
        incidents_en_cours = Incident.query.filter(
            Incident.status.in_(['Tarea Creada', 'Pendiente']),
            extract('month', Incident.date_heure) == current_month,
            extract('year', Incident.date_heure) == current_year
        ).count()
        
        # Calcul du taux de résolution
        taux_resolution = round((incidents_resolus / incidents_ce_mois * 100) if incidents_ce_mois > 0 else 0, 1)
        
        app.logger.info(f'Dashboard: {total_clients} clients, {incidents_ce_mois} incidents ce mois')
        
        return render_template('dashboard.html',
                             total_clients=total_clients,
                             total_operateurs=total_operateurs,
                             incidents_ce_mois=incidents_ce_mois,
                             incidents_resolus=incidents_resolus,
                             incidents_en_cours=incidents_en_cours,
                             taux_resolution=taux_resolution)
                             
    except Exception as e:
        app.logger.error(f'Erreur dans dashboard: {e}')
        flash('Erreur lors du chargement du tableau de bord', 'error')
        return render_template('dashboard.html',
                             total_clients=0,
                             total_operateurs=0,
                             incidents_ce_mois=0,
                             incidents_resolus=0,
                             incidents_en_cours=0,
                             taux_resolution=0)

@app.route('/api/incidents-par-date')
def api_incidents_par_date():
    """API pour les données des graphiques"""
    try:
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        view_type = request.args.get('type', 'date')
        
        if view_type == 'datetime':
            # Afficher chaque incident avec sa date/heure exacte
            incidents = db.session.query(
                Incident.date_heure, func.count(Incident.id)
            ).filter(
                extract('month', Incident.date_heure) == current_month,
                extract('year', Incident.date_heure) == current_year
            ).group_by(Incident.date_heure).order_by(Incident.date_heure).all()
            
            return jsonify([{
                'date': datetime_obj.strftime('%d/%m %H:%M'), 
                'count': count
            } for datetime_obj, count in incidents])
            
        else:
            # Par défaut : grouper par date
            incidents = db.session.query(
                func.date(Incident.date_heure), func.count(Incident.id)
            ).filter(
                extract('month', Incident.date_heure) == current_month,
                extract('year', Incident.date_heure) == current_year
            ).group_by(func.date(Incident.date_heure)).order_by(func.date(Incident.date_heure)).all()
            
            return jsonify([{
                'date': date_obj.strftime('%d/%m'), 
                'count': count
            } for date_obj, count in incidents])
            
    except Exception as e:
        app.logger.error(f'Erreur dans API incidents par date: {e}')
        return jsonify([]), 500

@app.route('/health')
def health_check():
    """Point de contrôle de santé pour la production"""
    try:
        # Test de connexion à la base de données
        db.session.execute('SELECT 1')
        
        # Statistiques rapides
        clients_count = Client.query.count()
        incidents_count = Incident.query.count()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'clients': clients_count,
            'incidents': incidents_count,
            'version': '1.0.0'
        })
    except Exception as e:
        app.logger.error(f'Health check failed: {e}')
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/metrics')
def metrics():
    """Métriques pour monitoring"""
    try:
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        metrics_data = {
            'total_clients': Client.query.count(),
            'total_operateurs': Operateur.query.count(),
            'total_incidents': Incident.query.count(),
            'incidents_ce_mois': Incident.query.filter(
                extract('month', Incident.date_heure) == current_month,
                extract('year', Incident.date_heure) == current_year
            ).count(),
            'incidents_resolus_ce_mois': Incident.query.filter(
                Incident.status == 'Solucionada',
                extract('month', Incident.date_heure) == current_month,
                extract('year', Incident.date_heure) == current_year
            ).count(),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(metrics_data)
    except Exception as e:
        app.logger.error(f'Erreur metrics: {e}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Vérification de l'environnement de production
    app.logger.info("=== DÉMARRAGE EN MODE PRODUCTION ===")
    app.logger.info(f"Base de données: {app.config['SQLALCHEMY_DATABASE_URI']}")
    app.logger.info(f"Debug: {app.config['DEBUG']}")
    
    # Créer les tables si nécessaire
    with app.app_context():
        try:
            db.create_all()
            app.logger.info("Tables de base de données vérifiées")
        except Exception as e:
            app.logger.error(f"Erreur lors de la création des tables: {e}")
            sys.exit(1)
    
    # Démarrage du serveur en mode production
    app.run(
        host='0.0.0.0',  # Accessible depuis l'extérieur
        port=5001,
        debug=False,
        threaded=True,
        use_reloader=False
    ) 