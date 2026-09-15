#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas API para las apreciaciones diarias del dashboard."""

from datetime import datetime

from flask import jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from core.app import APRECIACION_TEXTO_MAX, ApreciacionDia, admin_required, app, db


def _parse_fecha(value):
    if not value or not str(value).strip():
        return None
    try:
        return datetime.strptime(str(value).strip()[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def _serialize_apreciacion(row, fecha=None):
    if row is None:
        return {
            'fecha': fecha.isoformat() if fecha else None,
            'texto': None,
        }
    return {
        'id': row.id,
        'fecha': row.fecha.isoformat(),
        'texto': row.texto,
        'id_operateur': row.id_operateur,
    }


@app.route('/api/apreciaciones', methods=['GET'])
@login_required
def api_get_apreciacion():
    fecha = _parse_fecha(request.args.get('fecha'))
    if fecha is None:
        return jsonify({'ok': False, 'error': 'Fecha inválida. Use YYYY-MM-DD.'}), 400
    row = ApreciacionDia.query.filter_by(fecha=fecha).first()
    return jsonify(_serialize_apreciacion(row, fecha))


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

    row = ApreciacionDia.query.filter_by(fecha=fecha).first()
    now = datetime.now()
    if row is None:
        row = ApreciacionDia(
            fecha=fecha,
            texto=texto,
            id_operateur=current_user.id,
            creado_en=now,
            modificado_en=now,
        )
        db.session.add(row)
    else:
        row.texto = texto
        row.id_operateur = current_user.id
        row.modificado_en = now

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        row = ApreciacionDia.query.filter_by(fecha=fecha).first()
        if row is None:
            return jsonify({'ok': False, 'error': 'No se pudo guardar la apreciación.'}), 500
        row.texto = texto
        row.id_operateur = current_user.id
        row.modificado_en = datetime.now()
        db.session.commit()
    return jsonify({'ok': True, **_serialize_apreciacion(row)})


@app.route('/api/apreciaciones', methods=['DELETE'])
@login_required
@admin_required
def api_delete_apreciacion():
    fecha = _parse_fecha(request.args.get('fecha'))
    if fecha is None:
        return jsonify({'ok': False, 'error': 'Fecha inválida. Use YYYY-MM-DD.'}), 400

    row = ApreciacionDia.query.filter_by(fecha=fecha).first()
    if row is None:
        return jsonify({'ok': False, 'error': 'No hay apreciación para esta fecha.'}), 404

    db.session.delete(row)
    db.session.commit()
    return jsonify({'ok': True, 'fecha': fecha.isoformat(), 'texto': None})
