#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulta filtrada y paginada de la lista de incidencias."""

from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload


def get_incidents_list_params(request):
    """Lee parámetros de la URL de /incidents."""
    return {
        'page': request.args.get('page', 1, type=int),
        'per_page': request.args.get('per_page', 50, type=int),
        'sort_by': request.args.get('sort', 'fecha'),
        'sort_order': request.args.get('order', 'desc'),
        'status_filter': request.args.get('status', ''),
        'search_query': request.args.get('search', ''),
        'date_from': request.args.get('date_from', ''),
        'date_to': request.args.get('date_to', ''),
        'operateur_filter': request.args.get('operateur', '', type=str),
        'ciudad_filter': request.args.get('ciudad', '', type=str),
        'agencia_filter': request.args.get('agencia', '', type=str),
        'flash_messages': [],
    }


def build_filtered_incidents_query(current_user, params):
    """
    Construye la consulta filtrada de incidencias.

    Returns:
        tuple: (query, params) con filtros normalizados.
    """
    from core.app import Agencia, Ciudad, Client, Incident, Operateur, db

    status_filter = params['status_filter']
    search_query = params['search_query']
    date_from = params['date_from']
    date_to = params['date_to']
    operateur_filter = params['operateur_filter']
    ciudad_filter = params['ciudad_filter']
    agencia_filter = params['agencia_filter']

    ciudad_id = None
    if ciudad_filter:
        try:
            ciudad_id = int(ciudad_filter)
            if not db.session.get(Ciudad, ciudad_id):
                ciudad_filter = ''
                ciudad_id = None
        except (ValueError, TypeError):
            ciudad_filter = ''
            ciudad_id = None

    agencia_id = None
    if agencia_filter:
        try:
            agencia_id = int(agencia_filter)
            agencia = db.session.get(Agencia, agencia_id)
            if not agencia:
                agencia_filter = ''
                agencia_id = None
            elif ciudad_id and agencia.id_ciudad != ciudad_id:
                agencia_filter = ''
                agencia_id = None
            elif not current_user.is_admin() and agencia_id != current_user.id_agencia:
                agencia_filter = ''
                agencia_id = None
        except (ValueError, TypeError):
            agencia_filter = ''
            agencia_id = None

    query = Incident.query.options(
        joinedload(Incident.client),
        joinedload(Incident.operateur),
    )

    if not current_user.is_admin():
        same_agency_ids = db.session.query(Operateur.id).filter(
            Operateur.id_agencia == current_user.id_agencia
        )
        query = query.filter(
            or_(
                Incident.id_operateur == current_user.id,
                Incident.id_operateur.in_(same_agency_ids),
            )
        )

    if status_filter:
        query = query.filter(Incident.status == status_filter)

    if operateur_filter:
        try:
            operateur_id = int(operateur_filter)
            if not current_user.is_admin():
                operateur_is_allowed = db.session.query(Operateur.id).filter(
                    Operateur.id == operateur_id,
                    Operateur.id_agencia == current_user.id_agencia,
                    Operateur.actif.is_(True),
                ).first()
                if not operateur_is_allowed:
                    operateur_filter = ''
                    operateur_id = None
            if operateur_filter:
                query = query.filter(Incident.id_operateur == operateur_id)
        except (ValueError, TypeError):
            operateur_filter = ''

    if search_query:
        query = query.join(Client).filter(
            or_(
                Incident.intitule.contains(search_query),
                Incident.observations.contains(search_query),
                Client.nom.contains(search_query),
            )
        )

    if ciudad_id:
        query = query.filter(Incident.client.has(id_ciudad=ciudad_id))

    if agencia_id:
        query = query.filter(Incident.operateur.has(id_agencia=agencia_id))

    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(Incident.date_heure >= date_from_obj)
        except ValueError:
            params['flash_messages'].append(
                ('Formato de fecha inválido para "Fecha desde"', 'warning')
            )
            date_from = ''

    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
            query = query.filter(Incident.date_heure <= date_to_obj)
        except ValueError:
            params['flash_messages'].append(
                ('Formato de fecha inválido para "Fecha hasta"', 'warning')
            )
            date_to = ''

    params.update({
        'status_filter': status_filter,
        'search_query': search_query,
        'date_from': date_from,
        'date_to': date_to,
        'operateur_filter': operateur_filter,
        'ciudad_filter': ciudad_filter,
        'agencia_filter': agencia_filter,
        'ciudad_id': ciudad_id,
        'agencia_id': agencia_id,
    })
    return query, params


def apply_incidents_sort(query, sort_by, sort_order):
    from core.app import Client, Incident, Operateur

    if sort_by == 'client':
        return query.join(Client).order_by(
            Client.nom.asc() if sort_order == 'asc' else Client.nom.desc()
        )
    if sort_by == 'asunto':
        return query.order_by(
            Incident.intitule.asc() if sort_order == 'asc' else Incident.intitule.desc()
        )
    if sort_by == 'operador':
        return query.join(Operateur).order_by(
            Operateur.nom.asc() if sort_order == 'asc' else Operateur.nom.desc()
        )
    if sort_by == 'fecha':
        return query.order_by(
            Incident.date_heure.asc() if sort_order == 'asc' else Incident.date_heure.desc()
        )
    return query.order_by(Incident.date_heure.desc())


def get_incidents_category_counts(query):
    from core.app import Client, Incident, db

    filtered_ids_subq = query.with_entities(Incident.id).subquery()
    corporativo_count = (
        db.session.query(func.count(Incident.id))
        .join(Client, Incident.id_client == Client.id)
        .filter(
            Incident.id.in_(filtered_ids_subq),
            Client.categoria == 'corporativo',
        )
        .scalar()
    ) or 0
    particular_count = (
        db.session.query(func.count(Incident.id))
        .join(Client, Incident.id_client == Client.id)
        .filter(
            Incident.id.in_(filtered_ids_subq),
            Client.categoria == 'particular',
        )
        .scalar()
    ) or 0
    return corporativo_count, particular_count


def get_incidents_filter_options(current_user, ciudad_id=None):
    from core.app import Agencia, Ciudad, Operateur

    operateurs = (
        Operateur.query.order_by(Operateur.nom).all()
        if current_user.is_admin()
        else Operateur.query.filter(
            Operateur.id_agencia == current_user.id_agencia,
            Operateur.actif.is_(True),
        ).order_by(Operateur.nom).all()
    )
    ciudades = Ciudad.query.order_by(Ciudad.nombre).all()
    if current_user.is_admin():
        agencias_query = Agencia.query
        if ciudad_id:
            agencias_query = agencias_query.filter_by(id_ciudad=ciudad_id)
        agencias = agencias_query.order_by(Agencia.nombre).all()
    else:
        agencias = Agencia.query.filter_by(id=current_user.id_agencia).order_by(Agencia.nombre).all()
        if ciudad_id and agencias and agencias[0].id_ciudad != ciudad_id:
            agencias = []
    return operateurs, ciudades, agencias
