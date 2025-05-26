from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_babel import Babel, gettext, ngettext, lazy_gettext, get_locale
from datetime import datetime
import os
from sqlalchemy import func
from config import Config
from io import BytesIO

# Import optionnel de weasyprint
WEASYPRINT_AVAILABLE = False
try:
    # Vérifier si WeasyPrint doit être désactivé via variable d'environnement
    if os.environ.get('WEASYPRINT_AVAILABLE', 'True').lower() != 'false':
        import weasyprint
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

app = Flask(__name__)
app.config.from_object(Config)

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
        'current_time': datetime.now().strftime('%d/%m/%Y à %H:%M')
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
    id_operateur = db.Column(db.Integer, db.ForeignKey('operateur.id'), nullable=False)
    date_heure = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<Incident {self.intitule}>'

# Route pour changer de langue
@app.route('/set_language/<language>')
def set_language(language=None):
    if language in app.config['LANGUAGES']:
        session['language'] = language
    return redirect(request.referrer or url_for('dashboard'))

# Routes principales
@app.route('/')
def dashboard():
    # Statistiques du mois en cours
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    incidents_mois = Incident.query.filter(
        func.extract('month', Incident.date_heure) == current_month,
        func.extract('year', Incident.date_heure) == current_year
    ).all()
    
    total_incidents = len(incidents_mois)
    incidents_resolus = len([i for i in incidents_mois if i.status == 'Solucionadas'])
    incidents_attente = len([i for i in incidents_mois if i.status == 'Pendiente'])
    incidents_bitrix = len([i for i in incidents_mois if i.status == 'Bitrix'])
    
    # 5 derniers incidents
    derniers_incidents = Incident.query.order_by(Incident.date_heure.desc()).limit(5).all()
    
    # Données pour les graphiques
    incidents_par_operateur_raw = db.session.query(
        Operateur.nom, func.count(Incident.id)
    ).join(Incident).filter(
        func.extract('month', Incident.date_heure) == current_month,
        func.extract('year', Incident.date_heure) == current_year
    ).group_by(Operateur.nom).all()
    
    # Convertir en liste de listes pour la sérialisation JSON
    incidents_par_operateur = [[nom, count] for nom, count in incidents_par_operateur_raw]
    
    return render_template('dashboard.html',
                         total_incidents=total_incidents,
                         incidents_resolus=incidents_resolus,
                         incidents_attente=incidents_attente,
                         incidents_bitrix=incidents_bitrix,
                         derniers_incidents=derniers_incidents,
                         incidents_par_operateur=incidents_par_operateur)

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
    return render_template('aide.html')

# Routes CRUD pour les clients
@app.route('/clients')
def clients():
    clients = Client.query.all()
    return render_template('clients.html', clients=clients)

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
        flash(gettext('Client ajouté avec succès!'), 'success')
        return redirect(url_for('clients'))
    return render_template('nouveau_client.html')

@app.route('/clients/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_client(id):
    client = Client.query.get_or_404(id)
    if request.method == 'POST':
        client.nom = request.form['nom']
        client.telephone = request.form['telephone']
        client.adresse = request.form['adresse']
        client.ville = request.form['ville']
        client.ip_router = request.form['ip_router']
        client.ip_antea = request.form['ip_antea']
        db.session.commit()
        flash(gettext('Client modifié avec succès!'), 'success')
        return redirect(url_for('clients'))
    return render_template('modifier_client.html', client=client)

@app.route('/clients/<int:id>/supprimer', methods=['POST'])
def supprimer_client(id):
    client = Client.query.get_or_404(id)
    db.session.delete(client)
    db.session.commit()
    flash(gettext('Client supprimé avec succès!'), 'success')
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
    
    if WEASYPRINT_AVAILABLE:
        # Rendu du template HTML pour le PDF
        html_content = render_template('fiche_client_pdf.html', client=client, incidents=incidents)
        
        # Génération du PDF
        pdf = weasyprint.HTML(string=html_content).write_pdf()
        
        # Création de la réponse
        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=fiche_client_{client.nom.replace(" ", "_")}.pdf'
        
        return response
    else:
        # Alternative : renvoyer vers la page HTML optimisée pour l'impression
        flash(gettext('WeasyPrint non disponible. Utilisez la fonction d\'impression de votre navigateur.'), 'warning')
        return redirect(url_for('fiche_client_print', id=id))

# Route alternative pour l'impression via le navigateur
@app.route('/clients/<int:id>/imprimer-html')
def fiche_client_print(id):
    client = Client.query.get_or_404(id)
    incidents = Incident.query.filter_by(id_client=id).order_by(Incident.date_heure.desc()).all()
    return render_template('fiche_client_pdf.html', client=client, incidents=incidents)

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
        flash(gettext('Opérateur ajouté avec succès!'), 'success')
        return redirect(url_for('operateurs'))
    return render_template('nouveau_operateur.html')

@app.route('/operateurs/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_operateur(id):
    operateur = Operateur.query.get_or_404(id)
    if request.method == 'POST':
        operateur.nom = request.form['nom']
        operateur.telephone = request.form['telephone']
        db.session.commit()
        flash(gettext('Opérateur modifié avec succès!'), 'success')
        return redirect(url_for('operateurs'))
    return render_template('modifier_operateur.html', operateur=operateur)

@app.route('/operateurs/<int:id>/supprimer', methods=['POST'])
def supprimer_operateur(id):
    operateur = Operateur.query.get_or_404(id)
    db.session.delete(operateur)
    db.session.commit()
    flash(gettext('Opérateur supprimé avec succès!'), 'success')
    return redirect(url_for('operateurs'))

# Routes CRUD pour les incidents
@app.route('/incidents')
def incidents():
    incidents = Incident.query.order_by(Incident.date_heure.desc()).all()
    return render_template('incidents.html', incidents=incidents)

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
        db.session.add(incident)
        db.session.commit()
        flash(gettext('Incident ajouté avec succès!'), 'success')
        return redirect(url_for('incidents'))
    
    clients = Client.query.all()
    operateurs = Operateur.query.all()
    return render_template('nouveau_incident.html', clients=clients, operateurs=operateurs)

@app.route('/incidents/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_incident(id):
    incident = Incident.query.get_or_404(id)
    if request.method == 'POST':
        incident.id_client = request.form['id_client']
        incident.intitule = request.form['intitule']
        incident.observations = request.form['observations']
        incident.status = request.form['status']
        incident.id_operateur = request.form['id_operateur']
        db.session.commit()
        flash(gettext('Incident modifié avec succès!'), 'success')
        return redirect(url_for('incidents'))
    
    clients = Client.query.all()
    operateurs = Operateur.query.all()
    return render_template('modifier_incident.html', incident=incident, clients=clients, operateurs=operateurs)

@app.route('/incidents/<int:id>/supprimer', methods=['POST'])
def supprimer_incident(id):
    incident = Incident.query.get_or_404(id)
    db.session.delete(incident)
    db.session.commit()
    flash(gettext('Incident supprimé avec succès!'), 'success')
    return redirect(url_for('incidents'))

# API pour les données des graphiques
@app.route('/api/incidents-par-date')
def api_incidents_par_date():
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Paramètre pour choisir le type d'affichage
    view_type = request.args.get('type', 'date')  # 'date', 'hour', 'datetime'
    
    if view_type == 'hour':
        # Grouper par heure - compatible SQLite
        incidents = db.session.query(
            func.strftime('%Y-%m-%d %H:00:00', Incident.date_heure), func.count(Incident.id)
        ).filter(
            func.extract('month', Incident.date_heure) == current_month,
            func.extract('year', Incident.date_heure) == current_year
        ).group_by(func.strftime('%Y-%m-%d %H:00:00', Incident.date_heure)).order_by(func.strftime('%Y-%m-%d %H:00:00', Incident.date_heure)).all()
        
        return jsonify([{
            'date': datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S').strftime('%d/%m %H:%M'), 
            'count': count
        } for date_str, count in incidents])
        
    elif view_type == 'datetime':
        # Afficher chaque incident avec sa date/heure exacte
        incidents = db.session.query(
            Incident.date_heure, func.count(Incident.id)
        ).filter(
            func.extract('month', Incident.date_heure) == current_month,
            func.extract('year', Incident.date_heure) == current_year
        ).group_by(Incident.date_heure).order_by(Incident.date_heure).all()
        
        return jsonify([{
            'date': datetime_obj.strftime('%d/%m %H:%M'), 
            'count': count
        } for datetime_obj, count in incidents])
        
    else:
        # Par défaut : grouper par date (comportement original)
        incidents = db.session.query(
            func.date(Incident.date_heure), func.count(Incident.id)
        ).filter(
            func.extract('month', Incident.date_heure) == current_month,
            func.extract('year', Incident.date_heure) == current_year
        ).group_by(func.date(Incident.date_heure)).order_by(func.date(Incident.date_heure)).all()
        
        return jsonify([{
            'date': datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m'), 
            'count': count
        } for date_str, count in incidents])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001) 