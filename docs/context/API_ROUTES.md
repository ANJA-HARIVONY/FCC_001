# 🌐 Routes et API - FCC_001

## 🎯 Vue d'Ensemble des Routes

L'application FCC_001 expose une **API HTTP classique** suivant les conventions REST avec des routes organisées par modules fonctionnels :

```
┌─────────────────────────────────────────────────────────────┐
│                      ARCHITECTURE ROUTES                   │
├─────────────────┬─────────────────┬─────────────────────────┤
│    PUBLIQUES    │    FONCTIONNELLES │      UTILITAIRES       │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Dashboard     │ • CRUD Clients  │ • i18n (langues)        │
│ • Pages info    │ • CRUD Incidents│ • Recherche globale     │
│ • Erreurs       │ • CRUD Opérateurs│ • Export PDF           │
│                 │ • Fiches détail │ • API données           │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🏠 Routes Principales

### 📊 Dashboard et Navigation

#### Route Racine
```python
@app.route('/')
@app.route('/dashboard')
def dashboard():
    """
    🎯 Page d'accueil avec statistiques mensuelles
    
    GET /
    GET /dashboard
    
    Returns:
        Template dashboard.html avec:
        - Statistiques mois courant
        - Graphiques incidents (Chart.js)
        - Liste 5 derniers incidents
        - Navigation rapide modules
    """
    # Calcul mois courant
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Incidents du mois
    incidents_month = Incident.query.filter(
        func.extract('month', Incident.date_heure) == current_month,
        func.extract('year', Incident.date_heure) == current_year
    ).all()
    
    # Statistiques agrégées
    stats = {
        'total_incidents': len(incidents_month),
        'pendientes': len([i for i in incidents_month if i.status == 'Pendiente']),
        'solucionadas': len([i for i in incidents_month if i.status == 'Solucionadas']),
        'bitrix': len([i for i in incidents_month if i.status == 'Bitrix'])
    }
    
    # Derniers incidents (pour tableau)
    latest_incidents = Incident.query.order_by(
        Incident.date_heure.desc()
    ).limit(5).all()
    
    # Données graphiques
    chart_data = prepare_chart_data(incidents_month)
    
    return render_template('dashboard.html', 
                         stats=stats,
                         latest_incidents=latest_incidents,
                         chart_data=chart_data)
```

## 👥 Routes Gestion des Clients

### 📋 Liste et Recherche

#### GET /clients - Liste avec Pagination
```python
@app.route('/clients')
def clients():
    """
    📋 Liste paginée des clients avec recherche avancée
    
    GET /clients?search=term&ville=city&page=1&per_page=10&sort=nom&order=asc
    
    Query Parameters:
        search (str, optional): Terme recherche multi-champs
        ville (str, optional): Filtre par ville
        page (int, default=1): Numéro page
        per_page (int, default=10): Éléments par page (5,10,25,50)
        sort (str, default='id'): Colonne tri (id,nom,adresse,incidents)
        order (str, default='asc'): Ordre tri (asc,desc)
    
    Returns:
        Template clients.html avec:
        - clients: Objet pagination SQLAlchemy
        - search_query: Terme recherche actuel
        - ville_filter: Filtre ville actuel
        - villes_list: Liste villes disponibles
        - sort_by, sort_order: Paramètres tri actuels
        - per_page: Éléments par page actuel
    """
    # Paramètres de recherche
    search_query = request.args.get('search', '').strip()
    ville_filter = request.args.get('ville', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    sort_by = request.args.get('sort', 'id')
    sort_order = request.args.get('order', 'asc')
    
    # Construction requête base
    query = Client.query
    
    # Application filtres
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            or_(
                Client.nom.ilike(search_pattern),
                Client.telephone.ilike(search_pattern),
                Client.adresse.ilike(search_pattern),
                Client.ip_router.ilike(search_pattern),
                Client.ip_antea.ilike(search_pattern)
            )
        )
    
    if ville_filter:
        query = query.filter(Client.ville == ville_filter)
    
    # Application tri
    if sort_by == 'incidents':
        # Tri par nombre d'incidents (sous-requête)
        incident_count = db.session.query(
            Incident.id_client,
            func.count(Incident.id).label('incident_count')
        ).group_by(Incident.id_client).subquery()
        
        query = query.outerjoin(
            incident_count, 
            Client.id == incident_count.c.id_client
        )
        
        if sort_order == 'desc':
            query = query.order_by(desc(incident_count.c.incident_count))
        else:
            query = query.order_by(asc(incident_count.c.incident_count))
    else:
        # Tri standard
        column = getattr(Client, sort_by, Client.id)
        if sort_order == 'desc':
            query = query.order_by(desc(column))
        else:
            query = query.order_by(asc(column))
    
    # Pagination
    clients = query.paginate(
        page=page,
        per_page=min(per_page, 100),  # Limite sécurité
        error_out=False
    )
    
    # Liste villes pour filtre
    villes_list = db.session.query(Client.ville).distinct().filter(
        Client.ville.isnot(None)
    ).order_by(Client.ville).all()
    villes_list = [v[0] for v in villes_list]
    
    return render_template('clients.html',
                         clients=clients,
                         search_query=search_query,
                         ville_filter=ville_filter,
                         villes_list=villes_list,
                         sort_by=sort_by,
                         sort_order=sort_order,
                         per_page=per_page)
```

### ➕ Création Client

#### GET/POST /clients/nouveau
```python
@app.route('/clients/nouveau', methods=['GET', 'POST'])
def nouveau_client():
    """
    ➕ Création nouveau client
    
    GET /clients/nouveau
        Returns: Formulaire vide
    
    POST /clients/nouveau
        Form Data:
            nom (str, required): Nom complet
            telephone (str, optional): Numéro téléphone
            adresse (str, required): Adresse complète
            ville (str, required): Ville/quartier
            ip_router (str, optional): IP router (format IPv4)
            ip_antea (str, optional): IP antenne (format IPv4)
        
        Returns: 
            Success: Redirect /clients avec message flash
            Error: Template avec erreurs validation
    """
    if request.method == 'POST':
        # Récupération données
        nom = request.form.get('nom', '').strip()
        telephone = request.form.get('telephone', '').strip()
        adresse = request.form.get('adresse', '').strip()
        ville = request.form.get('ville', '').strip()
        ip_router = request.form.get('ip_router', '').strip()
        ip_antea = request.form.get('ip_antea', '').strip()
        
        # Validation
        errors = []
        
        if not nom:
            errors.append('Le nom est obligatoire')
        
        if not adresse:
            errors.append('L\'adresse est obligatoire')
        
        if not ville:
            errors.append('La ville est obligatoire')
        
        # Validation IP si renseignées
        if ip_router and not validate_ip_format(ip_router):
            errors.append('Format IP Router invalide')
        
        if ip_antea and not validate_ip_format(ip_antea):
            errors.append('Format IP Antenne invalide')
        
        # Unicité téléphone si renseigné
        if telephone:
            existing = Client.query.filter_by(telephone=telephone).first()
            if existing:
                errors.append('Ce numéro de téléphone existe déjà')
        
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('nouveau_client.html')
        
        # Création client
        try:
            client = Client(
                nom=nom,
                telephone=telephone or None,
                adresse=adresse,
                ville=ville,
                ip_router=ip_router or None,
                ip_antea=ip_antea or None
            )
            
            db.session.add(client)
            db.session.commit()
            
            flash(gettext('Client ajouté avec succès!'), 'success')
            return redirect(url_for('clients'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la création: {str(e)}', 'error')
            return render_template('nouveau_client.html')
    
    return render_template('nouveau_client.html')

def validate_ip_format(ip):
    """Validation format IPv4"""
    import re
    pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    if not re.match(pattern, ip):
        return False
    
    # Vérification plages valides
    octets = ip.split('.')
    return all(0 <= int(octet) <= 255 for octet in octets)
```

### ✏️ Modification Client

#### GET/POST /clients/<id>/modifier
```python
@app.route('/clients/<int:id>/modifier', methods=['GET', 'POST'])
def modifier_client(id):
    """
    ✏️ Modification client existant avec retour intelligent
    
    GET /clients/<id>/modifier?next=<return_url>
        Returns: Formulaire pré-rempli
    
    POST /clients/<id>/modifier?next=<return_url>
        Form Data: Mêmes champs que création
        
        Returns:
            Success: Redirect vers next_url ou /clients
            Error: Template avec erreurs
    """
    client = Client.query.get_or_404(id)
    next_url = request.args.get('next', url_for('clients'))
    
    if request.method == 'POST':
        # Mise à jour des champs
        client.nom = request.form.get('nom', '').strip()
        client.telephone = request.form.get('telephone', '').strip() or None
        client.adresse = request.form.get('adresse', '').strip()
        client.ville = request.form.get('ville', '').strip()
        client.ip_router = request.form.get('ip_router', '').strip() or None
        client.ip_antea = request.form.get('ip_antea', '').strip() or None
        
        # Validation (similaire à création)
        errors = validate_client_data(client, exclude_id=id)
        
        if errors:
            for error in errors:
                flash(error, 'error')
        else:
            try:
                db.session.commit()
                flash(gettext('Client modifié avec succès!'), 'success')
                return redirect(next_url)
            except Exception as e:
                db.session.rollback()
                flash(f'Erreur lors de la modification: {str(e)}', 'error')
    
    return render_template('modifier_client.html', 
                         client=client, 
                         next_url=next_url)
```

### 🗑️ Suppression Client

#### POST /clients/<id>/supprimer
```python
@app.route('/clients/<int:id>/supprimer', methods=['POST'])
def supprimer_client(id):
    """
    🗑️ Suppression client avec cascade incidents
    
    POST /clients/<id>/supprimer
    
    Returns:
        Success: Redirect /clients avec message
        Error: Redirect /clients avec erreur
    
    Notes:
        - Suppression cascade des incidents liés
        - Validation métier avant suppression
        - Log de l'action pour audit
    """
    client = Client.query.get_or_404(id)
    
    try:
        # Validation métier
        validate_client_deletion(client)
        
        # Log avant suppression
        incidents_count = len(client.incidents)
        client_name = client.nom
        
        # Suppression (cascade automatique SQLAlchemy)
        db.session.delete(client)
        db.session.commit()
        
        # Log succès
        app.logger.info(f"Client supprimé: {client_name} (ID: {id}, {incidents_count} incidents)")
        
        flash(gettext('Client supprimé avec succès'), 'success')
        
    except BusinessError as e:
        flash(str(e), 'error')
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Erreur suppression client {id}: {str(e)}")
        flash(gettext('Erreur lors de la suppression'), 'error')
    
    return redirect(url_for('clients'))

def validate_client_deletion(client):
    """Validation règles métier suppression"""
    # Vérification incidents actifs
    active_incidents = [i for i in client.incidents if i.status == 'Pendiente']
    if active_incidents:
        raise BusinessError(
            f'Impossible de supprimer: {len(active_incidents)} incident(s) en cours'
        )

class BusinessError(Exception):
    """Exception pour erreurs métier"""
    pass
```

### 📄 Fiche Client Détaillée

#### GET /clients/<id>/fiche
```python
@app.route('/clients/<int:id>/fiche')
def fiche_client(id):
    """
    📄 Fiche client complète avec historique incidents
    
    GET /clients/<id>/fiche
    
    Returns:
        Template fiche_client.html avec:
        - client: Objet Client complet
        - incidents: Liste incidents par date desc
        - stats: Métriques calculées
    """
    client = Client.query.get_or_404(id)
    
    # Incidents triés par date décroissante
    incidents = Incident.query.filter_by(id_client=id)\
                              .order_by(Incident.date_heure.desc())\
                              .all()
    
    # Calcul statistiques
    stats = {
        'total_incidents': len(incidents),
        'incidents_resolus': len([i for i in incidents if i.status == 'Solucionadas']),
        'incidents_attente': len([i for i in incidents if i.status == 'Pendiente']),
        'incidents_bitrix': len([i for i in incidents if i.status == 'Bitrix']),
        'dernier_incident': incidents[0] if incidents else None,
        'premier_incident': incidents[-1] if incidents else None
    }
    
    # Taux de résolution
    if stats['total_incidents'] > 0:
        stats['taux_resolution'] = round(
            (stats['incidents_resolus'] / stats['total_incidents']) * 100, 1
        )
    else:
        stats['taux_resolution'] = 0
    
    return render_template('fiche_client.html',
                         client=client,
                         incidents=incidents,
                         stats=stats)
```

### 🖨️ Impression PDF

#### GET /clients/<id>/imprimer
```python
@app.route('/clients/<int:id>/imprimer')
def imprimer_fiche_client(id):
    """
    🖨️ Génération PDF fiche client
    
    GET /clients/<id>/imprimer
    
    Returns:
        Success: PDF stream (application/pdf)
        Error: Redirect fiche avec message ou fallback print
    
    Notes:
        - Utilise WeasyPrint si disponible
        - Fallback vers impression navigateur
        - Template optimisé PDF avec CSS print
    """
    client = Client.query.get_or_404(id)
    incidents = Incident.query.filter_by(id_client=id)\
                              .order_by(Incident.date_heure.desc())\
                              .all()
    
    # Vérification disponibilité WeasyPrint
    if not WEASYPRINT_AVAILABLE:
        flash(gettext('Génération PDF non disponible. Utilisez Ctrl+P pour imprimer.'), 'warning')
        return redirect(url_for('fiche_client', id=id))
    
    try:
        # Données pour template PDF
        template_data = {
            'client': client,
            'incidents': incidents,
            'date_generation': datetime.now(),
            'stats': calculate_client_stats(incidents)
        }
        
        # Rendu template optimisé PDF
        html_content = render_template('fiche_client_pdf.html', **template_data)
        
        # Génération PDF
        pdf_bytes = weasyprint.HTML(
            string=html_content,
            base_url=request.url_root
        ).write_pdf()
        
        # Préparation réponse
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = \
            f'inline; filename="client_{client.id}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        
        # Log génération réussie
        app.logger.info(f"PDF généré pour client {client.id} ({client.nom})")
        
        return response
        
    except Exception as e:
        app.logger.error(f"Erreur génération PDF client {id}: {str(e)}")
        flash(gettext('Erreur lors de la génération PDF'), 'error')
        return redirect(url_for('fiche_client', id=id))
```

## 🚨 Routes Gestion des Incidents

### 📋 Liste Incidents

#### GET /incidents
```python
@app.route('/incidents')
def incidents():
    """
    📋 Liste paginée incidents avec recherche multi-critères
    
    GET /incidents?search=term&status=Pendiente&operateur=1&page=1&per_page=10
    
    Query Parameters:
        search (str): Recherche dans intitulé, observations, nom client
        status (str): Filtre par statut (Pendiente, Solucionadas, Bitrix)
        operateur (int): Filtre par ID opérateur
        client (int): Filtre par ID client
        date_debut, date_fin (date): Filtre période
        page, per_page: Pagination standard
    """
    # Paramètres recherche
    search_query = request.args.get('search', '').strip()
    status_filter = request.args.get('status', '').strip()
    operateur_filter = request.args.get('operateur', type=int)
    client_filter = request.args.get('client', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Requête base avec jointures
    query = Incident.query.join(Client).join(Operateur, isouter=True)
    
    # Filtres
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            or_(
                Incident.intitule.ilike(search_pattern),
                Incident.observations.ilike(search_pattern),
                Client.nom.ilike(search_pattern),
                Operateur.nom.ilike(search_pattern)
            )
        )
    
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    
    if operateur_filter:
        query = query.filter(Incident.id_operateur == operateur_filter)
    
    if client_filter:
        query = query.filter(Incident.id_client == client_filter)
    
    # Tri par date décroissante
    query = query.order_by(Incident.date_heure.desc())
    
    # Pagination
    incidents = query.paginate(
        page=page,
        per_page=min(per_page, 100),
        error_out=False
    )
    
    # Données pour filtres
    clients_list = Client.query.order_by(Client.nom).all()
    operateurs_list = Operateur.query.order_by(Operateur.nom).all()
    status_list = ['Pendiente', 'Solucionadas', 'Bitrix']
    
    return render_template('incidents.html',
                         incidents=incidents,
                         search_query=search_query,
                         status_filter=status_filter,
                         operateur_filter=operateur_filter,
                         client_filter=client_filter,
                         clients_list=clients_list,
                         operateurs_list=operateurs_list,
                         status_list=status_list,
                         per_page=per_page)
```

### ➕ Création Incident

#### GET/POST /incidents/nouveau
```python
@app.route('/incidents/nouveau', methods=['GET', 'POST'])
def nouveau_incident():
    """
    ➕ Création nouvel incident
    
    GET /incidents/nouveau?client_id=<id>
        client_id (optional): Pré-sélection client
    
    POST /incidents/nouveau
        Form Data:
            id_client (int, required): ID client
            intitule (str, required): Titre incident
            observations (str, optional): Description détaillée
            status (str, default='Pendiente'): Statut initial
            id_operateur (int, optional): Opérateur assigné
    """
    if request.method == 'POST':
        # Récupération données
        id_client = request.form.get('id_client', type=int)
        intitule = request.form.get('intitule', '').strip()
        observations = request.form.get('observations', '').strip()
        status = request.form.get('status', 'Pendiente')
        id_operateur = request.form.get('id_operateur', type=int) or None
        
        # Validation
        errors = []
        
        if not id_client:
            errors.append('Client obligatoire')
        elif not Client.query.get(id_client):
            errors.append('Client inexistant')
        
        if not intitule:
            errors.append('Intitulé obligatoire')
        elif len(intitule) < 5:
            errors.append('Intitulé trop court (minimum 5 caractères)')
        
        if status not in ['Pendiente', 'Solucionadas', 'Bitrix']:
            errors.append('Statut invalide')
        
        if id_operateur and not Operateur.query.get(id_operateur):
            errors.append('Opérateur inexistant')
        
        if errors:
            for error in errors:
                flash(error, 'error')
        else:
            try:
                incident = Incident(
                    id_client=id_client,
                    intitule=intitule,
                    observations=observations or None,
                    status=status,
                    id_operateur=id_operateur,
                    date_heure=datetime.now()
                )
                
                db.session.add(incident)
                db.session.commit()
                
                flash(gettext('Incident créé avec succès!'), 'success')
                return redirect(url_for('incidents'))
                
            except Exception as e:
                db.session.rollback()
                flash(f'Erreur lors de la création: {str(e)}', 'error')
    
    # Données pour formulaire
    clients = Client.query.order_by(Client.nom).all()
    operateurs = Operateur.query.order_by(Operateur.nom).all()
    client_preselect = request.args.get('client_id', type=int)
    
    return render_template('nouveau_incident.html',
                         clients=clients,
                         operateurs=operateurs,
                         client_preselect=client_preselect)
```

## 🌐 Routes Utilitaires

### 🌍 Internationalisation

#### GET /set_language/<language>
```python
@app.route('/set_language/<language>')
def set_language(language):
    """
    🌍 Changement de langue interface
    
    GET /set_language/<language>
    
    Parameters:
        language (str): Code langue (fr, es, en)
    
    Returns:
        Redirect vers page référente avec langue mise à jour
    """
    if language in app.config['LANGUAGES']:
        session['language'] = language
        session.permanent = True
        flash(gettext('Langue mise à jour'), 'success')
    else:
        flash(gettext('Langue non supportée'), 'error')
    
    # Retour page précédente ou dashboard
    return redirect(request.referrer or url_for('dashboard'))

@babel.localeselector
def get_locale():
    """Détermination locale automatique"""
    # 1. Langue en session (priorité)
    if 'language' in session:
        return session['language']
    
    # 2. Paramètre URL
    requested_language = request.args.get('lang')
    if requested_language and requested_language in app.config['LANGUAGES']:
        session['language'] = requested_language
        return requested_language
    
    # 3. Accept-Language header
    return request.accept_languages.best_match(
        app.config['LANGUAGES']
    ) or app.config['BABEL_DEFAULT_LOCALE']
```

### 🔍 Recherche Globale

#### GET /recherche
```python
@app.route('/recherche')
def recherche():
    """
    🔍 Recherche globale multi-entités
    
    GET /recherche?q=terme&type=all
    
    Query Parameters:
        q (str, required): Terme de recherche
        type (str, default='all'): Type recherche (all, clients, incidents, operateurs)
    
    Returns:
        Template recherche.html avec résultats structurés
    """
    query = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')
    
    if not query:
        return render_template('recherche.html', query='', results={})
    
    results = {}
    search_pattern = f"%{query}%"
    
    # Recherche clients
    if search_type in ['all', 'clients']:
        results['clients'] = Client.query.filter(
            or_(
                Client.nom.ilike(search_pattern),
                Client.telephone.ilike(search_pattern),
                Client.adresse.ilike(search_pattern),
                Client.ville.ilike(search_pattern),
                Client.ip_router.ilike(search_pattern),
                Client.ip_antea.ilike(search_pattern)
            )
        ).limit(10).all()
    
    # Recherche incidents
    if search_type in ['all', 'incidents']:
        results['incidents'] = Incident.query.filter(
            or_(
                Incident.intitule.ilike(search_pattern),
                Incident.observations.ilike(search_pattern)
            )
        ).order_by(Incident.date_heure.desc()).limit(10).all()
    
    # Recherche opérateurs
    if search_type in ['all', 'operateurs']:
        results['operateurs'] = Operateur.query.filter(
            or_(
                Operateur.nom.ilike(search_pattern),
                Operateur.telephone.ilike(search_pattern)
            )
        ).limit(10).all()
    
    # Calcul total résultats
    total_results = sum(len(r) for r in results.values())
    
    return render_template('recherche.html',
                         query=query,
                         search_type=search_type,
                         results=results,
                         total_results=total_results)
```

### 📊 API JSON (Futur)

#### GET /api/stats
```python
@app.route('/api/stats')
def api_stats():
    """
    📊 API statistiques JSON pour tableaux de bord externes
    
    GET /api/stats?period=month&format=json
    
    Query Parameters:
        period (str): Période (day, week, month, year)
        format (str): Format réponse (json, csv)
    
    Returns:
        JSON avec métriques calculées
    """
    period = request.args.get('period', 'month')
    format_type = request.args.get('format', 'json')
    
    # Calcul période
    now = datetime.now()
    if period == 'day':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = now - timedelta(days=7)
    elif period == 'month':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        return jsonify({'error': 'Période invalide'}), 400
    
    # Requête incidents période
    incidents = Incident.query.filter(
        Incident.date_heure >= start_date
    ).all()
    
    # Calcul statistiques
    stats = {
        'period': period,
        'start_date': start_date.isoformat(),
        'end_date': now.isoformat(),
        'total_incidents': len(incidents),
        'by_status': {
            'Pendiente': len([i for i in incidents if i.status == 'Pendiente']),
            'Solucionadas': len([i for i in incidents if i.status == 'Solucionadas']),
            'Bitrix': len([i for i in incidents if i.status == 'Bitrix'])
        },
        'by_operator': {},
        'resolution_rate': 0
    }
    
    # Par opérateur
    for incident in incidents:
        if incident.operateur:
            op_name = incident.operateur.nom
            stats['by_operator'][op_name] = stats['by_operator'].get(op_name, 0) + 1
    
    # Taux de résolution
    if stats['total_incidents'] > 0:
        stats['resolution_rate'] = round(
            (stats['by_status']['Solucionadas'] / stats['total_incidents']) * 100, 2
        )
    
    if format_type == 'json':
        return jsonify(stats)
    elif format_type == 'csv':
        # Conversion CSV (futur)
        return "CSV not implemented", 501
    else:
        return jsonify({'error': 'Format non supporté'}), 400
```

## 🚫 Gestion des Erreurs

### Handlers d'Erreurs Personnalisés

```python
@app.errorhandler(404)
def not_found_error(error):
    """Page 404 personnalisée"""
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Page 500 avec rollback automatique"""
    db.session.rollback()
    app.logger.error(f'Erreur serveur: {error}')
    return render_template('errors/500.html'), 500

@app.errorhandler(403)
def forbidden_error(error):
    """Page 403 accès interdit"""
    return render_template('errors/403.html'), 403
```

## 📝 Middlewares et Hooks

### Before/After Request

```python
@app.before_request
def before_request():
    """Exécuté avant chaque requête"""
    # Log requêtes en mode debug
    if app.debug:
        app.logger.debug(f'{request.method} {request.url}')
    
    # Vérification session langue
    if 'language' not in session:
        session['language'] = get_locale()

@app.after_request
def after_request(response):
    """Exécuté après chaque requête"""
    # Headers sécurité
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    
    return response

@app.context_processor
def inject_conf_vars():
    """Variables globales templates"""
    return dict(
        APP_NAME=app.config.get('APP_NAME', 'FCC_001'),
        APP_VERSION=app.config.get('APP_VERSION', '1.0.0'),
        CURRENT_YEAR=datetime.now().year,
        WEASYPRINT_AVAILABLE=WEASYPRINT_AVAILABLE
    )
```

---

## 📋 Résumé Routes Principales

### 🎯 Routes Publiques
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/` | Dashboard principal |
| `GET` | `/dashboard` | Alias dashboard |
| `GET` | `/aide` | Page d'aide |

### 👥 Routes Clients
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/clients` | Liste paginée avec recherche |
| `GET` | `/clients/nouveau` | Formulaire création |
| `POST` | `/clients/nouveau` | Traitement création |
| `GET` | `/clients/<id>/modifier` | Formulaire modification |
| `POST` | `/clients/<id>/modifier` | Traitement modification |
| `POST` | `/clients/<id>/supprimer` | Suppression |
| `GET` | `/clients/<id>/fiche` | Fiche détaillée |
| `GET` | `/clients/<id>/imprimer` | Export PDF |

### 🚨 Routes Incidents
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/incidents` | Liste avec filtres |
| `GET` | `/incidents/nouveau` | Formulaire création |
| `POST` | `/incidents/nouveau` | Traitement création |
| `GET` | `/incidents/<id>/modifier` | Formulaire modification |
| `POST` | `/incidents/<id>/modifier` | Traitement modification |
| `POST` | `/incidents/<id>/supprimer` | Suppression |

### 🔧 Routes Opérateurs
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/operateurs` | Liste opérateurs |
| `GET` | `/operateurs/nouveau` | Formulaire création |
| `POST` | `/operateurs/nouveau` | Traitement création |
| `GET` | `/operateurs/<id>/modifier` | Formulaire modification |
| `POST` | `/operateurs/<id>/modifier` | Traitement modification |
| `POST` | `/operateurs/<id>/supprimer` | Suppression |

### 🌐 Routes Utilitaires
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/set_language/<lang>` | Changement langue |
| `GET` | `/recherche` | Recherche globale |
| `GET` | `/api/stats` | Statistiques JSON |

---

*Cette API REST garantit une navigation fluide et des fonctionnalités complètes pour la gestion client.*