#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lógica de negocio — trazabilidad de materiales."""

from datetime import datetime

from sqlalchemy import desc
from sqlalchemy.orm import joinedload

MATERIAL_TIPO_LABELS = {
    'outillage': 'Herramientas',
    'material_cliente': 'Materiales de cliente',
}

SALIDA_ESTADO_LABELS = {
    'registrada': 'Registrada',
    'modificada': 'Modificada',
}


class MaterialesValidationError(ValueError):
    """Error de validación con mensaje en español para flash."""


def parse_lineas_form(form):
    """Extrae pares (id_material, cantidad) desde el formulario."""
    material_ids = form.getlist('material_id[]')
    cantidades = form.getlist('cantidad[]')
    if len(material_ids) != len(cantidades):
        raise MaterialesValidationError('Datos de líneas de material incompletos.')
    if not material_ids:
        raise MaterialesValidationError('Añada al menos un material.')

    lineas = []
    seen = set()
    for raw_mid, raw_qty in zip(material_ids, cantidades):
        if not raw_mid:
            continue
        try:
            mid = int(raw_mid)
            qty = int(raw_qty)
        except (TypeError, ValueError):
            raise MaterialesValidationError('Cantidad de material inválida.')
        if qty < 1:
            raise MaterialesValidationError('La cantidad debe ser mayor que 0.')
        if mid in seen:
            raise MaterialesValidationError('El material ya está en la lista.')
        seen.add(mid)
        lineas.append((mid, qty))

    if not lineas:
        raise MaterialesValidationError('Añada al menos un material.')
    return lineas


def _validate_tecnico(tecnico_id):
    from core.app import Operateur, normalize_categoria_operateur

    tecnico = Operateur.query.filter_by(id=tecnico_id, actif=True).first()
    if not tecnico:
        raise MaterialesValidationError('Seleccione un técnico válido.')
    if normalize_categoria_operateur(tecnico.categoria) != 'tecnico':
        raise MaterialesValidationError('El usuario seleccionado no es un técnico.')
    return tecnico


def _validate_client(client_id):
    from core.app import Client

    if not client_id:
        return None
    client = Client.query.get(client_id)
    if not client:
        raise MaterialesValidationError('Cliente seleccionado no válido.')
    return client


def _validate_materials(lineas, activos_only=True):
    from core.app import Material

    for mid, _qty in lineas:
        query = Material.query.filter_by(id=mid)
        if activos_only:
            query = query.filter_by(activo=True)
        material = query.first()
        if not material:
            raise MaterialesValidationError('Uno de los materiales seleccionados no es válido.')


def parse_fecha_form(value):
    if not value:
        raise MaterialesValidationError('La fecha es obligatoria.')
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        raise MaterialesValidationError('Formato de fecha inválido.')


def create_salida(form, current_user):
    from core.app import MaterialSalida, MaterialSalidaLinea, db, write_audit

    fecha = parse_fecha_form(form.get('fecha'))
    tecnico_id = form.get('id_tecnico', type=int)
    client_id = form.get('id_client', type=int) or None
    if not tecnico_id:
        raise MaterialesValidationError('Seleccione un técnico.')

    _validate_tecnico(tecnico_id)
    _validate_client(client_id)
    lineas = parse_lineas_form(form)
    _validate_materials(lineas)

    salida = MaterialSalida(
        fecha=fecha,
        id_tecnico=tecnico_id,
        id_client=client_id,
        estado='registrada',
        id_operateur_registro=current_user.id,
        fecha_registro=datetime.now(),
    )
    db.session.add(salida)
    db.session.flush()

    for mid, qty in lineas:
        db.session.add(MaterialSalidaLinea(id_salida=salida.id, id_material=mid, cantidad=qty))

    db.session.commit()
    write_audit('CREATE_MATERIAL_SALIDA', id_operateur=current_user.id, detail=f'salida_id={salida.id}')
    return salida


def update_salida(salida_id, form, current_user):
    from core.app import MaterialSalida, MaterialSalidaLinea, db, write_audit

    salida = MaterialSalida.query.get(salida_id)
    if not salida:
        raise MaterialesValidationError('Salida no encontrada.')

    fecha = parse_fecha_form(form.get('fecha'))
    tecnico_id = form.get('id_tecnico', type=int)
    client_id = form.get('id_client', type=int) or None
    if not tecnico_id:
        raise MaterialesValidationError('Seleccione un técnico.')

    _validate_tecnico(tecnico_id)
    _validate_client(client_id)
    lineas = parse_lineas_form(form)
    _validate_materials(lineas, activos_only=False)

    salida.fecha = fecha
    salida.id_tecnico = tecnico_id
    salida.id_client = client_id
    salida.estado = 'modificada'
    salida.fecha_modificacion = datetime.now()
    salida.id_operateur_modificacion = current_user.id

    MaterialSalidaLinea.query.filter_by(id_salida=salida.id).delete()
    for mid, qty in lineas:
        db.session.add(MaterialSalidaLinea(id_salida=salida.id, id_material=mid, cantidad=qty))

    db.session.commit()
    write_audit('UPDATE_MATERIAL_SALIDA', id_operateur=current_user.id, detail=f'salida_id={salida.id}')
    return salida


def salidas_base_query(agencia_id=None):
    from core.app import MaterialSalida, MaterialSalidaLinea, Operateur

    query = MaterialSalida.query.options(
        joinedload(MaterialSalida.tecnico),
        joinedload(MaterialSalida.client),
        joinedload(MaterialSalida.lineas).joinedload(MaterialSalidaLinea.material),
        joinedload(MaterialSalida.registrado_por),
        joinedload(MaterialSalida.modificado_por),
    ).join(Operateur, MaterialSalida.id_tecnico == Operateur.id)

    if agencia_id:
        query = query.filter(Operateur.id_agencia == agencia_id)
    return query


def apply_salida_list_filters(query, request_args):
    from core.app import MaterialSalida

    estado = (request_args.get('estado') or '').strip()
    if estado in SALIDA_ESTADO_LABELS:
        query = query.filter_by(estado=estado)

    date_from = (request_args.get('date_from') or '').strip()
    date_to = (request_args.get('date_to') or '').strip()
    if date_from:
        try:
            query = query.filter(MaterialSalida.fecha >= datetime.strptime(date_from, '%Y-%m-%d').date())
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(MaterialSalida.fecha <= datetime.strptime(date_to, '%Y-%m-%d').date())
        except ValueError:
            pass

    tecnico_id = request_args.get('tecnico', type=int)
    if tecnico_id:
        query = query.filter(MaterialSalida.id_tecnico == tecnico_id)

    client_id = request_args.get('client', type=int)
    if client_id:
        query = query.filter(MaterialSalida.id_client == client_id)

    return query.order_by(desc(MaterialSalida.fecha), desc(MaterialSalida.id))


def salida_resumen_lineas(salida):
    parts = []
    for linea in salida.lineas:
        nombre = linea.material.nombre if linea.material else '?'
        parts.append(f'{nombre} x{linea.cantidad}')
    return ', '.join(parts) if parts else '—'


def get_client_material_rows(client_id, agencia_id=None):
    from core.app import MaterialSalida, MaterialSalidaLinea, Operateur

    query = (
        db_session_query_lineas()
        .join(MaterialSalida, MaterialSalidaLinea.id_salida == MaterialSalida.id)
        .join(Operateur, MaterialSalida.id_tecnico == Operateur.id)
        .filter(MaterialSalida.id_client == client_id)
    )
    if agencia_id:
        query = query.filter(Operateur.id_agencia == agencia_id)
    return query.order_by(desc(MaterialSalida.fecha), desc(MaterialSalida.id)).all()


def get_tecnico_material_rows(tecnico_id, agencia_id=None):
    from core.app import MaterialSalida, MaterialSalidaLinea, Operateur

    query = (
        db_session_query_lineas()
        .join(MaterialSalida, MaterialSalidaLinea.id_salida == MaterialSalida.id)
        .filter(MaterialSalida.id_tecnico == tecnico_id)
    )
    if agencia_id:
        query = query.join(Operateur, MaterialSalida.id_tecnico == Operateur.id).filter(
            Operateur.id_agencia == agencia_id
        )
    return query.order_by(desc(MaterialSalida.fecha), desc(MaterialSalida.id)).all()


def db_session_query_lineas():
    from core.app import MaterialSalida, MaterialSalidaLinea

    return MaterialSalidaLinea.query.options(
        joinedload(MaterialSalidaLinea.salida).joinedload(MaterialSalida.tecnico),
        joinedload(MaterialSalidaLinea.salida).joinedload(MaterialSalida.client),
        joinedload(MaterialSalidaLinea.material),
    )


def build_informe_rows(date_from, date_to, agencia_id=None):
    from core.app import MaterialSalida, MaterialSalidaLinea, Operateur

    if not date_from or not date_to:
        raise MaterialesValidationError('Fecha desde y fecha hasta son obligatorias.')
    try:
        d_from = datetime.strptime(date_from, '%Y-%m-%d').date()
        d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
    except ValueError:
        raise MaterialesValidationError('Formato de fecha inválido.')
    if d_from > d_to:
        raise MaterialesValidationError('La fecha "hasta" debe ser posterior a la fecha "desde".')

    query = (
        db_session_query_lineas()
        .join(MaterialSalida, MaterialSalidaLinea.id_salida == MaterialSalida.id)
        .join(Operateur, MaterialSalida.id_tecnico == Operateur.id)
        .filter(MaterialSalida.fecha >= d_from, MaterialSalida.fecha <= d_to)
    )
    if agencia_id:
        query = query.filter(Operateur.id_agencia == agencia_id)

    return query.order_by(
        desc(MaterialSalida.fecha),
        Operateur.nom.asc(),
        MaterialSalidaLinea.id.asc(),
    ).all()


def create_material(form, current_user):
    from core.app import Material, MATERIAL_TIPOS, db, write_audit

    nombre = (form.get('nombre') or '').strip()
    tipo = (form.get('tipo') or '').strip()
    activo = form.get('activo') == 'on' or form.get('activo') == '1'
    if not nombre:
        raise MaterialesValidationError('El nombre es obligatorio.')
    if tipo not in MATERIAL_TIPOS:
        raise MaterialesValidationError('Tipo de material inválido.')
    if Material.query.filter_by(nombre=nombre, tipo=tipo).first():
        raise MaterialesValidationError('Ya existe un material con este nombre y tipo.')

    material = Material(nombre=nombre, tipo=tipo, activo=activo, creado_le=datetime.now())
    db.session.add(material)
    db.session.commit()
    write_audit('CREATE_MATERIAL', id_operateur=current_user.id, detail=f'material_id={material.id}')
    return material


def update_material(material_id, form, current_user):
    from core.app import Material, MATERIAL_TIPOS, db, write_audit

    material = Material.query.get_or_404(material_id)
    nombre = (form.get('nombre') or '').strip()
    tipo = (form.get('tipo') or '').strip()
    activo = form.get('activo') == 'on' or form.get('activo') == '1'
    if not nombre:
        raise MaterialesValidationError('El nombre es obligatorio.')
    if tipo not in MATERIAL_TIPOS:
        raise MaterialesValidationError('Tipo de material inválido.')

    dup = Material.query.filter(
        Material.nombre == nombre,
        Material.tipo == tipo,
        Material.id != material.id,
    ).first()
    if dup:
        raise MaterialesValidationError('Ya existe un material con este nombre y tipo.')

    material.nombre = nombre
    material.tipo = tipo
    material.activo = activo
    db.session.commit()
    write_audit('UPDATE_MATERIAL', id_operateur=current_user.id, detail=f'material_id={material.id}')
    return material
