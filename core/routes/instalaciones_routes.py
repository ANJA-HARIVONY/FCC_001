#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas GPS y fotos de instalación en la ficha de cliente."""

from flask import request, redirect, url_for, flash, abort, send_file
from flask_babel import gettext
from flask_login import current_user, login_required

from core.app import app, admin_required, Client
from core.services.materiales_service import MaterialesValidationError
from core.services.instalaciones_service import (
    delete_instalacion_foto,
    resolve_instalacion_foto_file,
    save_client_gps,
    save_instalacion_fotos,
)


def _client_or_404(client_id):
    return Client.query.get_or_404(client_id)


def _redirect_fiche(client_id):
    return redirect(url_for('fiche_client', id=client_id))


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
