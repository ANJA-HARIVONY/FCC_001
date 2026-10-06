#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas del módulo de trazabilidad de materiales."""

from datetime import date, datetime, timedelta

from flask import render_template, request, redirect, url_for, flash, jsonify, abort, send_file
from flask_babel import gettext
from flask_login import current_user

from sqlalchemy import func, or_

from core.app import (
    app,
    admin_required,
    Instalacion,
    Material,
    Operateur,
    db,
    MATERIAL_TIPOS,
    MATERIAL_TIPO_LABELS,
    SALIDA_ESTADOS,
    SALIDA_ESTADO_LABELS,
    SALIDA_TIPOS,
    SALIDA_TIPO_LABELS,
    categoria_operateur_label,
    normalize_categoria_operateur,
)
from core.services.materiales_service import (
    MaterialesValidationError,
    create_material,
    update_material,
    create_salida,
    update_salida,
    delete_salida,
    salidas_base_query,
    apply_salida_list_filters,
    clamp_list_per_page,
    get_salidas_material_filter_options,
    salida_resumen_lineas,
    build_informe_page_data,
    get_informe_material_filter_options,
    parse_informe_filters,
    get_tecnico_material_rows,
    resolve_material_foto_file,
)
from core.services.materiales_export_service import (
    build_informe_export_filename,
    build_informe_workbook,
    build_salidas_export_filename,
    build_salidas_list_workbook,
)


def _agencia_scope():
    if current_user.is_superadmin():
        return None
    return current_user.id_agencia


def _ciudad_scope():
    if current_user.is_superadmin():
        return None
    return current_user.id_ciudad


def _tecnicos_agencia():
    query = Operateur.query.filter_by(categoria='tecnico', actif=True)
    agencia_id = _agencia_scope()
    ciudad_id = _ciudad_scope()
    if agencia_id:
        query = query.filter_by(id_agencia=agencia_id)
    if ciudad_id:
        query = query.filter_by(id_ciudad=ciudad_id)
    return query.order_by(Operateur.nom).all()


def _materiales_activos():
    return Material.query.filter_by(activo=True).order_by(Material.tipo, Material.nombre).all()


_CATALOGO_SORTS = ('nombre', 'modelo')


def _catalogo_sort_params():
    """Tri de la liste catalogue : nombre ou modelo, asc/desc."""
    sort_by = (request.args.get('sort') or '').strip()
    sort_order = (request.args.get('order') or '').strip().lower()
    if sort_by not in _CATALOGO_SORTS:
        sort_by = ''
        sort_order = ''
    elif sort_order not in ('asc', 'desc'):
        sort_order = 'asc'
    return sort_by, sort_order


def _apply_catalogo_sort(query, sort_by, sort_order):
    if sort_by == 'nombre':
        col = Material.nombre.asc() if sort_order == 'asc' else Material.nombre.desc()
        return query.order_by(col, Material.id.asc())
    if sort_by == 'modelo':
        modelo = func.coalesce(Material.modelo, '')
        col = modelo.asc() if sort_order == 'asc' else modelo.desc()
        return query.order_by(col, Material.nombre.asc(), Material.id.asc())
    return query.order_by(Material.tipo.asc(), Material.nombre.asc(), Material.id.asc())


def _informe_filter_url_kwargs(filters):
    """Parámetros de filtro para paginación y export."""
    kwargs = {}
    if filters.get('tecnico_id'):
        kwargs['tecnico'] = filters['tecnico_id']
    if filters.get('material_id'):
        kwargs['material'] = filters['material_id']
    if filters.get('tipo_salida'):
        kwargs['tipo_salida'] = filters['tipo_salida']
    return kwargs


def _informe_tecnicos_query(agencia_id=None, ciudad_id=None):
    query = Operateur.query.filter_by(categoria='tecnico', actif=True)
    if agencia_id:
        query = query.filter_by(id_agencia=agencia_id)
    if ciudad_id:
        query = query.filter_by(id_ciudad=ciudad_id)
    return query.order_by(Operateur.nom).all()


@app.route('/uploads/materiales/<path:filename>')
@admin_required
def serve_material_foto(filename):
    path = resolve_material_foto_file(filename)
    if not path:
        abort(404)
    return send_file(path)


@app.route('/materiales')
@admin_required
def materiales_hub():
    total_materiales = Material.query.count()
    total_salidas = salidas_base_query(_agencia_scope(), _ciudad_scope()).count()
    return render_template(
        'materiales/hub.html',
        total_materiales=total_materiales,
        total_salidas=total_salidas,
    )


@app.route('/materiales/catalogo', methods=['GET', 'POST'])
@admin_required
def materiales_catalogo():
    tipo_filter = (request.args.get('tipo') or '').strip()
    if tipo_filter not in MATERIAL_TIPOS:
        tipo_filter = ''
    sort_by, sort_order = _catalogo_sort_params()
    query = Material.query
    if tipo_filter:
        query = query.filter_by(tipo=tipo_filter)
    materiales = _apply_catalogo_sort(query, sort_by, sort_order).all()

    if request.method == 'POST':
        action = (request.form.get('action') or '').strip()
        foto = request.files.get('foto')
        try:
            if action == 'create':
                create_material(request.form, current_user, foto_file=foto)
                flash('Material creado.', 'success')
            elif action == 'update':
                mid = request.form.get('material_id', type=int)
                if not mid:
                    raise MaterialesValidationError('Material no indicado.')
                update_material(mid, request.form, current_user, foto_file=foto)
                flash('Material actualizado.', 'success')
            else:
                flash('Acción no válida.', 'error')
        except MaterialesValidationError as exc:
            db.session.rollback()
            flash(str(exc), 'error')
        return redirect(url_for(
            'materiales_catalogo',
            tipo=tipo_filter or None,
            sort=sort_by or None,
            order=sort_order or None,
        ))

    return render_template(
        'materiales/catalogo.html',
        materiales=materiales,
        tipo_filter=tipo_filter,
        sort_by=sort_by,
        sort_order=sort_order,
        material_tipos=MATERIAL_TIPOS,
        tipo_labels=MATERIAL_TIPO_LABELS,
    )


@app.route('/materiales/salida/nueva', methods=['GET', 'POST'])
@admin_required
def materiales_salida_nueva():
    tipo_salida = (request.form.get('tipo_salida') or request.args.get('tipo') or '').strip()
    if request.method == 'GET' and tipo_salida not in SALIDA_TIPOS:
        flash('Seleccione el tipo de salida.', 'error')
        return redirect(url_for('materiales_salidas'))

    materiales = _materiales_activos()
    instalacion = None
    instalacion_id = request.form.get('id_instalacion', type=int) or request.args.get('instalacion', type=int)
    if tipo_salida == 'instalacion':
        if not instalacion_id:
            flash(gettext('El material de una instalación se registra desde «Nueva instalación».'), 'info')
            return redirect(url_for('instalaciones_nueva'))
        from core.services.instalaciones_service import scoped_instalaciones_query

        instalacion = scoped_instalaciones_query().filter(Instalacion.id == instalacion_id).first()
        if not instalacion:
            abort(404)

    if request.method == 'POST':
        try:
            salida = create_salida(request.form, current_user)
            flash('Salida registrada.', 'success')
            if instalacion is not None:
                return redirect(url_for('instalaciones_detalle', instalacion_id=salida.id_instalacion))
            return redirect(url_for('materiales_salida_detalle', salida_id=salida.id))
        except MaterialesValidationError as exc:
            db.session.rollback()
            flash(str(exc), 'error')
            tipo_salida = (request.form.get('tipo_salida') or tipo_salida).strip()

    return render_template(
        'materiales/salida_form.html',
        salida=None,
        instalacion=instalacion,
        materiales=materiales,
        tipo_labels=MATERIAL_TIPO_LABELS,
        salida_tipo_labels=SALIDA_TIPO_LABELS,
        tipo_salida=tipo_salida,
        fecha_default=date.today().strftime('%Y-%m-%d'),
        form_action=url_for('materiales_salida_nueva'),
        page_title=(
            gettext('Añadir material a la instalación #%(id)s', id=instalacion.id)
            if instalacion
            else gettext('Nueva salida de material')
        ),
    )


def _paginated_salidas_from_request():
    """Lista paginada de salidas y metadatos de filtros (lista y export Excel)."""
    page = request.args.get('page', 1, type=int)
    per_page = clamp_list_per_page(request.args.get('per_page', type=int))
    agencia_id = _agencia_scope()
    ciudad_id = _ciudad_scope()
    query = apply_salida_list_filters(salidas_base_query(agencia_id, ciudad_id), request.args)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    materiales_filter = get_salidas_material_filter_options(agencia_id, ciudad_id)
    tecnicos = _tecnicos_agencia()
    return {
        'pagination': pagination,
        'salidas': pagination.items,
        'estado_labels': SALIDA_ESTADO_LABELS,
        'salida_estados': SALIDA_ESTADOS,
        'salida_tipos': SALIDA_TIPOS,
        'salida_tipo_labels': SALIDA_TIPO_LABELS,
        'tecnicos': tecnicos,
        'materiales_filter': materiales_filter,
        'filters': request.args,
        'search_query': (request.args.get('search') or '').strip(),
        'per_page': per_page,
    }


@app.route('/materiales/salidas')
@admin_required
def materiales_salidas():
    context = _paginated_salidas_from_request()
    context['open_nueva_modal'] = request.args.get('nueva') == '1'
    return render_template('materiales/salidas.html', **context)


@app.route('/materiales/salidas/export.xlsx')
@admin_required
def materiales_salidas_export_xlsx():
    """Exportar la página actual de salidas en Excel (.xlsx)."""
    try:
        context = _paginated_salidas_from_request()
        buffer = build_salidas_list_workbook(context['salidas'])
        return send_file(
            buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=build_salidas_export_filename(),
        )
    except Exception as exc:
        flash(f'Error al exportar las salidas: {exc}', 'error')
        return redirect(url_for('materiales_salidas', **request.args.to_dict()))


@app.route('/materiales/salidas/<int:salida_id>')
@admin_required
def materiales_salida_detalle(salida_id):
    from core.app import MaterialSalida

    salida = (
        salidas_base_query(_agencia_scope(), _ciudad_scope())
        .filter(MaterialSalida.id == salida_id)
        .first_or_404()
    )
    return render_template(
        'materiales/salida_detalle.html',
        salida=salida,
        estado_labels=SALIDA_ESTADO_LABELS,
        tipo_labels=MATERIAL_TIPO_LABELS,
        salida_tipo_labels=SALIDA_TIPO_LABELS,
        resumen=salida_resumen_lineas(salida),
    )


@app.route('/materiales/salidas/<int:salida_id>/modificar', methods=['GET', 'POST'])
@admin_required
def materiales_salida_modificar(salida_id):
    from core.app import MaterialSalida

    salida = (
        salidas_base_query(_agencia_scope(), _ciudad_scope())
        .filter(MaterialSalida.id == salida_id)
        .first_or_404()
    )
    linea_ids = [l.id_material for l in salida.lineas]
    query = Material.query
    if linea_ids:
        query = query.filter(or_(Material.activo.is_(True), Material.id.in_(linea_ids)))
    else:
        query = query.filter(Material.activo.is_(True))
    materiales = query.order_by(Material.tipo, Material.nombre).all()

    if request.method == 'POST':
        try:
            update_salida(salida.id, request.form, current_user)
            flash('Salida actualizada.', 'success')
            return redirect(url_for('materiales_salida_detalle', salida_id=salida.id))
        except MaterialesValidationError as exc:
            flash(str(exc), 'error')

    return render_template(
        'materiales/salida_form.html',
        salida=salida,
        instalacion=None,
        materiales=materiales,
        tipo_labels=MATERIAL_TIPO_LABELS,
        salida_tipo_labels=SALIDA_TIPO_LABELS,
        tipo_salida=getattr(salida, 'tipo_salida', None) or 'uso_interno',
        fecha_default=salida.fecha.strftime('%Y-%m-%d'),
        form_action=url_for('materiales_salida_modificar', salida_id=salida.id),
        page_title=f'Modificar salida #{salida.id}',
    )


@app.route('/materiales/salidas/<int:salida_id>/supprimer', methods=['POST'])
@admin_required
def materiales_salida_supprimer(salida_id):
    from core.app import MaterialSalida

    salidas_base_query(_agencia_scope(), _ciudad_scope()).filter(
        MaterialSalida.id == salida_id
    ).first_or_404()
    try:
        delete_salida(salida_id, current_user)
        flash(gettext('Salida eliminada.'), 'success')
    except MaterialesValidationError as exc:
        db.session.rollback()
        flash(str(exc), 'error')
    return redirect(url_for('materiales_salidas'))


@app.route('/materiales/informe')
@admin_required
def materiales_informe():
    date_from = (request.args.get('date_from') or '').strip()
    date_to = (request.args.get('date_to') or '').strip()
    page = request.args.get('page', 1, type=int)
    agencia_id = _agencia_scope()
    ciudad_id = _ciudad_scope()
    informe_filters = parse_informe_filters(request.args)

    if not date_from and not date_to:
        date_to = date.today().strftime('%Y-%m-%d')
        date_from = (date.today() - timedelta(days=30)).strftime('%Y-%m-%d')

    detail_lineas = []
    resumen = None
    error = None
    pagination = None
    if date_from and date_to:
        try:
            all_lineas, resumen = build_informe_page_data(
                date_from, date_to, agencia_id, filters=informe_filters, ciudad_id=ciudad_id,
            )
            per_page = 50
            start = (page - 1) * per_page
            end = start + per_page
            detail_lineas = all_lineas[start:end]
            total = len(all_lineas)
            total_pages = max(1, (total + per_page - 1) // per_page)
            pagination = {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': total_pages,
                'has_prev': page > 1,
                'has_next': page < total_pages,
                'prev_num': page - 1,
                'next_num': page + 1,
            }
        except MaterialesValidationError as exc:
            error = str(exc)

    tecnicos = _informe_tecnicos_query(agencia_id, ciudad_id)
    materiales_filter = get_informe_material_filter_options(date_from, date_to, agencia_id, ciudad_id)
    filter_url_kwargs = _informe_filter_url_kwargs(informe_filters)

    return render_template(
        'materiales/informe.html',
        detail_lineas=detail_lineas,
        resumen=resumen,
        pagination=pagination,
        date_from=date_from,
        date_to=date_to,
        informe_filters=informe_filters,
        filter_url_kwargs=filter_url_kwargs,
        tecnicos=tecnicos,
        materiales_filter=materiales_filter,
        salida_tipos=SALIDA_TIPOS,
        error=error,
        tipo_labels=MATERIAL_TIPO_LABELS,
        salida_tipo_labels=SALIDA_TIPO_LABELS,
    )


@app.route('/materiales/informe/export.xlsx')
@admin_required
def materiales_informe_export_xlsx():
    date_from = (request.args.get('date_from') or '').strip()
    date_to = (request.args.get('date_to') or '').strip()
    informe_filters = parse_informe_filters(request.args)
    filter_url_kwargs = _informe_filter_url_kwargs(informe_filters)

    if not date_from or not date_to:
        flash('Indique el período del informe antes de exportar.', 'error')
        return redirect(url_for('materiales_informe'))

    try:
        buffer = build_informe_workbook(
            date_from, date_to, _agencia_scope(), filters=informe_filters, ciudad_id=_ciudad_scope(),
        )
        return send_file(
            buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=build_informe_export_filename(),
        )
    except MaterialesValidationError as exc:
        flash(str(exc), 'error')
    except Exception as exc:
        flash(f'Error al exportar el informe: {exc}', 'error')
    return redirect(url_for(
        'materiales_informe',
        date_from=date_from,
        date_to=date_to,
        **filter_url_kwargs,
    ))


@app.route('/tecnicos/<int:tecnico_id>/ficha')
@admin_required
def tecnico_ficha(tecnico_id):
    tecnico = Operateur.query.get_or_404(tecnico_id)
    if normalize_categoria_operateur(tecnico.categoria) != 'tecnico':
        flash('Este usuario no es un técnico.', 'error')
        return redirect(url_for('usuarios'))

    if _agencia_scope() and (
        tecnico.id_agencia != _agencia_scope() or tecnico.id_ciudad != _ciudad_scope()
    ):
        abort(404)
    rows = get_tecnico_material_rows(tecnico.id, _agencia_scope(), ciudad_id=_ciudad_scope())
    return render_template(
        'materiales/tecnico_ficha.html',
        tecnico=tecnico,
        rows=rows,
        categoria_label=categoria_operateur_label(tecnico.categoria),
        tipo_labels=MATERIAL_TIPO_LABELS,
    )


@app.route('/api/tecnicos-search')
@admin_required
def api_tecnicos_search():
    query = Operateur.query.filter_by(categoria='tecnico', actif=True)
    agencia_id = _agencia_scope()
    ciudad_id = _ciudad_scope()
    if agencia_id:
        query = query.filter_by(id_agencia=agencia_id)
    if ciudad_id:
        query = query.filter_by(id_ciudad=ciudad_id)
    tecnicos = query.order_by(Operateur.nom).all()
    return jsonify([
        {
            'id': t.id,
            'nom': t.nom,
            'telephone': t.telephone,
            'agencia': t.agencia.nombre if t.agencia else '',
            'ciudad': t.ciudad.nombre if t.ciudad else '',
        }
        for t in tecnicos
    ])
