#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de la ficha Atención al cliente (retrasos en cambio de estado)."""

from flask import render_template, request, redirect, url_for, flash, send_file

from core.app import (
    app,
    admin_required,
    Operateur,
    categoria_operateur_label,
    normalize_categoria_operateur,
)
from core.services.incident_status_delay_service import (
    STATUS_DELAY_TARGET_STATUSES,
    STATUS_DELAY_THRESHOLD_DEFAULT,
    build_status_delay_rows,
    paginate_rows,
    parse_ficha_filters,
)
from core.services.atencion_cliente_export_service import (
    build_status_delay_export_filename,
    build_status_delay_workbook,
)


def _load_atencion_cliente_or_redirect(user_id):
    usuario = Operateur.query.get_or_404(user_id)
    if normalize_categoria_operateur(usuario.categoria) != 'atencion_cliente':
        flash('Este usuario no es de Atención al cliente.', 'error')
        return None, redirect(url_for('usuarios'))
    return usuario, None


@app.route('/atencion-cliente/<int:user_id>/ficha')
@admin_required
def atencion_cliente_ficha(user_id):
    usuario, err = _load_atencion_cliente_or_redirect(user_id)
    if err:
        return err

    filters = parse_ficha_filters(request.args)
    rows, kpis = build_status_delay_rows(usuario.id, filters)
    page = request.args.get('page', 1, type=int)
    pagination = paginate_rows(rows, page=page, per_page=50)

    return render_template(
        'atencion_cliente/ficha.html',
        usuario=usuario,
        categoria_label=categoria_operateur_label(usuario.categoria),
        filters=filters,
        kpis=kpis,
        pagination=pagination,
        rows=pagination['items'],
        target_statuses=STATUS_DELAY_TARGET_STATUSES,
        umbral_default=STATUS_DELAY_THRESHOLD_DEFAULT,
    )


@app.route('/atencion-cliente/<int:user_id>/ficha/export.xlsx')
@admin_required
def atencion_cliente_ficha_export(user_id):
    usuario, err = _load_atencion_cliente_or_redirect(user_id)
    if err:
        return err

    filters = parse_ficha_filters(request.args)
    rows, kpis = build_status_delay_rows(usuario.id, filters)
    buffer = build_status_delay_workbook(usuario, rows, filters, kpis)
    filename = build_status_delay_export_filename(usuario)
    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename,
    )
