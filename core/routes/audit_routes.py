#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de trazabilidad (audit log)."""

from datetime import datetime, timedelta

from flask import flash, make_response, render_template, request
from flask_babel import gettext

from core.app import (
    AuditLog,
    Operateur,
    app,
    superadmin_required,
)


@app.route('/audit-log')
@superadmin_required
def audit_log():
    user_id = request.args.get('user_id', type=int)
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    page = request.args.get('page', 1, type=int)

    # Par défaut: 30 derniers jours
    if not date_from and not date_to:
        date_from_obj = datetime.now() - timedelta(days=30)
        date_to_obj = datetime.now()
        date_from = date_from_obj.strftime('%Y-%m-%d')
        date_to = date_to_obj.strftime('%Y-%m-%d')
    else:
        date_from_obj = None
        date_to_obj = None
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            except ValueError:
                flash(gettext('Formato inválido para fecha inicio.'), 'error')
                date_from = ''
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            except ValueError:
                flash(gettext('Formato inválido para fecha fin.'), 'error')
                date_to = ''

    query = AuditLog.query
    if user_id:
        query = query.filter(AuditLog.id_operateur == user_id)
    if date_from_obj:
        query = query.filter(AuditLog.date_heure >= date_from_obj)
    if date_to_obj:
        query = query.filter(AuditLog.date_heure <= date_to_obj)

    logs_paginated = query.order_by(AuditLog.date_heure.desc()).paginate(
        page=page,
        per_page=50,
        error_out=False,
    )
    users = Operateur.query.order_by(Operateur.nom).all()
    return render_template(
        'audit_log.html',
        logs=logs_paginated,
        users=users,
        selected_user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )


@app.route('/audit-log/export.txt')
@superadmin_required
def audit_log_export_txt():
    user_id = request.args.get('user_id', type=int)
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    date_from_obj = None
    date_to_obj = None
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
        except ValueError:
            date_from = ''
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        except ValueError:
            date_to = ''

    query = AuditLog.query
    if user_id:
        query = query.filter(AuditLog.id_operateur == user_id)
    if date_from_obj:
        query = query.filter(AuditLog.date_heure >= date_from_obj)
    if date_to_obj:
        query = query.filter(AuditLog.date_heure <= date_to_obj)

    rows = query.order_by(AuditLog.date_heure.desc()).all()
    lines = [
        'TRAZABILIDAD FCC_001',
        f'Generado: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'Filtros: user_id={user_id or "ALL"} | desde={date_from or "N/A"} | hasta={date_to or "N/A"}',
        '-' * 100,
    ]
    for row in rows:
        user_name = row.operateur.nom if row.operateur else 'N/A'
        lines.append(
            f'{row.date_heure.strftime("%Y-%m-%d %H:%M:%S")} | {user_name} | {row.action} | '
            f'IP={row.ip_address or "-"} | {row.detail or ""}'
        )

    payload = '\n'.join(lines) + '\n'
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    response = make_response(payload)
    response.headers['Content-Type'] = 'text/plain; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="audit_log_{timestamp}.txt"'
    return response
