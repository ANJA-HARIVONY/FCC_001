#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mensaje de cabecera (información del día). Lectura para todos, escritura admin."""

from datetime import datetime

from flask import jsonify, request
from flask_babel import gettext
from flask_login import current_user, login_required

from core.app import (
    MENSAJE_INFO_TEXTO_MAX,
    MensajeInfo,
    admin_required,
    app,
    db,
    mensaje_info_row,
    mensaje_info_visible_texto,
    normalize_mensaje_info_texto,
    write_audit,
)


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'si', 'sí', 'yes', 'on')
    return False


def _payload(row, for_admin):
    if for_admin:
        return {
            'ok': True,
            'texto': row.texto if row else '',
            'activo': bool(row.activo) if row else False,
        }
    texto = mensaje_info_visible_texto()
    return {'ok': True, 'texto': texto, 'activo': bool(texto)}


@app.context_processor
def inject_mensaje_info():
    texto = ''
    try:
        if current_user.is_authenticated:
            texto = mensaje_info_visible_texto()
    except Exception:
        db.session.rollback()
        texto = ''
    return {
        'mensaje_info_texto': texto,
        'MENSAJE_INFO_TEXTO_MAX': MENSAJE_INFO_TEXTO_MAX,
    }


@app.route('/api/mensaje-info', methods=['GET'])
@login_required
def api_get_mensaje_info():
    row = mensaje_info_row() if current_user.is_admin() else None
    return jsonify(_payload(row, current_user.is_admin()))


@app.route('/api/mensaje-info', methods=['PUT'])
@login_required
@admin_required
def api_put_mensaje_info():
    payload = request.get_json(silent=True) or {}
    texto = normalize_mensaje_info_texto(payload.get('texto'))
    activo = _as_bool(payload.get('activo'))
    if len(texto) > MENSAJE_INFO_TEXTO_MAX:
        return jsonify({
            'ok': False,
            'error': gettext(
                'El mensaje no puede superar %(n)s caracteres.',
                n=MENSAJE_INFO_TEXTO_MAX,
            ),
        }), 400
    if activo and not texto:
        return jsonify({
            'ok': False,
            'error': gettext('Escriba un mensaje para activarlo.'),
        }), 400

    row = mensaje_info_row()
    now = datetime.now()
    if row is None:
        row = MensajeInfo(
            texto=texto,
            activo=activo,
            id_operateur=current_user.id,
            modificado_en=now,
        )
        db.session.add(row)
    else:
        row.texto = texto
        row.activo = activo
        row.id_operateur = current_user.id
        row.modificado_en = now
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception('No se pudo guardar mensaje_info')
        return jsonify({
            'ok': False,
            'error': gettext('No se pudo guardar el mensaje.'),
        }), 500

    estado = 'activo' if row.activo else 'inactivo'
    write_audit(
        'MENSAJE_INFO',
        id_operateur=current_user.id,
        detail=f'{estado}: {row.texto[:120]}',
    )
    return jsonify({'ok': True, 'texto': row.texto, 'activo': bool(row.activo)})
