#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas API para las apreciaciones diarias del dashboard."""

from datetime import datetime

from flask import jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from core.app import (
    APRECIACION_TEXTO_MAX,
    Agencia,
    ApreciacionDia,
    Ciudad,
    admin_required,
    apreciacion_write_scope,
    app,
    db,
)


def _parse_fecha(value):
    if not value or not str(value).strip():
        return None
    try:
        return datetime.strptime(str(value).strip()[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def _request_scope_ids():
    ciudad_raw = request.args.get('ciudad')
    agencia_raw = request.args.get('agencia')
    if request.method == 'PUT':
        payload = request.get_json(silent=True) or {}
        if payload.get('ciudad') or payload.get('agencia'):
            ciudad_raw = payload.get('ciudad')
            agencia_raw = payload.get('agencia')
    _ciudad_filter, _agencia_filter, ciudad_id, agencia_id = _scope_from_values(
        ciudad_raw, agencia_raw,
    )
    return apreciacion_write_scope(ciudad_id, agencia_id)


def _scope_from_values(ciudad_raw, agencia_raw):
    from core.services.incidents_list_service import normalize_ciudad_agencia_filters

    return normalize_ciudad_agencia_filters(current_user, ciudad_raw, agencia_raw)


def _scope_labels(id_ciudad, id_agencia):
    ciudad = db.session.get(Ciudad, id_ciudad) if id_ciudad else None
    agencia = db.session.get(Agencia, id_agencia) if id_agencia else None
    return (
        ciudad.nombre if ciudad else '',
        agencia.nombre if agencia else '',
    )


def _serialize_apreciacion(row, fecha, id_ciudad, id_agencia):
    ciudad_nombre, agencia_nombre = _scope_labels(id_ciudad, id_agencia)
    if row is None:
        return {
            'fecha': fecha.isoformat() if fecha else None,
            'texto': None,
            'ciudad': ciudad_nombre,
            'agencia': agencia_nombre,
        }
    return {
        'id': row.id,
        'fecha': row.fecha.isoformat(),
        'texto': row.texto,
        'id_operateur': row.id_operateur,
        'ciudad': ciudad_nombre,
        'agencia': agencia_nombre,
    }


def _note_for_scope(fecha, id_ciudad, id_agencia):
    return (
        ApreciacionDia.query.options(
            joinedload(ApreciacionDia.ciudad),
            joinedload(ApreciacionDia.agencia),
        )
        .filter_by(fecha=fecha, id_ciudad=id_ciudad, id_agencia=id_agencia)
        .first()
    )


@app.route('/api/apreciaciones', methods=['GET'])
@login_required
def api_get_apreciacion():
    fecha = _parse_fecha(request.args.get('fecha'))
    if fecha is None:
        return jsonify({'ok': False, 'error': 'Fecha inválida. Use YYYY-MM-DD.'}), 400
    id_ciudad, id_agencia = _request_scope_ids()
    row = _note_for_scope(fecha, id_ciudad, id_agencia)
    return jsonify(_serialize_apreciacion(row, fecha, id_ciudad, id_agencia))


@app.route('/api/apreciaciones', methods=['PUT'])
@login_required
@admin_required
def api_put_apreciacion():
    payload = request.get_json(silent=True) or {}
    fecha = _parse_fecha(payload.get('fecha'))
    if fecha is None:
        return jsonify({'ok': False, 'error': 'Fecha inválida. Use YYYY-MM-DD.'}), 400

    texto = (payload.get('texto') or '').strip()
    if not texto:
        return jsonify({'ok': False, 'error': 'La apreciación no puede estar vacía.'}), 400
    if len(texto) > APRECIACION_TEXTO_MAX:
        return jsonify({
            'ok': False,
            'error': f'La apreciación no puede superar {APRECIACION_TEXTO_MAX} caracteres.',
        }), 400

    id_ciudad, id_agencia = _request_scope_ids()
    row = _note_for_scope(fecha, id_ciudad, id_agencia)
    now = datetime.now()
    if row is None:
        row = ApreciacionDia(
            fecha=fecha,
            texto=texto,
            id_operateur=current_user.id,
            id_ciudad=id_ciudad,
            id_agencia=id_agencia,
            creado_en=now,
            modificado_en=now,
        )
        db.session.add(row)
    else:
        row.texto = texto
        row.modificado_en = now

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        row = _note_for_scope(fecha, id_ciudad, id_agencia)
        if row is None:
            return jsonify({'ok': False, 'error': 'No se pudo guardar la apreciación.'}), 500
        row.texto = texto
        row.modificado_en = datetime.now()
        db.session.commit()
    return jsonify({'ok': True, **_serialize_apreciacion(row, fecha, id_ciudad, id_agencia)})


@app.route('/api/apreciaciones', methods=['DELETE'])
@login_required
@admin_required
def api_delete_apreciacion():
    fecha = _parse_fecha(request.args.get('fecha'))
    if fecha is None:
        return jsonify({'ok': False, 'error': 'Fecha inválida. Use YYYY-MM-DD.'}), 400

    id_ciudad, id_agencia = _request_scope_ids()
    row = _note_for_scope(fecha, id_ciudad, id_agencia)
    if row is None:
        return jsonify({'ok': False, 'error': 'No hay apreciación para esta fecha.'}), 404

    db.session.delete(row)
    db.session.commit()
    return jsonify({
        'ok': True,
        'fecha': fecha.isoformat(),
        'texto': None,
        'ciudad': _scope_labels(id_ciudad, id_agencia)[0],
        'agencia': _scope_labels(id_ciudad, id_agencia)[1],
    })
