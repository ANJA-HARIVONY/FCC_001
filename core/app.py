from ast import Pass
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_babel import Babel, gettext, ngettext, lazy_gettext, get_locale
from datetime import datetime, timedelta
import os
import re
import logging
from logging.handlers import RotatingFileHandler
from sqlalchemy import func
from config import config
from io import BytesIO

# Import optionnel de weasyprint
WEASYPRINT_AVAILABLE = False
try:
    # Vérifier si WeasyPrint doit être désactivé via variable d'environnement
    if os.environ.get('WEASYPRINT_AVAILABLE', 'True').lower() != 'false':
        import weasyprint
        # Test de base pour vérifier que WeasyPrint fonctionne
        test_html = weasyprint.HTML(string='<html><body><h1>Test</h1></body></html>')
        test_html.write_pdf()
        WEASYPRINT_AVAILABLE = True
        print("✅ WeasyPrint disponible - Fonctionnalités PDF activées")
    else:
        print("⚠️  WeasyPrint désactivé via variable d'environnement")
except ImportError as e:
    WEASYPRINT_AVAILABLE = False
    print("⚠️  WeasyPrint non disponible. Les fonctionnalités PDF seront limitées.")
    print(f"   Erreur: {str(e)[:100]}...")
except Exception as e:
    WEASYPRINT_AVAILABLE = False
    print("⚠️  Erreur lors du chargement de WeasyPrint. PDF désactivé.")
    print(f"   Erreur: {str(e)[:100]}...")

# Créer l'application Flask avec chemins corrects
app = Flask(__name__, 
           template_folder='../presentation/templates',
           static_folder='../presentation/static')

# Configuration selon l'environnement
config_name = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[config_name])

# Tester la connexion MySQL et basculer vers SQLite si nécessaire
def setup_database_config():
    """Configure la base de données avec test de connexion MariaDB"""
    # Si on a une URI MySQL configurée, essayer de s'y connecter
    if 'mysql' in app.config.get('SQLALCHEMY_DATABASE_URI', '').lower():
        try:
            import pymysql
            
            # Extraire les paramètres de connexion depuis la configuration
            DB_HOST = os.environ.get('DB_HOST', 'localhost')
            DB_PORT = int(os.environ.get('DB_PORT', '3306'))
            DB_NAME = os.environ.get('DB_NAME', 'fcc_001_db')
            DB_USER = os.environ.get('DB_USER', 'root')
            DB_PASSWORD = os.environ.get('DB_PASSWORD', 'toor')
            
            print(f"🔄 Tentative de connexion à MariaDB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
            
            # Test de connexion direct
            connection = pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                charset='utf8mb4'
            )
            
            # Créer la base de données si elle n'existe pas
            with connection.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                print(f"✅ Base de données '{DB_NAME}' créée/vérifiée")
            
            connection.close()
            print("✅ Connexion MariaDB réussie - utilisation de MariaDB")
            return  # Garder la configuration MySQL
            
        except Exception as e:
            print(f"⚠️  Erreur de connexion à MariaDB: {e}")
            print("🔄 Basculement vers SQLite pour la démonstration...")
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fcc_001_demo.db'
    else:
        print("🔄 Aucune configuration MySQL trouvée - utilisation de SQLite...")
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fcc_001_demo.db'

# Configurer la base de données
setup_database_config()

# Configuration des logs pour la production
if config_name == 'production':
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('FCC_001 Application de gestion d\'incidents démarrée')

# Initialiser SQLAlchemy et migrations après configuration
db = SQLAlchemy(app)
migrate = Migrate(app, db)

babel = Babel(app)

def get_locale():
    # 1. Si une langue est forcée dans l'URL
    if request.args.get('lang'):
        session['language'] = request.args.get('lang')
    # 2. Si une langue est stockée en session
    if 'language' in session:
        return session['language']
    # 3. Sinon, utiliser la langue préférée du navigateur
    return request.accept_languages.best_match(app.config['LANGUAGES'].keys()) or app.config['BABEL_DEFAULT_LOCALE']

# Configuration du sélecteur de locale pour Babel
babel.init_app(app, locale_selector=get_locale)

@app.context_processor
def inject_conf_vars():
    return {
        'LANGUAGES': app.config['LANGUAGES'],
        'CURRENT_LANGUAGE': session.get('language', app.config['BABEL_DEFAULT_LOCALE']),
        'moment': datetime,
        'current_time': datetime.now().strftime('%d/%m/%Y à %H:%M'),
        'app_name': app.config.get('APP_NAME', 'FCC_001'),
        'app_version': app.config.get('APP_VERSION', '1.0.0')
    }

# Modèles de données
class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    telephone = db.Column(db.String(100), nullable=False)
    adresse = db.Column(db.String(200), nullable=False)
    ville = db.Column(db.String(100), nullable=False)
    ip_router = db.Column(db.String(50), nullable=True)
    ip_antea = db.Column(db.String(50), nullable=True)
    incidents = db.relationship('Incident', backref='client', lazy=True)

    def __repr__(self):
        return f'<Client {self.nom}>'

class Operateur(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    telephone = db.Column(db.String(20), nullable=False)
    incidents = db.relationship('Incident', backref='operateur', lazy=True)

    def __repr__(self):
        return f'<Operateur {self.nom}>'

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_client = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    intitule = db.Column(db.String(200), nullable=False)
    observations = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default='Pendiente')  # Résolut, En atente, Bitrix
    ref_bitrix = db.Column(db.String(10), nullable=True)  # Ref Bitrix (5 chiffres) - visible si status=Bitrix
    id_operateur = db.Column(db.Integer, db.ForeignKey('operateur.id'), nullable=False)
    date_heure = db.Column(db.DateTime, nullable=False, default=datetime.now)

    def __repr__(self):
        return f'<Incident {self.intitule}>'


def _extract_ref_bitrix(observations):
    """Extrait la ref Bitrix (5 chiffres) des observations. Prend la derniere si plusieurs."""
    if not observations or not str(observations).strip():
        return None
    obs = str(observations).strip()
    if re.match(r'^(\d{5})$', obs):
        return obs
    matches = re.findall(r'\b(\d{5})\b', obs)
    return matches[-1] if matches else None


# Statuts Bitrix24 (tasks.task.get) - en español + emoji
BITRIX_STATUS_LABELS = {
    '2': ('En espera de ejecución', '⏰'),
    '3': ('En curso', '🔄'),
    '4': ('En espera de control', '👀'),
    '5': ('Terminada', '✅'),
    '6': ('Aplazada', '⏸️'),
}


def _get_bitrix_task_info(api_base_url, task_id):
    """
    Appelle l'API Bitrix24 tasks.task.get.
    Retourne dict avec status_label, responsible_name, title ou {'error': msg}.
    """
    try:
        import urllib.request
        import json
        url = f"{api_base_url.rstrip('/')}/tasks.task.get"
        payload = {
            "taskId": int(task_id),
            "select": ["ID", "TITLE", "STATUS", "REAL_STATUS", "RESPONSIBLE_ID", "RESPONSIBLE"]
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url, data=data,
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        if 'error' in result:
            return {'error': result.get('error_description', result.get('error', 'Erreur inconnue'))}
        task_data = result.get('result', {}).get('task', {})
        if not task_data:
            return {'error': 'Tâche non trouvée ou accès refusé'}
        status = str(task_data.get('status', task_data.get('realStatus', task_data.get('STATUS', ''))))
        status_data = BITRIX_STATUS_LABELS.get(status, (f'Estado {status}', '📋'))
        status_label = status_data[0] if isinstance(status_data, tuple) else status_data
        status_emoji = status_data[1] if isinstance(status_data, tuple) else '📋'
        responsible_id = task_data.get('responsibleId', task_data.get('RESPONSIBLE_ID', ''))
        responsible = task_data.get('responsible', {})
        responsible_name = responsible.get('name', '') if isinstance(responsible, dict) else str(responsible)
        if not responsible_name and responsible_id:
            responsible_name = f"ID: {responsible_id}"
        return {
            'status_label': status_label,
            'status_emoji': status_emoji,
            'responsible_name': responsible_name or '(no definido)',
            'title': task_data.get('title', task_data.get('TITLE', '')),
        }
    except Exception as e:
        err_msg = str(e)
        # Capturer le corps de la réponse pour les erreurs HTTP (ex: 401)
        try:
            from urllib.error import HTTPError
            if isinstance(e, HTTPError):
                body = e.read().decode('utf-8', errors='ignore')
                data = json.loads(body) if body else {}
                if 'error_description' in data:
                    err_msg = data['error_description']
                elif 'error' in data:
                    err_msg = data.get('error_description', data.get('error', body[:200]))
                if e.code == 401:
                    err_msg += " — Verifique le webhook Bitrix24: Applications > Developer resources > Incoming webhook. Cochez la permission 'tasks'."
        except Exception:
            pass
        return {'error': err_msg}


class Etat(db.Model):
    """Modelo para almacenar los informes generados por IA"""
    __tablename__ = 'etat'
    
    # Clave primaria
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Información básica
    titre = db.Column(db.String(255), nullable=False, index=True)
    type_etat = db.Column(db.String(50), nullable=False, index=True)  # 'summary', 'analysis', 'trend', 'custom'
    
    # Período de análisis
    periode_debut = db.Column(db.Date, nullable=True, index=True)
    periode_fin = db.Column(db.Date, nullable=True, index=True)
    
    # Contenido IA y datos
    contenu_ia = db.Column(db.Text, nullable=True)  # Texto generado por IA (formato JSON string)
    graphiques_data = db.Column(db.Text, nullable=True)  # Datos para gráficos (JSON string)
    parametres = db.Column(db.Text, nullable=True)  # Parámetros de generación (JSON string)
    
    # Estado y gestión
    statut = db.Column(db.String(20), nullable=False, default='generated', index=True)  # 'generating', 'generated', 'error'
    utilisateur = db.Column(db.String(100), nullable=True)  # Usuario que generó el estado
    
    # Cache y rendimiento
    hash_cache = db.Column(db.String(64), nullable=True, index=True)  # Hash de los parámetros para cache
    
    # Marcas de tiempo
    date_creation = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)
    date_modification = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<Etat {self.titre}>'
    
    def to_dict(self):
        """Convertir el informe en diccionario para JSON"""
        return {
            'id': self.id,
            'titre': self.titre,
            'type_etat': self.type_etat,
            'periode_debut': self.periode_debut.isoformat() if self.periode_debut else None,
            'periode_fin': self.periode_fin.isoformat() if self.periode_fin else None,
            'statut': self.statut,
            'utilisateur': self.utilisateur,
            'date_creation': self.date_creation.isoformat(),
            'date_modification': self.date_modification.isoformat()
        }

# Importar las rutas de los informes IA
from core.routes import etats_routes

# Configurar filtros personalizados para templates
from core.utils import setup_template_filters
setup_template_filters(app)

# Route pour changer de langue
@app.route('/set_language/<language>')
def set_language(language=None):
    if language in app.config['LANGUAGES']:
        session['language'] = language
    return redirect(request.referrer or url_for('dashboard'))

# Routes principales
@app.route('/')
def dashboard():
    # Obtenir la période depuis les paramètres URL ou utiliser la valeur par défaut
    period = request.args.get('period', 'current_week')
    start_date, end_date = get_date_range_for_period(period)
    
    # Construire la requête selon la période
    query = Incident.query
    if start_date:
        query = query.filter(Incident.date_heure >= start_date)
    if end_date:
        query = query.filter(Incident.date_heure <= end_date)
    
    incidents_periode = query.all()
    
    total_incidents = len(incidents_periode)
    incidents_resolus = len([i for i in incidents_periode if i.status == 'Solucionadas'])
    incidents_attente = len([i for i in incidents_periode if i.status == 'Pendiente'])
    incidents_bitrix = len([i for i in incidents_periode if i.status == 'Bitrix'])
    
    # 5 derniers incidents
    derniers_incidents = Incident.query.order_by(Incident.date_heure.desc()).limit(5).all()
    
    # Données pour les graphiques selon la période
    operateurs_query = db.session.query(
        Operateur.nom, func.count(Incident.id)
    ).join(Incident)
    
    if start_date:
        operateurs_query = operateurs_query.filter(Incident.date_heure >= start_date)
    if end_date:
        operateurs_query = operateurs_query.filter(Incident.date_heure <= end_date)
    
    incidents_par_operateur_raw = operateurs_query.group_by(Operateur.nom).all()
    
    # Convertir en liste de listes pour la sérialisation JSON
    incidents_par_operateur = [[nom, count] for nom, count in incidents_par_operateur_raw]
    
    # Obtenir les 5 clients avec le plus d'incidents dans la période
    clients_recurrents_query = db.session.query(
        Client.id,
        Client.nom,
        Client.adresse,
        func.count(Incident.id).label('incidents'),
        func.max(Incident.intitule).label('intitule'),
        func.max(Incident.date_heure).label('date_heure')
    ).join(Incident)
    
    if start_date:
        clients_recurrents_query = clients_recurrents_query.filter(Incident.date_heure >= start_date)
    if end_date:
        clients_recurrents_query = clients_recurrents_query.filter(Incident.date_heure <= end_date)
    
    clients_recurrents = clients_recurrents_query.group_by(Client.id, Client.nom, Client.adresse).order_by(
        func.count(Incident.id).desc()
    ).limit(5).all()
    
    return render_template('dashboard.html',
                         total_incidents=total_incidents,
                         incidents_resolus=incidents_resolus,
                         incidents_attente=incidents_attente,
                         incidents_bitrix=incidents_bitrix,
                         derniers_incidents=derniers_incidents,
                         incidents_par_operateur=incidents_par_operateur,
                         clients_recurrents=clients_recurrents,
                         current_period=period)

@app.route('/recherche')
def recherche():
    query = request.args.get('q', '')
    if query:
        # Recherche dans les clients et incidents
        clients = Client.query.filter(Client.nom.contains(query)).all()
        incidents = Incident.query.filter(Incident.intitule.contains(query)).all()
        return render_template('recherche.html', clients=clients, incidents=incidents, query=query)
    return redirect(url_for('dashboard'))

@app.route('/edition')
def edition():
    return render_template('edition.html')

@app.route('/aide')
def aide():
    try:
        from sqlalchemy import text
        result = db.session.execute(text("SELECT VERSION()"))
        mariadb_version = result.fetchone()[0]
    except Exception as e:
        mariadb_version = "Version non disponible"
        print(f"Erreur lors de la récupération de la version: {e}")
    return render_template('aide.html', mariadb_version=mariadb_version)

# Routes CRUD pour les clients
@app.route('/clients')
def clients():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    sort_by = request.args.get('sort', 'id')
    sort_order = request.args.get('order', 'desc')
    
    # Filtres optionnels
    search_query = request.args.get('search', '')
    ville_filter = request.args.get('ville', '')
    
    # Construction de la requête de base
    query = Client.query
    
    # Appliquer les filtres
    if search_query:
        query = query.filter(
            db.or_(
                Client.nom.contains(search_query),
                Client.telephone.contains(search_query),
                Client.adresse.contains(search_query),
                Client.ville.contains(search_query),
                Client.ip_router.contains(search_query),
                Client.ip_antea.contains(search_query)
            )
        )
    
    if ville_filter:
        query = query.filter(Client.ville.contains(ville_filter))
    
    # Appliquer le tri
    if sort_by == 'id':
        query = query.order_by(
            Client.id.asc() if sort_order == 'asc' else Client.id.desc()
        )
    elif sort_by == 'nombre':
        query = query.order_by(
            Client.nom.asc() if sort_order == 'asc' else Client.nom.desc()
        )
    elif sort_by == 'direccion':
        query = query.order_by(
            Client.adresse.asc() if sort_order == 'asc' else Client.adresse.desc()
        )
    elif sort_by == 'incidents':
        # Tri par nombre d'incidents
        query = query.outerjoin(Incident).group_by(Client.id).order_by(
            func.count(Incident.id).asc() if sort_order == 'asc' else func.count(Incident.id).desc()
        )
    
    # Pagination
    clients_paginated = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    # Obtenir la liste des villes pour le filtre
    villes = db.session.query(Client.ville).distinct().order_by(Client.ville).all()
    villes_list = [ville[0] for ville in villes if ville[0]]
    
    return render_template('clients.html', 
                         clients=clients_paginated,
                         search_query=search_query,
                         ville_filter=ville_filter,
                         villes_list=villes_list,
                         per_page=per_page,
                         sort_by=sort_by,
                         sort_order=sort_order)

@app.route('/clients/nouveau', methods=['GET', 'POST'])
def nouveau_client():
    if request.method == 'POST':
        client = Client(
            nom=request.form['nom'],
            telephone=request.form['telephone'],
            adresse=request.form['adresse'],
            ville=request.form['ville'],
            ip_router=request.form['ip_router'],
            ip_antea=request.form['ip_antea']
        )
        db.session.add(client)
        db.session.commit()
        flash(gettext('Cliente creado con éxito!'), 'success')
        return redirect(url_for('clients'))
    return render_template('nouveau_client.html')

@app.route('/clients/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_client(id):
    client = Client.query.get_or_404(id)
    next_url = request.args.get('next', url_for('clients'))
    
    if request.method == 'POST':
        client.nom = request.form['nom']
        client.telephone = request.form['telephone']
        client.adresse = request.form['adresse']
        client.ville = request.form['ville']
        client.ip_router = request.form['ip_router']
        client.ip_antea = request.form['ip_antea']
        db.session.commit()
        flash(gettext('Cliente modificado con éxito!'), 'success')
        return redirect(next_url)
    
    return render_template('modifier_client.html', client=client, next_url=next_url)

@app.route('/clients/<int:id>/supprimer', methods=['POST'])
def supprimer_client(id):
    client = Client.query.get_or_404(id)
    db.session.delete(client)
    db.session.commit()
    flash(gettext('Cliente eliminado con éxito!'), 'success')
    return redirect(url_for('clients'))

# Nouvelle route pour la fiche client détaillée
@app.route('/clients/<int:id>/fiche')
def fiche_client(id):
    client = Client.query.get_or_404(id)
    incidents = Incident.query.filter_by(id_client=id).order_by(Incident.date_heure.desc()).all()
    return render_template('fiche_client.html', client=client, incidents=incidents)

# Nouvelle route pour imprimer la fiche client en PDF
@app.route('/clients/<int:id>/imprimer')
def imprimer_fiche_client(id):
    client = Client.query.get_or_404(id)
    incidents = Incident.query.filter_by(id_client=id).order_by(Incident.date_heure.desc()).all()
    
    # Pour l'instant, rediriger vers la version HTML pour éviter les problèmes WeasyPrint
    flash(gettext('Generación de PDF temporalmente desactivada. Utilice la impresión del navegador (Ctrl+P).'), 'info')
    return redirect(url_for('fiche_client_print', id=id))

# Route alternative pour l'impression via le navigateur
@app.route('/clients/<int:id>/imprimer-html')
def fiche_client_print(id):
    client = Client.query.get_or_404(id)
    incidents = Incident.query.filter_by(id_client=id).order_by(Incident.date_heure.desc()).all()
    return render_template('fiche_client_pdf.html', client=client, incidents=incidents)

# Route pour vérifier la connectivité du client (ping)
@app.route('/clients/<int:id>/verificar')
def verificar_cliente(id):
    import subprocess
    import platform
    import re
    
    client = Client.query.get_or_404(id)
    
    # Fonction pour effectuer un ping
    def ping_ip(ip_address, count=10):
        if not ip_address:
            return {
                'success': False,
                'ip': ip_address,
                'error': 'IP no configurada',
                'packets_sent': 0,
                'packets_received': 0,
                'packets_lost': 0,
                'packet_loss': 100,
                'min_time': 0,
                'avg_time': 0,
                'max_time': 0,
                'raw_output': ''
            }
        
        try:
            # Détecter le système d'exploitation
            param = '-n' if platform.system().lower() == 'windows' else '-c'
            
            # Exécuter le ping
            command = ['ping', param, str(count), ip_address]
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=30,
                encoding='utf-8',
                errors='ignore'
            )
            
            output = result.stdout
            
            # Parser les résultats selon le système
            if platform.system().lower() == 'windows':
                # Parser pour Windows
                packets_sent = count
                packets_received = 0
                packets_lost = 0
                packet_loss = 100
                min_time = 0
                avg_time = 0
                max_time = 0
                
                # Chercher les paquets reçus
                received_match = re.search(r'Recibidos = (\d+)', output)
                if not received_match:
                    received_match = re.search(r'Received = (\d+)', output)
                
                if received_match:
                    packets_received = int(received_match.group(1))
                    packets_lost = packets_sent - packets_received
                    packet_loss = (packets_lost / packets_sent) * 100
                
                # Chercher les temps min/max/avg
                time_match = re.search(r'M[ií]nimo = (\d+)ms.*M[áa]ximo = (\d+)ms.*Media = (\d+)ms', output)
                if not time_match:
                    time_match = re.search(r'Minimum = (\d+)ms.*Maximum = (\d+)ms.*Average = (\d+)ms', output)
                
                if time_match:
                    min_time = int(time_match.group(1))
                    max_time = int(time_match.group(2))
                    avg_time = int(time_match.group(3))
                
            else:
                # Parser pour Linux/Unix
                packets_sent = count
                packets_received = 0
                packets_lost = 0
                packet_loss = 100
                
                received_match = re.search(r'(\d+) received', output)
                if received_match:
                    packets_received = int(received_match.group(1))
                    packets_lost = packets_sent - packets_received
                    packet_loss = (packets_lost / packets_sent) * 100
                
                time_match = re.search(r'min/avg/max.*= ([\d.]+)/([\d.]+)/([\d.]+)', output)
                if time_match:
                    min_time = float(time_match.group(1))
                    avg_time = float(time_match.group(2))
                    max_time = float(time_match.group(3))
                else:
                    min_time = 0
                    avg_time = 0
                    max_time = 0
            
            return {
                'success': packets_received > 0,
                'ip': ip_address,
                'packets_sent': packets_sent,
                'packets_received': packets_received,
                'packets_lost': packets_lost,
                'packet_loss': round(packet_loss, 2),
                'min_time': min_time,
                'avg_time': avg_time,
                'max_time': max_time,
                'raw_output': output
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'ip': ip_address,
                'error': 'Timeout - El ping tardó demasiado',
                'packets_sent': count,
                'packets_received': 0,
                'packets_lost': count,
                'packet_loss': 100,
                'min_time': 0,
                'avg_time': 0,
                'max_time': 0,
                'raw_output': ''
            }
        except Exception as e:
            return {
                'success': False,
                'ip': ip_address,
                'error': str(e),
                'packets_sent': count,
                'packets_received': 0,
                'packets_lost': count,
                'packet_loss': 100,
                'min_time': 0,
                'avg_time': 0,
                'max_time': 0,
                'raw_output': ''
            }
    
    # Effectuer les pings
    resultado_router = ping_ip(client.ip_router, 10)
    resultado_antena = ping_ip(client.ip_antea, 10)
    
    # Retourner JSON si requête AJAX (pour modal)
    if request.headers.get('Accept', '').find('application/json') != -1 or request.args.get('format') == 'json':
        return jsonify({
            'client': {
                'id': client.id,
                'nom': client.nom,
                'adresse': client.adresse or '',
                'ville': client.ville or ''
            },
            'resultado_router': resultado_router,
            'resultado_antena': resultado_antena
        })
    
    return render_template('result_check_client.html', 
                         client=client,
                         resultado_router=resultado_router,
                         resultado_antena=resultado_antena)

# Routes CRUD pour les opérateurs
@app.route('/operateurs')
def operateurs():
    operateurs = Operateur.query.all()
    return render_template('operateurs.html', operateurs=operateurs)

@app.route('/operateurs/nouveau', methods=['GET', 'POST'])
def nouveau_operateur():
    if request.method == 'POST':
        operateur = Operateur(
            nom=request.form['nom'],
            telephone=request.form['telephone']
        )
        db.session.add(operateur)
        db.session.commit()
        flash(gettext('Operador creado con éxito!'), 'success')
        return redirect(url_for('operateurs'))
    return render_template('nouveau_operateur.html')

@app.route('/operateurs/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_operateur(id):
    operateur = Operateur.query.get_or_404(id)
    if request.method == 'POST':
        operateur.nom = request.form['nom']
        operateur.telephone = request.form['telephone']
        db.session.commit()
        flash(gettext('Operador modificado con éxito!'), 'success')
        return redirect(url_for('operateurs'))
    return render_template('modifier_operateur.html', operateur=operateur)

@app.route('/operateurs/<int:id>/supprimer', methods=['POST'])
def supprimer_operateur(id):
    operateur = Operateur.query.get_or_404(id)
    db.session.delete(operateur)
    db.session.commit()
    flash(gettext('Operador eliminado con éxito!'), 'success')
    return redirect(url_for('operateurs'))

# Routes CRUD pour les incidents
@app.route('/incidents')
def incidents():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    sort_by = request.args.get('sort', 'fecha')
    sort_order = request.args.get('order', 'desc')
    
    # Filtres optionnels
    status_filter = request.args.get('status', '')
    search_query = request.args.get('search', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    operateur_filter = request.args.get('operateur', '', type=str)
    
    # Construction de la requête de base
    query = Incident.query
    
    # Appliquer les filtres
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    
    if operateur_filter:
        try:
            operateur_id = int(operateur_filter)
            query = query.filter(Incident.id_operateur == operateur_id)
        except (ValueError, TypeError):
            operateur_filter = ''
    
    if search_query:
        query = query.join(Client).filter(
            db.or_(
                Incident.intitule.contains(search_query),
                Incident.observations.contains(search_query),
                Client.nom.contains(search_query)
            )
        )
    
    # Filtres par date
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(Incident.date_heure >= date_from_obj)
        except ValueError:
            flash('Formato de fecha inválido para "Fecha desde"', 'warning')
            date_from = ''
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            # Ajouter 23:59:59 pour inclure toute la journée
            date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
            query = query.filter(Incident.date_heure <= date_to_obj)
        except ValueError:
            flash('Formato de fecha inválido para "Fecha hasta"', 'warning')
            date_to = ''
    
    # Appliquer le tri
    if sort_by == 'client':
        query = query.join(Client).order_by(
            Client.nom.asc() if sort_order == 'asc' else Client.nom.desc()
        )
    elif sort_by == 'asunto':
        query = query.order_by(
            Incident.intitule.asc() if sort_order == 'asc' else Incident.intitule.desc()
        )
    elif sort_by == 'operador':
        query = query.join(Operateur).order_by(
            Operateur.nom.asc() if sort_order == 'asc' else Operateur.nom.desc()
        )
    elif sort_by == 'fecha':
        query = query.order_by(
            Incident.date_heure.asc() if sort_order == 'asc' else Incident.date_heure.desc()
        )
    
    # Pagination
    incidents_paginated = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    # Liste des opérateurs pour le filtre
    operateurs = Operateur.query.order_by(Operateur.nom).all()
    
    return render_template('incidents.html', 
                         incidents=incidents_paginated,
                         status_filter=status_filter,
                         search_query=search_query,
                         date_from=date_from,
                         date_to=date_to,
                         operateur_filter=operateur_filter,
                         operateurs=operateurs,
                         per_page=per_page,
                         sort_by=sort_by,
                         sort_order=sort_order)

@app.route('/incidents/nouveau', methods=['GET', 'POST'])
def nouveau_incident():
    if request.method == 'POST':
        incident = Incident(
            id_client=request.form['id_client'],
            intitule=request.form['intitule'],
            observations=request.form['observations'],
            status=request.form['status'],
            id_operateur=request.form['id_operateur']
        )
        if request.form.get('status') == 'Bitrix':
            ref = request.form.get('ref_bitrix', '').strip()[:10]
            if not ref:
                ref = _extract_ref_bitrix(request.form.get('observations'))
            incident.ref_bitrix = ref or None
        db.session.add(incident)
        db.session.commit()
        flash(gettext('Incidencia creada con éxito!'), 'success')
        return redirect(url_for('incidents'))
    
    clients = Client.query.all()
    operateurs = Operateur.query.all()
    return render_template('nouveau_incident.html', clients=clients, operateurs=operateurs)

@app.route('/incidents/<int:id>/fiche_incident')
def fiche_incident(id):
    incident = Incident.query.get_or_404(id)
    bitrix_info = None
    if incident.status == 'Bitrix' and incident.ref_bitrix and str(incident.ref_bitrix).strip():
        api_url = os.environ.get('BITRIX24_API', '').strip()
        if api_url:
            bitrix_info = _get_bitrix_task_info(api_url, incident.ref_bitrix.strip())
    return render_template('fiche_incident.html', incident=incident, bitrix_info=bitrix_info)


@app.route('/api/incidents/<int:id>/bitrix-info')
def api_incident_bitrix_info(id):
    """API pour récupérer les infos Bitrix d'un incident (AJAX)."""
    incident = Incident.query.get_or_404(id)
    if incident.status != 'Bitrix' or not incident.ref_bitrix or not str(incident.ref_bitrix).strip():
        return jsonify({'ok': False, 'error': 'Incident non Bitrix ou sans ref_bitrix'}), 400
    api_url = os.environ.get('BITRIX24_API', '').strip()
    if not api_url:
        return jsonify({'ok': False, 'error': 'BITRIX24_API non configurée'}), 500
    info = _get_bitrix_task_info(api_url, incident.ref_bitrix.strip())
    if 'error' in info:
        return jsonify({'ok': False, 'error': info['error']}), 200
    return jsonify({'ok': True, 'data': info}), 200


@app.route('/incidents/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_incident(id):
    incident = Incident.query.get_or_404(id)
    next_url = request.args.get('next', url_for('incidents'))
    
    if request.method == 'POST':
        incident.id_client = request.form['id_client']
        incident.intitule = request.form['intitule']
        incident.observations = request.form['observations']
        incident.status = request.form['status']
        incident.id_operateur = request.form['id_operateur']
        if request.form.get('status') == 'Bitrix':
            ref = request.form.get('ref_bitrix', '').strip()[:10]
            if not ref:
                ref = _extract_ref_bitrix(request.form.get('observations'))
            incident.ref_bitrix = ref or None
        else:
            incident.ref_bitrix = None
        db.session.commit()
        flash(gettext('Incidencia modificada con éxito!'), 'success')
        return redirect(next_url)
    
    clients = Client.query.all()
    operateurs = Operateur.query.all()
    ref_bitrix_display = incident.ref_bitrix or (_extract_ref_bitrix(incident.observations) if incident.status == 'Bitrix' else '')
    return render_template('modifier_incident.html', incident=incident, clients=clients, operateurs=operateurs, next_url=next_url, ref_bitrix_display=ref_bitrix_display)

@app.route('/incidents/<int:id>/supprimer', methods=['POST'])
def supprimer_incident(id):
    incident = Incident.query.get_or_404(id)
    db.session.delete(incident)
    db.session.commit()
    flash(gettext('Incidencia eliminada con éxito!'), 'success')
    return redirect(url_for('incidents'))

# API pour les données des clients (pour l'auto-complétion)
@app.route('/api/clients-search')
def api_clients_search():
    """API pour la recherche de clients avec auto-complétion"""
    clients = Client.query.all()
    clients_data = []
    
    for client in clients:
        clients_data.append({
            'id': client.id,
            'nom': client.nom,
            'telephone': client.telephone,
            'ville': client.ville,
            'adresse': client.adresse,
            'ip_router': client.ip_router,
            'ip_antea': client.ip_antea
        })
    
    return jsonify(clients_data)

# API pour les données du dashboard selon la période
@app.route('/dashboard-data')
def dashboard_data():
    """API pour récupérer les données du dashboard selon la période"""
    period = request.args.get('period', 'current_week')
    start_date, end_date = get_date_range_for_period(period)
    
    # Construire la requête selon la période
    query = Incident.query
    if start_date:
        query = query.filter(Incident.date_heure >= start_date)
    if end_date:
        query = query.filter(Incident.date_heure <= end_date)
    
    incidents_periode = query.all()
    
    # Calculer les statistiques
    total_incidents = len(incidents_periode)
    incidents_resolus = len([i for i in incidents_periode if i.status == 'Solucionadas'])
    incidents_attente = len([i for i in incidents_periode if i.status == 'Pendiente'])
    incidents_bitrix = len([i for i in incidents_periode if i.status == 'Bitrix'])
    
    # 5 derniers incidents de la période
    derniers_query = Incident.query
    if start_date:
        derniers_query = derniers_query.filter(Incident.date_heure >= start_date)
    if end_date:
        derniers_query = derniers_query.filter(Incident.date_heure <= end_date)
    
    derniers_incidents = derniers_query.order_by(Incident.date_heure.desc()).limit(5).all()
    
    # Formater les derniers incidents pour l'API
    derniers_incidents_data = []
    for incident in derniers_incidents:
        derniers_incidents_data.append({
            'id': incident.id,
            'intitule': incident.intitule,
            'status': incident.status,
            'client_nom': incident.client.nom,
            'operateur_nom': incident.operateur.nom,
            'date_heure_formatted': incident.date_heure.strftime('%d/%m/%Y %H:%M')
        })
    
    # Données par opérateur pour la période
    operateurs_query = db.session.query(
        Operateur.nom, func.count(Incident.id)
    ).join(Incident)
    
    if start_date:
        operateurs_query = operateurs_query.filter(Incident.date_heure >= start_date)
    if end_date:
        operateurs_query = operateurs_query.filter(Incident.date_heure <= end_date)
    
    incidents_par_operateur_raw = operateurs_query.group_by(Operateur.nom).all()
    incidents_par_operateur = [[nom, count] for nom, count in incidents_par_operateur_raw]
    
    # Obtenir les 5 clients avec le plus d'incidents dans la période
    clients_recurrents_query = db.session.query(
        Client.id,
        Client.nom,
        Client.adresse,
        func.count(Incident.id).label('incidents'),
        func.max(Incident.intitule).label('intitule'),
        func.max(Incident.date_heure).label('date_heure')
    ).join(Incident)
    
    if start_date:
        clients_recurrents_query = clients_recurrents_query.filter(Incident.date_heure >= start_date)
    if end_date:
        clients_recurrents_query = clients_recurrents_query.filter(Incident.date_heure <= end_date)
    
    clients_recurrents_raw = clients_recurrents_query.group_by(Client.id, Client.nom, Client.adresse).order_by(
        func.count(Incident.id).desc()
    ).limit(5).all()
    
    # Formater les clients récurrents pour l'API
    clients_recurrents_data = []
    for client_id, nom, adresse, incidents, intitule, date_heure in clients_recurrents_raw:
        clients_recurrents_data.append({
            'id': client_id,
            'nom': nom,
            'adresse': adresse if adresse else '',
            'incidents': incidents,
            'intitule': intitule if intitule else '',
            'date_heure_formatted': date_heure.strftime('%d/%m/%Y %H:%M') if date_heure else ''
        })
    
    return jsonify({
        'total_incidents': total_incidents,
        'incidents_resolus': incidents_resolus,
        'incidents_attente': incidents_attente,
        'incidents_bitrix': incidents_bitrix,
        'derniers_incidents': derniers_incidents_data,
        'incidents_par_operateur': incidents_par_operateur,
        'clients_recurrents': clients_recurrents_data
    })

# API pour les notifications d'incidents pendientes
@app.route('/api/incidents-pendientes')
def api_incidents_pendientes():
    """API para obtener incidencias pendientes de más de 30 minutos"""
    try:
        # Calcular la fecha límite (30 minutos atrás)
        limite_tiempo = datetime.now() - timedelta(minutes=30)
        
        # Buscar incidencias pendientes de más de 30 minutos
        incidents_pendientes = db.session.query(Incident, Client, Operateur)\
            .join(Client, Incident.id_client == Client.id)\
            .join(Operateur, Incident.id_operateur == Operateur.id)\
            .filter(Incident.status == 'Pendiente')\
            .filter(Incident.date_heure <= limite_tiempo)\
            .all()
        
        # Formatear los datos para la respuesta
        notifications = []
        for incident, client, operateur in incidents_pendientes:
            tiempo_transcurrido = datetime.now() - incident.date_heure
            horas = int(tiempo_transcurrido.total_seconds() // 3600)
            minutos = int((tiempo_transcurrido.total_seconds() % 3600) // 60)
            
            notifications.append({
                'id': incident.id,
                'intitule': incident.intitule,
                'client_nom': client.nom,
                'operateur_nom': operateur.nom,
                'tiempo_transcurrido': f"{horas}h {minutos}m",
                'fecha_creacion': incident.date_heure.strftime('%d/%m/%Y %H:%M')
            })
        
        return jsonify({
            'success': True,
            'count': len(notifications),
            'notifications': notifications
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'notifications': []
        }), 500

# API pour les données des graphiques
@app.route('/api/incidents-par-date')
def api_incidents_par_date():
    """API pour les données des graphiques selon la période"""
    period = request.args.get('period', 'current_week')
    start_date, end_date = get_date_range_for_period(period)
    
    # Paramètre pour choisir le type d'affichage
    view_type = request.args.get('type', 'date')  # 'date', 'month', 'year'
    
    # Construire la requête de base
    base_filter = []
    if start_date:
        base_filter.append(Incident.date_heure >= start_date)
    if end_date:
        base_filter.append(Incident.date_heure <= end_date)
    
    if view_type == 'month':
        # Grouper par mois - compatible MySQL/MariaDB
        query = db.session.query(
            func.date_format(Incident.date_heure, '%Y-%m-01'), func.count(Incident.id)
        )
        if base_filter:
            query = query.filter(*base_filter)
        
        incidents = query.group_by(
            func.date_format(Incident.date_heure, '%Y-%m-01')
        ).order_by(
            func.date_format(Incident.date_heure, '%Y-%m-01')
        ).all()
        
        return jsonify([{
            'date': datetime.strptime(date_str, '%Y-%m-%d').strftime('%m/%Y'), 
            'count': count
        } for date_str, count in incidents])
        
    elif view_type == 'year':
        # Grouper par année - compatible MySQL/MariaDB
        query = db.session.query(
            func.date_format(Incident.date_heure, '%Y-01-01'), func.count(Incident.id)
        )
        if base_filter:
            query = query.filter(*base_filter)
        
        incidents = query.group_by(
            func.date_format(Incident.date_heure, '%Y-01-01')
        ).order_by(
            func.date_format(Incident.date_heure, '%Y-01-01')
        ).all()
        
        return jsonify([{
            'date': datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y'), 
            'count': count
        } for date_str, count in incidents])
        
    else:
        # Par défaut : grouper par date
        query = db.session.query(
            func.date(Incident.date_heure), func.count(Incident.id)
        )
        if base_filter:
            query = query.filter(*base_filter)
        
        incidents = query.group_by(func.date(Incident.date_heure)).order_by(func.date(Incident.date_heure)).all()
        
        return jsonify([{
            'date': date_obj.strftime('%d/%m'), 
            'count': count
        } for date_obj, count in incidents])

def get_date_range_for_period(period):
    """Retourne les dates de début et fin selon la période sélectionnée"""
    today = datetime.now()
    
    if period == 'current_month':
        # Premier jour du mois en cours
        start_date = datetime(today.year, today.month, 1)
        return start_date, None
        
    elif period == 'current_week':
        # Début de la semaine (lundi) MAIS limité au mois en cours
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        week_start = datetime(week_start.year, week_start.month, week_start.day)
        
        # Premier jour du mois en cours
        month_start = datetime(today.year, today.month, 1)
        
        # Prendre le plus récent entre le début de semaine et le début du mois
        # Cela évite que la semaine inclue des jours du mois précédent
        start_date = max(week_start, month_start)
        return start_date, None
        
    elif period == 'last_week':
        # Semaine précédente (du lundi au dimanche)
        days_since_monday = today.weekday()
        current_week_start = today - timedelta(days=days_since_monday)
        last_week_start = current_week_start - timedelta(days=7)
        last_week_end = current_week_start - timedelta(days=1)
        start_date = datetime(last_week_start.year, last_week_start.month, last_week_start.day)
        end_date = datetime(last_week_end.year, last_week_end.month, last_week_end.day, 23, 59, 59)
        return start_date, end_date
        
    elif period == 'last_month':
        # Mois précédent
        if today.month == 1:
            start_date = datetime(today.year - 1, 12, 1)
            end_date = datetime(today.year, 1, 1) - timedelta(days=1)
        else:
            start_date = datetime(today.year, today.month - 1, 1)
            end_date = datetime(today.year, today.month, 1) - timedelta(days=1)
        return start_date, end_date
        
    elif period == 'last_3_months':
        # 3 derniers mois
        start_date = today - timedelta(days=90)
        return start_date, None
        
    elif period == 'last_6_months':
        # 6 derniers mois
        start_date = today - timedelta(days=180)
        return start_date, None
        
    elif period == 'current_year':
        # Année en cours
        start_date = datetime(today.year, 1, 1)
        return start_date, None
        
    elif period == 'all_data':
        # Toutes les données
        return None, None
        
    else:
        # Par défaut : 3 derniers mois
        start_date = today - timedelta(days=90)
        return start_date, None

def create_sample_data():
    """Créer des données d'exemple si la base est vide"""
    if Client.query.count() == 0:
        print("📊 Création de données d'exemple...")
        
        # Créer des opérateurs
        op1 = Operateur(nom="Carlos Rodriguez", telephone="555-0101")
        op2 = Operateur(nom="María González", telephone="555-0102")
        op3 = Operateur(nom="José Martínez", telephone="555-0103")
        
        db.session.add_all([op1, op2, op3])
        db.session.commit()
        
        # Créer des clients
        clients_data = [
            ("Empresa ABC", "555-1001", "Av. Principal 123", "Madrid", "192.168.1.1", "10.0.0.1"),
            ("Comercial XYZ", "555-1002", "Calle Segunda 456", "Barcelona", "192.168.1.2", "10.0.0.2"),
            ("Industrias DEF", "555-1003", "Plaza Central 789", "Valencia", "192.168.1.3", "10.0.0.3"),
        ]
        
        clients = []
        for nom, tel, addr, ville, ip_router, ip_antea in clients_data:
            client = Client(nom=nom, telephone=tel, adresse=addr, ville=ville, ip_router=ip_router, ip_antea=ip_antea)
            clients.append(client)
            db.session.add(client)
        
        db.session.commit()
        
        # Créer des incidents d'exemple
        import random
        statuses = ['Solucionadas', 'Pendiente', 'Bitrix']
        incidents_data = [
            "Problema de conectividad",
            "Error en el sistema de facturación", 
            "Lentitud en la red",
            "Caída del servidor principal",
            "Problemas con email corporativo",
            "Actualización de software requerida",
            "Backup no completado",
            "Error en base de datos",
            "Configuración de firewall",
            "Mantenimiento preventivo"
        ]
        
        for i in range(50):  # Crear 50 incidents d'exemple
            incident = Incident(
                id_client=random.choice(clients).id,
                intitule=random.choice(incidents_data),
                observations=f"Observaciones del incidente {i+1}",
                status=random.choice(statuses),
                id_operateur=random.choice([op1.id, op2.id, op3.id]),
                date_heure=datetime.now() - timedelta(days=random.randint(0, 90))
            )
            db.session.add(incident)
        
        db.session.commit()
        print("✅ Données d'exemple créées avec succès!")

def export_to_sql_data():
    # TODO: Crear la función para exportar los datos en un formato backup_<fecha_hora>.sql
    Pass

if __name__ == '__main__':
    # Créer les tables et données d'exemple
    with app.app_context():
        try:
            print(f"📊 Utilisation de la base: {app.config['SQLALCHEMY_DATABASE_URI']}")
            db.create_all()
            create_sample_data()
            print("✅ Base de données initialisée avec succès")
        except Exception as e:
            print(f"⚠️  Erreur lors de l'initialisation: {e}")
    
    # Démarrer l'application
    print(f"🚀 Démarrage de l'application sur http://localhost:5001")
    app.run(debug=True, port=5001, host='0.0.0.0') 