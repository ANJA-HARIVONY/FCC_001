#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 ROUTES INFORMES IA
====================
Rutas para la gestión de los informes generados por IA.
"""

from flask import render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime, timedelta
from sqlalchemy import desc

from core.app import app, db, Etat, Incident, Client, Operateur
from core.services.kimi_service import get_kimi_service


@app.route('/etats')
def etats():
    """Page principale des États IA"""
    try:
        # Obtener los últimos 20 informes
        etats_recents = Etat.query.order_by(desc(Etat.date_creation)).limit(20).all()
        
        # Statistiques rapides
        total_etats = Etat.query.count()
        etats_aujourd_hui = Etat.query.filter(
            Etat.date_creation >= datetime.now().date()
        ).count()
        
        # Tipos de informes disponibles
        types_etats = [
            {
                'id': 'summary',
                'nom': 'Résumé Exécutif',
                'description': 'Vue d\'ensemble globale de la performance',
                'icon': 'fa-chart-line'
            },
            {
                'id': 'analysis',
                'nom': 'Analyse des Tendances',
                'description': 'Identification des patterns et tendances',
                'icon': 'fa-trending-up'
            },
            {
                'id': 'performance',
                'nom': 'Performance Opérateurs',
                'description': 'Analyse de la performance de l\'équipe',
                'icon': 'fa-users'
            },
            {
                'id': 'custom',
                'nom': 'Analyse Personnalisée',
                'description': 'Analyse basée sur votre demande spécifique',
                'icon': 'fa-cog'
            }
        ]
        
        return render_template('etats/etats.html',
                             etats_recents=etats_recents,
                             total_etats=total_etats,
                             etats_aujourd_hui=etats_aujourd_hui,
                             types_etats=types_etats)
                             
    except Exception as e:
        flash(f'Error al cargar informes: {str(e)}', 'error')
        return render_template('etats/etats.html',
                             etats_recents=[],
                             total_etats=0,
                             etats_aujourd_hui=0,
                             types_etats=[])


@app.route('/etats/generer')
def etats_generer():
    """Page de génération d'un nouvel état"""
    # Tipos de informes disponibles con más detalles
    types_etats = [
        {
            'id': 'summary',
            'nom': 'Resumen Ejecutivo',
            'description': 'Síntesis completa del rendimiento con KPIs clave',
            'icon': 'fa-chart-line',
            'color': 'primary',
            'estimated_tokens': 400
        },
        {
            'id': 'analysis',
            'nom': 'Análisis de Tendencias',
            'description': 'Identificación de patrones temporales y predicciones',
            'icon': 'fa-trending-up',
            'color': 'info',
            'estimated_tokens': 350
        },
        {
            'id': 'performance',
            'nom': 'Rendimiento Operadores',
            'description': 'Evaluación detallada del equipo y recomendaciones',
            'icon': 'fa-users',
            'color': 'success',
            'estimated_tokens': 300
        },
        {
            'id': 'custom',
            'nom': 'Análisis Personalizado',
            'description': 'Análisis a medida según su solicitud',
            'icon': 'fa-cog',
            'color': 'warning',
            'estimated_tokens': 500
        }
    ]
    
    # Périodes prédéfinies
    periodes = [
        {'id': 'current_week', 'nom': 'Semana actual'},
        {'id': 'current_month', 'nom': 'Mes actual'},
        {'id': 'last_week', 'nom': 'Semana pasada'},
        {'id': 'last_month', 'nom': 'Mes pasado'},
        {'id': 'last_3_months', 'nom': 'Últimos 3 meses'},
        {'id': 'custom', 'nom': 'Período personalizado'}
    ]
    
    return render_template('etats/generer.html',
                         types_etats=types_etats,
                         periodes=periodes)


@app.route('/etats/generer', methods=['POST'])
def etats_generer_post():
    """Traitement de la génération d'un état"""
    try:
        # Récupérer les paramètres du formulaire
        type_etat = request.form.get('type_etat', 'summary')
        periode = request.form.get('periode', 'current_month')
        titre = request.form.get('titre', '').strip()
        prompt_personnalise = request.form.get('prompt_personnalise', '').strip()
        
        # Période personnalisée
        if periode == 'custom':
            date_debut = request.form.get('date_debut')
            date_fin = request.form.get('date_fin')
            if date_debut:
                date_debut = datetime.strptime(date_debut, '%Y-%m-%d').date()
            if date_fin:
                date_fin = datetime.strptime(date_fin, '%Y-%m-%d').date()
        else:
            date_debut, date_fin = _get_date_range_for_period(periode)
        
        # Générer un titre automatique si pas fourni
        if not titre:
            type_names = {
                'summary': 'Résumé Exécutif',
                'analysis': 'Analyse des Tendances',
                'performance': 'Performance Opérateurs',
                'custom': 'Analyse Personnalisée'
            }
            titre = f"{type_names.get(type_etat, 'Informe')} - {datetime.now().strftime('%d/%m/%Y')}"
        
        # Crear el informe en base de datos (estado: generating)
        import json
        parametres_dict = {
            'periode': periode,
            'prompt_personnalise': prompt_personnalise,
            'date_generation': datetime.now().isoformat()
        }
        
        nouvel_etat = Etat(
            titre=titre,
            type_etat=type_etat,
            periode_debut=date_debut,
            periode_fin=date_fin,
            statut='generating',
            utilisateur='sistema',  # Usuario por defecto
            parametres=json.dumps(parametres_dict, ensure_ascii=False)
        )
        
        db.session.add(nouvel_etat)
        db.session.commit()
        
        # Rediriger vers la page de génération en cours
        flash(f'Generación del informe "{titre}" iniciada...', 'info')
        return redirect(url_for('etats_detail', id=nouvel_etat.id))
        
    except Exception as e:
        flash(f'Erreur lors de la génération: {str(e)}', 'error')
        return redirect(url_for('etats_generer'))


@app.route('/etats/<int:id>')
def etats_detail(id):
    """Page de détail d'un état"""
    try:
        etat = Etat.query.get_or_404(id)
        
        # Si l'état est en cours de génération, essayer de le générer
        if etat.statut == 'generating':
            success = _generate_etat_content(etat)
            if success:
                db.session.commit()
            else:
                db.session.rollback()
        
        return render_template('etats/detail.html', etat=etat)
        
    except Exception as e:
        flash(f'Error al cargar el informe: {str(e)}', 'error')
        return redirect(url_for('etats'))


@app.route('/etats/<int:id>/regenerer', methods=['POST'])
def etats_regenerer(id):
    """Régénérer un état existant"""
    try:
        etat = Etat.query.get_or_404(id)
        
        # Marquer comme en cours de génération
        etat.statut = 'generating'
        etat.date_modification = datetime.utcnow()
        db.session.commit()
        
        # Régénérer le contenu
        success = _generate_etat_content(etat)
        
        if success:
            db.session.commit()
            flash('¡Informe regenerado con éxito!', 'success')
        else:
            db.session.rollback()
            flash('Erreur lors de la régénération', 'error')
        
        return redirect(url_for('etats_detail', id=id))
        
    except Exception as e:
        flash(f'Erreur lors de la régénération: {str(e)}', 'error')
        return redirect(url_for('etats_detail', id=id))


@app.route('/etats/<int:id>/supprimer', methods=['POST'])
def etats_supprimer(id):
    """Supprimer un état"""
    try:
        etat = Etat.query.get_or_404(id)
        titre = etat.titre
        
        db.session.delete(etat)
        db.session.commit()
        
        flash(f'Informe "{titre}" eliminado con éxito', 'success')
        return redirect(url_for('etats'))
        
    except Exception as e:
        flash(f'Erreur lors de la suppression: {str(e)}', 'error')
        return redirect(url_for('etats'))


@app.route('/api/etats/<int:id>/export')
def api_etats_export(id):
    """API pour exporter un état en JSON"""
    try:
        etat = Etat.query.get_or_404(id)
        
        export_data = {
            'etat': etat.to_dict(),
            'contenu_ia': etat.contenu_ia,
            'graphiques_data': etat.graphiques_data,
            'parametres': etat.parametres,
            'export_date': datetime.now().isoformat(),
            'version': '1.0'
        }
        
        return jsonify(export_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _get_date_range_for_period(period):
    """Helper: Obtenir les dates de début/fin pour une période"""
    today = datetime.now()
    
    if period == 'current_month':
        start_date = datetime(today.year, today.month, 1).date()
        return start_date, None
    elif period == 'current_week':
        days_since_monday = today.weekday()
        start_date = (today - timedelta(days=days_since_monday)).date()
        return start_date, None
    elif period == 'last_week':
        days_since_monday = today.weekday()
        current_week_start = today - timedelta(days=days_since_monday)
        last_week_start = (current_week_start - timedelta(days=7)).date()
        last_week_end = (current_week_start - timedelta(days=1)).date()
        return last_week_start, last_week_end
    elif period == 'last_month':
        if today.month == 1:
            start_date = datetime(today.year - 1, 12, 1).date()
            end_date = (datetime(today.year, 1, 1) - timedelta(days=1)).date()
        else:
            start_date = datetime(today.year, today.month - 1, 1).date()
            end_date = (datetime(today.year, today.month, 1) - timedelta(days=1)).date()
        return start_date, end_date
    elif period == 'last_3_months':
        start_date = (today - timedelta(days=90)).date()
        return start_date, None
    else:
        # Par défaut: mois en cours
        start_date = datetime(today.year, today.month, 1).date()
        return start_date, None


def _generate_etat_content(etat):
    """Helper: Generar el contenido IA para un informe"""
    try:
        # Collecter les données contextuelles
        data_context = _collect_data_context(etat)
        
        # Obtenir le service Kimi
        kimi_service = get_kimi_service()
        
        # Générer selon le type
        if etat.type_etat == 'summary':
            result = kimi_service.generate_executive_summary(data_context)
        elif etat.type_etat == 'analysis':
            result = kimi_service.generate_trend_analysis(data_context)
        elif etat.type_etat == 'custom':
            prompt = etat.parametres.get('prompt_personnalise', '')
            result = kimi_service.generate_custom_analysis(prompt, data_context)
        else:
            result = kimi_service.generate_executive_summary(data_context)
        
        if result['success']:
            # Actualizar el informe con el contenido generado (convertir a JSON string)
            import json
            etat.contenu_ia = json.dumps(result['data'], ensure_ascii=False)
            etat.statut = 'generated'
            etat.date_modification = datetime.utcnow()
            
            # Agregar los metadatos de uso (convertir a JSON string)
            import json
            if 'usage' in result:
                parametres = json.loads(etat.parametres) if etat.parametres else {}
                parametres['usage'] = result['usage']
                etat.parametres = json.dumps(parametres, ensure_ascii=False)
            
            return True
        else:
            # Marcar como error (convertir a JSON string)
            import json
            etat.statut = 'error'
            etat.contenu_ia = json.dumps({'error': result.get('error', 'Error desconocido')}, ensure_ascii=False)
            return False
            
    except Exception as e:
        # Marcar como error (convertir a JSON string)
        import json
        etat.statut = 'error'
        etat.contenu_ia = json.dumps({'error': str(e)}, ensure_ascii=False)
        return False


def _collect_data_context(etat):
    """Helper: Collecter le contexte de données pour l'IA"""
    try:
        # Filtrar según el período del informe
        query = Incident.query
        
        if etat.periode_debut:
            start_datetime = datetime.combine(etat.periode_debut, datetime.min.time())
            query = query.filter(Incident.date_heure >= start_datetime)
        
        if etat.periode_fin:
            end_datetime = datetime.combine(etat.periode_fin, datetime.max.time())
            query = query.filter(Incident.date_heure <= end_datetime)
        
        incidents = query.all()
        
        # Calculer les métriques de base
        total_incidents = len(incidents)
        incidents_resolus = len([i for i in incidents if i.status == 'Solucionadas'])
        incidents_en_cours = len([i for i in incidents if i.status == 'Pendiente'])
        incidents_bitrix = len([i for i in incidents if i.status == 'Bitrix'])
        
        taux_resolution = round((incidents_resolus / total_incidents * 100) if total_incidents > 0 else 0, 1)
        
        # Répartition par type d'incident
        incidents_par_type = {}
        for incident in incidents:
            intitule = incident.intitule[:50]  # Limiter la longueur
            incidents_par_type[intitule] = incidents_par_type.get(intitule, 0) + 1
        
        # Performance des opérateurs
        operateurs_performance = {}
        for incident in incidents:
            if incident.operateur:
                nom_op = incident.operateur.nom
                if nom_op not in operateurs_performance:
                    operateurs_performance[nom_op] = {'total': 0, 'resolus': 0}
                operateurs_performance[nom_op]['total'] += 1
                if incident.status == 'Solucionadas':
                    operateurs_performance[nom_op]['resolus'] += 1
        
        # Construire le contexte
        periode_str = "Période personnalisée"
        if etat.periode_debut and etat.periode_fin:
            periode_str = f"{etat.periode_debut.strftime('%d/%m/%Y')} - {etat.periode_fin.strftime('%d/%m/%Y')}"
        elif etat.periode_debut:
            periode_str = f"Depuis le {etat.periode_debut.strftime('%d/%m/%Y')}"
        
        return {
            'periode': periode_str,
            'total_incidents': total_incidents,
            'incidents_resolus': incidents_resolus,
            'incidents_en_cours': incidents_en_cours,
            'incidents_bitrix': incidents_bitrix,
            'taux_resolution': taux_resolution,
            'incidents_par_type': dict(list(incidents_par_type.items())[:10]),  # Top 10
            'operateurs_performance': operateurs_performance,
            'nombre_clients_impactes': len(set(i.id_client for i in incidents)),
            'nombre_operateurs_actifs': len(set(i.id_operateur for i in incidents if i.id_operateur))
        }
        
    except Exception as e:
        return {
            'periode': 'Erreur de collecte',
            'total_incidents': 0,
            'error': str(e)
        }