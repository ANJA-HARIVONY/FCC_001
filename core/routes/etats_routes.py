#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 ROUTES INFORMES IA
====================
Rutas para la gestión de los informes generados por IA.
"""

import json

from flask import render_template, request, redirect, url_for, flash, jsonify, current_app
from datetime import datetime, timedelta
from sqlalchemy import desc
from flask_login import current_user

from core.app import app, db, Etat, Incident, Agencia

# Réactiver l’appel API Kimi : définir ETATS_USE_AI = True dans la config Flask
# (ex. app.config['ETATS_USE_AI'] = True) ou variable d’environnement gérée côté config.


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
                'nom': 'Estado General',
                'description': 'Conteos globales de registros',
                'icon': 'fa-chart-line'
            },
            {
                'id': 'analysis',
                'nom': 'Evolución de Registros',
                'description': 'Evolución temporal de los registros',
                'icon': 'fa-trending-up'
            },
            {
                'id': 'performance',
                'nom': 'Actividad por Usuario',
                'description': 'Actividad de cada usuario',
                'icon': 'fa-users'
            },
            {
                'id': 'custom',
                'nom': 'Análisis Personalizado',
                'description': 'Análisis basado en su solicitud específica',
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
            'nom': 'Estado General',
            'description': 'Conteos globales de registros y resumen por estado',
            'icon': 'fa-chart-line',
            'color': 'primary',
            'estimated_tokens': 400
        },
        {
            'id': 'analysis',
            'nom': 'Evolución de Registros',
            'description': 'Visualización de la evolución temporal de incidentes',
            'icon': 'fa-trending-up',
            'color': 'info',
            'estimated_tokens': 350
        },
        {
            'id': 'performance',
            'nom': 'Actividad por Usuario',
            'description': 'Distribución de actividad y resoluciones por usuario',
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
    agencies = Agencia.query.order_by(Agencia.nombre).all()
    
    return render_template('etats/generer.html',
                         types_etats=types_etats,
                         periodes=periodes,
                         agencies=agencies)


@app.route('/etats/generer', methods=['POST'])
def etats_generer_post():
    """Traitement de la génération d'un état"""
    try:
        # Récupérer les paramètres du formulaire
        type_etat = request.form.get('type_etat', 'summary')
        periode = request.form.get('periode', 'current_month')
        titre = request.form.get('titre', '').strip()
        prompt_personnalise = request.form.get('prompt_personnalise', '').strip()
        agence_id = request.form.get('agence_id', '').strip()
        
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
                'summary': 'Estado General',
                'analysis': 'Evolución de Registros',
                'performance': 'Actividad por Usuario',
                'custom': 'Análisis Personalizado'
            }
            titre = f"{type_names.get(type_etat, 'Informe')} - {datetime.now().strftime('%d/%m/%Y')}"
        
        # Crear el informe en base de datos (estado: generating)
        parametres_dict = {
            'periode': periode,
            'prompt_personnalise': prompt_personnalise,
            'agence_id': int(agence_id) if agence_id.isdigit() else None,
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
        flash(f'Error durante la generación: {str(e)}', 'error')
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
                # Persister statut='error' et contenu_ia (évite boucle infinie « generating »)
                db.session.commit()
        
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
            db.session.commit()
            flash('Error durante la regeneración', 'error')
        
        return redirect(url_for('etats_detail', id=id))
        
    except Exception as e:
        flash(f'Error durante la regeneración: {str(e)}', 'error')
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
        flash(f'Error durante la eliminación: {str(e)}', 'error')
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


def _parse_parametres_dict(etat):
    """parametres est stocké en JSON texte dans le modèle Etat."""
    if not etat.parametres:
        return {}
    if isinstance(etat.parametres, dict):
        return etat.parametres
    try:
        return json.loads(etat.parametres)
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}


def _etats_use_ai():
    """False par défaut : génération locale sans appel réseau. True = Kimi (si configuré)."""
    return bool(current_app.config.get('ETATS_USE_AI', False))


def _build_etat_content_local(etat, data_context):
    """
    Contenu déterministe pour les templates (sans API IA).
    Structure alignée sur presentation/templates/etats/detail.html.
    """
    tc = int(data_context.get('total_incidents') or 0)
    tr = float(data_context.get('taux_resolution') or 0)
    periode = data_context.get('periode') or ''

    if etat.type_etat == 'analysis':
        tendances = []
        evolution = data_context.get('evolution') or []
        if tc == 0:
            tendances.append('No hay incidentes en el período seleccionado.')
        else:
            tendances.append(f'Volumen total: {tc} incidente(s) en el período analizado.')
            tendances.append(f'Tasa de resolución (Solucionadas): {tr} %.')
            tendances.append(
                f'Bitrix (intervención en terreno): {int(data_context.get("incidents_bitrix") or 0)}.'
            )
            if data_context.get('agence_label'):
                tendances.append(f'Agencia considerada: {data_context.get("agence_label")}.')
        return {
            'tendances_principales': tendances,
            'evolution': evolution,
            'agence_label': data_context.get('agence_label'),
        }

    if etat.type_etat == 'custom':
        params = _parse_parametres_dict(etat)
        prompt = (params.get('prompt_personnalise') or '').strip()
        lines = [
            'Informe generado sin conexión a IA (modo local).',
            '',
            'Solicitud del usuario:',
            prompt or '(sin pregunta personalizada)',
            '',
            'Resumen cuantitativo del periodo:',
            f"- Periodo: {periode}",
            f"- Total incidentes: {tc}",
            f"- Resueltos (Solucionadas): {int(data_context.get('incidents_resolus') or 0)}",
            f"- Pendientes: {int(data_context.get('incidents_en_cours') or 0)}",
            f"- Bitrix: {int(data_context.get('incidents_bitrix') or 0)}",
            f"- Tasa de resolucion: {tr} %",
            f"- Clientes impactados (unicos): {int(data_context.get('nombre_clients_impactes') or 0)}",
            f"- Operadores activos: {int(data_context.get('nombre_operateurs_actifs') or 0)}",
        ]
        return {'analyse_personnalisee': '\n'.join(lines)}

    if etat.type_etat == 'performance':
        user_activity = data_context.get('activite_utilisateurs') or []
        return {
            'resume_executif': (
                f'Actividad por usuario para {periode}. '
                f'Total incidentes: {tc}. Solucionadas: {int(data_context.get("incidents_resolus") or 0)}. '
                f'Bitrix (terreno): {int(data_context.get("incidents_bitrix") or 0)}.'
            ),
            'activite_utilisateurs': user_activity,
            'agence_label': data_context.get('agence_label'),
            'kpis_cles': {
                'USUARIOS_ACTIVOS': str(int(data_context.get('nombre_operateurs_actifs') or 0)),
                'TOTAL_INCIDENTES': str(tc),
                'SOLUCIONADAS': str(int(data_context.get('incidents_resolus') or 0)),
                'BITRIX_TERRENO': str(int(data_context.get('incidents_bitrix') or 0)),
            },
        }

    # summary, ou tout autre type : état général en comptages
    resume = (
        f"Período analizado: {periode}. "
        f"Se registran {tc} incidente(s) con una tasa de resolución de {tr} %."
    )
    points_pos = []
    points_att = []
    if tc == 0:
        points_att.append(
            'No hay incidentes en el período seleccionado. Verifique las fechas o la carga de datos.'
        )
    else:
        points_pos.append(f'{tc} incidente(s) considerados para el análisis.')
        if tr >= 70:
            points_pos.append(f'Tasa de resolución alta ({tr} %).')
        elif tr < 40:
            points_att.append(
                f'Tasa de resolución baja ({tr} %). Priorice el tratamiento de los casos pendientes.'
            )

    op = data_context.get('operateurs_performance') or {}
    if op:
        best_name, best_stats = max(
            op.items(),
            key=lambda item: item[1].get('resolus', 0) / max(item[1].get('total', 1), 1),
        )
        points_pos.append(
            f'Operador con mejor ratio resuelto/total (indicativo): {best_name}.'
        )

    kpis = {
        'TOTAL_INCIDENTS': str(tc),
        'TAUX_RESOLUTION': f'{tr} %',
        'PENDIENTES': str(int(data_context.get('incidents_en_cours') or 0)),
        'BITRIX': str(int(data_context.get('incidents_bitrix') or 0)),
        'SOLUCIONADAS_DISTANCIA': str(int(data_context.get('incidents_resolus') or 0)),
    }
    recs = [
        'Continuar el seguimiento de incidentes en estado Pendiente.',
        'Verificar la coherencia de estados (Solucionadas / Bitrix) para afinar los indicadores.',
    ]
    if etat.type_etat == 'performance' and op:
        recs.append(
            'Comparar carga (total) y resoluciones por operador para equilibrar la distribución si es necesario.'
        )

    return {
        'resume_executif': resume,
        'points_positifs': points_pos,
        'points_attention': points_att,
        'kpis_cles': kpis,
        'recommandations': recs,
        'agence_label': data_context.get('agence_label'),
    }


def _generate_etat_content(etat):
    """Génère le contenu d'un informe (mode local par défaut, Kimi si ETATS_USE_AI)."""
    try:
        data_context = _collect_data_context(etat)
        if data_context.get('error'):
            etat.statut = 'error'
            etat.contenu_ia = json.dumps(
                {
                    'error': f"Error de recopilación de datos: {data_context.get('error')}",
                },
                ensure_ascii=False,
            )
            etat.date_modification = datetime.utcnow()
            return False

        if _etats_use_ai():
            from core.services.kimi_service import get_kimi_service

            kimi_service = get_kimi_service()
            params = _parse_parametres_dict(etat)
            if etat.type_etat == 'summary':
                result = kimi_service.generate_executive_summary(data_context)
            elif etat.type_etat == 'analysis':
                result = kimi_service.generate_trend_analysis(data_context)
            elif etat.type_etat == 'custom':
                prompt = params.get('prompt_personnalise', '')
                result = kimi_service.generate_custom_analysis(prompt, data_context)
            else:
                result = kimi_service.generate_executive_summary(data_context)

            if result['success']:
                etat.contenu_ia = json.dumps(result['data'], ensure_ascii=False)
                etat.statut = 'generated'
                etat.date_modification = datetime.utcnow()
                if 'usage' in result:
                    parametres = params if params else _parse_parametres_dict(etat)
                    parametres = dict(parametres)
                    parametres['usage'] = result['usage']
                    etat.parametres = json.dumps(parametres, ensure_ascii=False)
                return True

            etat.statut = 'error'
            etat.contenu_ia = json.dumps(
                {'error': result.get('error', 'Error desconocido')},
                ensure_ascii=False,
            )
            etat.date_modification = datetime.utcnow()
            return False

        local_data = _build_etat_content_local(etat, data_context)
        etat.contenu_ia = json.dumps(local_data, ensure_ascii=False)
        etat.statut = 'generated'
        etat.date_modification = datetime.utcnow()
        return True

    except Exception as e:
        etat.statut = 'error'
        etat.contenu_ia = json.dumps({'error': str(e)}, ensure_ascii=False)
        etat.date_modification = datetime.utcnow()
        return False


def _collect_data_context(etat):
    """Helper: Collecter le contexte de données pour l'IA"""
    try:
        # Filtrar según el período del informe y por agencia (si aplica)
        query = Incident.query
        params = _parse_parametres_dict(etat)
        agence_id = None
        agence_label = 'Todas las agencias'
        if params.get('agence_id'):
            agence_id = int(params.get('agence_id'))
            query = query.filter(Incident.operateur.has(id_agencia=agence_id))
            agence = Agencia.query.get(agence_id)
            if agence:
                agence_label = agence.nombre
        elif current_user.is_authenticated and not current_user.is_admin():
            agence_id = current_user.id_agencia
            query = query.filter(Incident.operateur.has(id_agencia=agence_id))
            agence_label = current_user.agencia.nombre if current_user.agencia else 'Mi agencia'
        
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
        
        # Performance des opérateurs + activité utilisateur
        operateurs_performance = {}
        activite_utilisateurs = {}
        for incident in incidents:
            if incident.operateur:
                nom_op = incident.operateur.nom
                if nom_op not in operateurs_performance:
                    operateurs_performance[nom_op] = {'total': 0, 'resolus': 0}
                operateurs_performance[nom_op]['total'] += 1
                if incident.status == 'Solucionadas':
                    operateurs_performance[nom_op]['resolus'] += 1
                if nom_op not in activite_utilisateurs:
                    activite_utilisateurs[nom_op] = {'total': 0, 'solucionadas': 0, 'bitrix': 0}
                activite_utilisateurs[nom_op]['total'] += 1
                if incident.status == 'Solucionadas':
                    activite_utilisateurs[nom_op]['solucionadas'] += 1
                if incident.status == 'Bitrix':
                    activite_utilisateurs[nom_op]['bitrix'] += 1

        # Série d'évolution temporelle (par jour)
        evolution_map = {}
        for incident in incidents:
            day_key = incident.date_heure.strftime('%Y-%m-%d')
            if day_key not in evolution_map:
                evolution_map[day_key] = {'count': 0, 'solucionadas': 0, 'bitrix': 0}
            evolution_map[day_key]['count'] += 1
            if incident.status == 'Solucionadas':
                evolution_map[day_key]['solucionadas'] += 1
            if incident.status == 'Bitrix':
                evolution_map[day_key]['bitrix'] += 1
        evolution = [
            {
                'label': day,
                'count': evolution_map[day]['count'],
                'solucionadas': evolution_map[day]['solucionadas'],
                'bitrix': evolution_map[day]['bitrix'],
            }
            for day in sorted(evolution_map.keys())
        ]
        
        # Construire le contexte
        periode_str = "Período personalizado"
        if etat.periode_debut and etat.periode_fin:
            periode_str = f"{etat.periode_debut.strftime('%d/%m/%Y')} - {etat.periode_fin.strftime('%d/%m/%Y')}"
        elif etat.periode_debut:
            periode_str = f"Desde el {etat.periode_debut.strftime('%d/%m/%Y')}"
        
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
            'nombre_operateurs_actifs': len(set(i.id_operateur for i in incidents if i.id_operateur)),
            'agence_id': agence_id,
            'agence_label': agence_label,
            'evolution': evolution,
            'activite_utilisateurs': [
                {
                    'usuario': nom,
                    'total': stats.get('total', 0),
                    'solucionadas': stats.get('solucionadas', 0),
                    'bitrix': stats.get('bitrix', 0),
                }
                for nom, stats in sorted(
                    activite_utilisateurs.items(),
                    key=lambda item: item[1].get('total', 0),
                    reverse=True,
                )
            ],
        }
        
    except Exception as e:
        return {
            'periode': 'Error de recopilación',
            'total_incidents': 0,
            'error': str(e)
        }