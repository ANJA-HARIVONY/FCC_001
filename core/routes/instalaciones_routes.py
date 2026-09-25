#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de instalaciones: salidas de material + GPS/fotos en ficha cliente."""

from flask import request, redirect, url_for, flash, abort, send_file, render_template
from flask_babel import gettext
from flask_login import current_user, login_required

from core.app import app, admin_required, Client, MaterialSalida, Operateur, SALIDA_TIPO_LABELS
from core.services.materiales_service import (
    MaterialesValidationError,
    apply_salida_list_filters,
    clamp_list_per_page,
    salidas_base_query,
)
from core.services.instalaciones_service import (
    delete_instalacion_foto,
    resolve_instalacion_foto_file,
    save_client_gps,
    save_instalacion_fotos,
)


def _agencia_scope():
    if current_user.is_admin():
        return None
    return current_user.id_agencia


def _client_or_404(client_id):
    return Client.query.get_or_404(client_id)


def _redirect_fiche(client_id):
    return redirect(url_for('fiche_client', id=client_id))


@app.route('/instalaciones')
@admin_required
def instalaciones_hub():
    """Lista de salidas tipo instalacion + acceso a nueva salida."""
    query = apply_salida_list_filters(
        salidas_base_query(_agencia_scope()).filter(MaterialSalida.tipo_salida == 'instalacion'),
        request.args,
    )
    page = request.args.get('page', 1, type=int)
    per_page = clamp_list_per_page(request.args.get('per_page', type=int))
    search_query = (request.args.get('search') or '').strip()
    tecnico_filter = request.args.get('tecnico', '', type=str)
    date_from = (request.args.get('date_from') or '').strip()
    date_to = (request.args.get('date_to') or '').strip()
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    tecnicos = (
        Operateur.query.filter_by(categoria='tecnico', actif=True)
        .order_by(Operateur.nom)
        .all()
    )
    return render_template(
        'instalaciones/hub.html',
        pagination=pagination,
        salidas=pagination.items,
        salida_tipo_labels=SALIDA_TIPO_LABELS,
        tecnicos=tecnicos,
        search_query=search_query,
        tecnico_filter=tecnico_filter,
        date_from=date_from,
        date_to=date_to,
        per_page=per_page,
    )


@app.route('/uploads/instalaciones/<path:filename>')
@login_required
def serve_instalacion_foto(filename):
    path = resolve_instalacion_foto_file(filename)
    if not path:
        abort(404)
    return send_file(path)


@app.route('/clients/<int:id>/gps', methods=['POST'])
@admin_required
def client_gps_actualizar(id):
    client = _client_or_404(id)
    try:
        save_client_gps(client, request.form, current_user)
        flash(gettext('Coordenadas GPS actualizadas.'), 'success')
    except MaterialesValidationError as exc:
        flash(str(exc), 'error')
    return _redirect_fiche(client.id)


@app.route('/clients/<int:id>/fotos', methods=['POST'])
@admin_required
def client_fotos_agregar(id):
    client = _client_or_404(id)
    try:
        save_instalacion_fotos(client, request.files.getlist('fotos'), current_user)
        flash(gettext('Fotos de la instalación guardadas.'), 'success')
    except MaterialesValidationError as exc:
        flash(str(exc), 'error')
    return _redirect_fiche(client.id)


@app.route('/clients/<int:id>/fotos/<int:foto_id>/eliminar', methods=['POST'])
@admin_required
def client_foto_eliminar(id, foto_id):
    client = _client_or_404(id)
    foto = next((f for f in (client.fotos_instalacion or []) if f.id == foto_id), None)
    if not foto:
        abort(404)
    try:
        delete_instalacion_foto(foto, current_user)
        flash(gettext('Foto eliminada.'), 'success')
    except MaterialesValidationError as exc:
        flash(str(exc), 'error')
    return _redirect_fiche(client.id)
