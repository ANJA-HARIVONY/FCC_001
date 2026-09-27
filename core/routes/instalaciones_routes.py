#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de instalaciones (estado, traslado) + GPS/fotos del sitio en ficha cliente."""

from datetime import date

from flask import request, redirect, url_for, flash, abort, send_file, render_template
from flask_babel import gettext
from flask_login import current_user, login_required
from sqlalchemy import or_

from core.app import (
    app,
    admin_required,
    db,
    Client,
    Instalacion,
    Material,
    Operateur,
    INSTALACION_ESTADOS,
    INSTALACION_TIPOS,
    TRASLADO_ACCIONES,
    TRASLADO_ACCION_LABELS,
)
from core.services.materiales_service import (
    MaterialesValidationError,
    clamp_list_per_page,
)
from core.services.instalaciones_service import (
    apply_instalacion_list_filters,
    create_instalacion,
    create_traslado,
    delete_instalacion_foto,
    instalaciones_base_query,
    reabrir_instalacion,
    resolve_instalacion_foto_file,
    save_client_gps,
    save_instalacion_fotos,
    terminar_instalacion,
    update_instalacion,
)


def _client_or_404(client_id):
    return Client.query.get_or_404(client_id)


def _instalacion_or_404(instalacion_id):
    instalacion = db.session.get(Instalacion, instalacion_id)
    if not instalacion:
        abort(404)
    return instalacion


def _redirect_fiche(client_id):
    return redirect(url_for('fiche_client', id=client_id))


def _redirect_detalle(instalacion_id):
    return redirect(url_for('instalaciones_detalle', instalacion_id=instalacion_id))


def _tecnicos_activos():
    return (
        Operateur.query.filter_by(categoria='tecnico', actif=True)
        .order_by(Operateur.nom)
        .all()
    )


@app.route('/instalaciones')
@admin_required
def instalaciones_hub():
    """Lista de instalaciones (nueva / traslado) con estado."""
    query = apply_instalacion_list_filters(instalaciones_base_query(), request.args)
    page = request.args.get('page', 1, type=int)
    per_page = clamp_list_per_page(request.args.get('per_page', type=int))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return render_template(
        'instalaciones/hub.html',
        pagination=pagination,
        instalaciones=pagination.items,
        tecnicos=_tecnicos_activos(),
        instalacion_estados=INSTALACION_ESTADOS,
        instalacion_tipos=INSTALACION_TIPOS,
        search_query=(request.args.get('search') or '').strip(),
        tecnico_filter=request.args.get('tecnico', '', type=str),
        estado_filter=(request.args.get('estado') or '').strip(),
        tipo_filter=(request.args.get('tipo') or '').strip(),
        date_from=(request.args.get('date_from') or '').strip(),
        date_to=(request.args.get('date_to') or '').strip(),
        per_page=per_page,
    )


@app.route('/instalaciones/nueva', methods=['GET', 'POST'])
@admin_required
def instalaciones_nueva():
    if request.method == 'POST':
        try:
            instalacion = create_instalacion(request.form, current_user)
            flash(gettext('Instalación registrada.'), 'success')
            return _redirect_detalle(instalacion.id)
        except MaterialesValidationError as exc:
            db.session.rollback()
            flash(str(exc), 'error')

    client_id = request.form.get('id_client', type=int) or request.args.get('client', type=int)
    client = db.session.get(Client, client_id) if client_id else None
    return render_template(
        'instalaciones/form.html',
        instalacion=None,
        client=client,
        materiales=Material.query.filter(Material.activo.is_(True)).order_by(Material.tipo, Material.nombre).all(),
        fecha_default=date.today().strftime('%Y-%m-%d'),
        form_action=url_for('instalaciones_nueva'),
        page_title=gettext('Nueva instalación'),
    )


@app.route('/instalaciones/<int:instalacion_id>')
@admin_required
def instalaciones_detalle(instalacion_id):
    instalacion = _instalacion_or_404(instalacion_id)
    return render_template('instalaciones/detalle.html', instalacion=instalacion)


@app.route('/instalaciones/<int:instalacion_id>/modificar', methods=['GET', 'POST'])
@admin_required
def instalaciones_modificar(instalacion_id):
    instalacion = _instalacion_or_404(instalacion_id)
    if request.method == 'POST':
        try:
            update_instalacion(instalacion.id, request.form, current_user)
            flash(gettext('Instalación actualizada.'), 'success')
            return _redirect_detalle(instalacion.id)
        except MaterialesValidationError as exc:
            db.session.rollback()
            flash(str(exc), 'error')

    return render_template(
        'instalaciones/form.html',
        instalacion=instalacion,
        client=instalacion.client,
        fecha_default=instalacion.fecha.strftime('%Y-%m-%d'),
        form_action=url_for('instalaciones_modificar', instalacion_id=instalacion.id),
        page_title=gettext('Modificar instalación #%(id)s', id=instalacion.id),
    )


@app.route('/instalaciones/<int:instalacion_id>/terminar', methods=['POST'])
@admin_required
def instalaciones_terminar(instalacion_id):
    _instalacion_or_404(instalacion_id)
    try:
        terminar_instalacion(instalacion_id, current_user)
        flash(gettext('Instalación terminada.'), 'success')
    except MaterialesValidationError as exc:
        db.session.rollback()
        flash(str(exc), 'error')
    return _redirect_detalle(instalacion_id)


@app.route('/instalaciones/<int:instalacion_id>/reabrir', methods=['POST'])
@admin_required
def instalaciones_reabrir(instalacion_id):
    _instalacion_or_404(instalacion_id)
    try:
        reabrir_instalacion(instalacion_id, current_user)
        flash(gettext('Instalación reabierta.'), 'success')
    except MaterialesValidationError as exc:
        db.session.rollback()
        flash(str(exc), 'error')
    return _redirect_detalle(instalacion_id)


@app.route('/clients/<int:id>/traslado', methods=['GET', 'POST'])
@admin_required
def client_traslado(id):
    client = _client_or_404(id)
    if request.method == 'POST':
        try:
            instalacion = create_traslado(client, request.form, current_user)
            flash(gettext('Traslado registrado. Añada el material nuevo con una salida de instalación.'), 'success')
            return _redirect_detalle(instalacion.id)
        except MaterialesValidationError as exc:
            db.session.rollback()
            flash(str(exc), 'error')

    linea_ids = []
    for salida in client.salidas_material or []:
        linea_ids.extend(l.id_material for l in salida.lineas or [])
    query = Material.query
    if linea_ids:
        query = query.filter(or_(Material.activo.is_(True), Material.id.in_(linea_ids)))
    else:
        query = query.filter(Material.activo.is_(True))
    return render_template(
        'instalaciones/traslado.html',
        client=client,
        materiales=query.order_by(Material.tipo, Material.nombre).all(),
        traslado_acciones=TRASLADO_ACCIONES,
        traslado_accion_labels=TRASLADO_ACCION_LABELS,
        fecha_default=date.today().strftime('%Y-%m-%d'),
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
        db.session.rollback()
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
        db.session.rollback()
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
