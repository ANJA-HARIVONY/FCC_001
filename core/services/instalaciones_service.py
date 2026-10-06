#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lógica de negocio — sitios del cliente (GPS, fotos, traslados) e instalaciones."""

import os
import uuid
from datetime import datetime

from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

from core.services.materiales_service import (
    MaterialesValidationError,
    _validate_client,
    _validate_materials,
    _validate_tecnico,
    parse_fecha_form,
    parse_observaciones_form,
)

ALLOWED_INSTALACION_FOTO_EXTENSIONS = ('jpg', 'jpeg', 'png', 'webp')
MAX_INSTALACION_FOTO_BYTES = 5 * 1024 * 1024


def _allowed_instalacion_foto(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_INSTALACION_FOTO_EXTENSIONS


def _project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def _instalacion_foto_search_dirs():
    root = _project_root()
    return [
        os.path.join(root, 'presentation', 'uploads', 'instalaciones'),
        os.path.join(root, 'instance', 'uploads', 'instalaciones'),
    ]


def _instalacion_foto_dir():
    foto_dir = _instalacion_foto_search_dirs()[0]
    os.makedirs(foto_dir, exist_ok=True)
    return foto_dir


def instalacion_foto_filename(foto_path):
    if not foto_path:
        return None
    return foto_path.rsplit('/', 1)[-1]


def resolve_instalacion_foto_file(filename):
    """Chemin disque d'une photo, ou None si absente / nom invalide."""
    safe_name = secure_filename(filename or '')
    if not safe_name or safe_name != filename:
        return None
    for directory in _instalacion_foto_search_dirs():
        path = os.path.join(directory, safe_name)
        if os.path.isfile(path):
            return path
    return None


def instalacion_foto_url(foto):
    from flask import url_for

    fname = foto.filename if foto else None
    if not fname:
        return None
    return url_for('serve_instalacion_foto', filename=fname)


def parse_gps_form(form):
    """Devuelve (lat, lng) o None si no hay datos GPS. Errores en español."""
    pair = (form.get('gps_pair') or '').strip()
    lat_raw = (form.get('latitud') or '').strip()
    lng_raw = (form.get('longitud') or '').strip()

    if pair and (not lat_raw or not lng_raw):
        parts = [p.strip() for p in pair.replace(';', ',').split(',') if p.strip()]
        if len(parts) != 2:
            raise MaterialesValidationError(
                'Indique latitud y longitud (ej. 4.6097, -74.0817).'
            )
        lat_raw, lng_raw = parts

    if not lat_raw and not lng_raw:
        return None
    if not lat_raw or not lng_raw:
        raise MaterialesValidationError('Indique latitud y longitud.')

    try:
        lat = float(lat_raw.replace(',', '.'))
        lng = float(lng_raw.replace(',', '.'))
    except ValueError as exc:
        raise MaterialesValidationError('Coordenadas GPS no válidas.') from exc

    if not -90.0 <= lat <= 90.0:
        raise MaterialesValidationError('La latitud debe estar entre -90 y 90.')
    if not -180.0 <= lng <= 180.0:
        raise MaterialesValidationError('La longitud debe estar entre -180 y 180.')
    return lat, lng


def ensure_sitio_activo(client):
    """Sitio activo del cliente ; lo crea desde la dirección / GPS actuales si falta."""
    from core.app import ClientSitio, db

    if client is None:
        raise MaterialesValidationError('Cliente no encontrado.')
    sitio = client.sitio_activo
    if sitio is not None:
        return sitio
    sitio = ClientSitio(
        adresse=client.adresse or '',
        ville=client.ville or '',
        latitud=client.latitud,
        longitud=client.longitud,
        gps_actualizado_le=client.gps_actualizado_le,
        id_operateur_gps=client.id_operateur_gps,
        activo=True,
        creado_le=datetime.now(),
    )
    client.sitios.append(sitio)
    db.session.flush()
    return sitio


def _sync_client_gps_from_sitio(client, sitio):
    """Client.latitud/longitud reflejan siempre el sitio activo."""
    client.latitud = sitio.latitud if sitio else None
    client.longitud = sitio.longitud if sitio else None
    client.gps_actualizado_le = sitio.gps_actualizado_le if sitio else None
    client.id_operateur_gps = sitio.id_operateur_gps if sitio else None


def update_client_gps(client, lat, lng, current_user):
    if client is None:
        raise MaterialesValidationError('Cliente no encontrado.')
    sitio = ensure_sitio_activo(client)
    sitio.latitud = lat
    sitio.longitud = lng
    sitio.gps_actualizado_le = datetime.now()
    sitio.id_operateur_gps = current_user.id
    _sync_client_gps_from_sitio(client, sitio)


def save_client_gps(client, form, current_user):
    from core.app import db, write_audit

    gps = parse_gps_form(form)
    if not gps:
        raise MaterialesValidationError('Indique latitud y longitud.')
    update_client_gps(client, gps[0], gps[1], current_user)
    db.session.commit()
    write_audit(
        'INSTALACION_GPS_UPDATE',
        id_operateur=current_user.id,
        detail=f'client_id={client.id}',
    )
    return gps


def _save_one_foto(client, sitio, file_storage, current_user):
    from core.app import InstalacionFoto, db

    if not file_storage or not file_storage.filename:
        return
    if not _allowed_instalacion_foto(file_storage.filename):
        raise MaterialesValidationError('Formato de foto no válido (JPG, PNG, WEBP).')
    data = file_storage.read()
    if len(data) > MAX_INSTALACION_FOTO_BYTES:
        raise MaterialesValidationError('La foto es demasiado grande (máx. 5 MB).')
    ext = secure_filename(file_storage.filename).rsplit('.', 1)[-1].lower()
    fname = f'instalacion_{client.id}_{uuid.uuid4().hex[:12]}.{ext}'
    path = os.path.join(_instalacion_foto_dir(), fname)
    with open(path, 'wb') as out:
        out.write(data)
    db.session.add(InstalacionFoto(
        id_client=client.id,
        id_salida=None,
        id_sitio=sitio.id,
        fichier=f'/uploads/instalaciones/{fname}',
        id_operateur=current_user.id,
        creado_le=datetime.now(),
    ))


def save_instalacion_fotos(client, files, current_user):
    from core.app import MAX_INSTALACION_FOTOS, db, write_audit

    files = [f for f in (files or []) if f and getattr(f, 'filename', None)]
    if not files:
        raise MaterialesValidationError('Seleccione al menos una foto.')
    sitio = ensure_sitio_activo(client)
    current = len(sitio.fotos or [])
    if current + len(files) > MAX_INSTALACION_FOTOS:
        raise MaterialesValidationError(
            f'Solo se permiten {MAX_INSTALACION_FOTOS} fotos por instalación '
            f'({current} ya guardadas).'
        )
    for file_storage in files:
        _save_one_foto(client, sitio, file_storage, current_user)
    db.session.commit()
    write_audit(
        'INSTALACION_FOTO_ADD',
        id_operateur=current_user.id,
        detail=f'client_id={client.id} n={len(files)}',
    )
    return len(files)


def _remove_foto_files(fichier):
    fname = instalacion_foto_filename(fichier)
    if not fname:
        return
    safe_name = secure_filename(fname)
    if not safe_name or safe_name != fname:
        return
    for directory in _instalacion_foto_search_dirs():
        path = os.path.join(directory, safe_name)
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass


def delete_instalacion_foto(foto, current_user):
    from core.app import db, write_audit

    if foto is None:
        raise MaterialesValidationError('Foto no encontrada.')
    client_id = foto.id_client
    foto_id = foto.id
    _remove_foto_files(foto.fichier)
    db.session.delete(foto)
    db.session.commit()
    write_audit(
        'INSTALACION_FOTO_DELETE',
        id_operateur=current_user.id,
        detail=f'client_id={client_id} foto_id={foto_id}',
    )


def client_instalacion_fotos(client):
    """Fotos del sitio activo del cliente (galería del lugar actual)."""
    if client is None:
        return []
    sitio = client.sitio_activo
    if sitio is not None:
        return list(sitio.fotos or [])
    return [f for f in (client.fotos_instalacion or []) if f.id_sitio is None]


# --- Instalaciones -----------------------------------------------------------


def _load_instalacion(instalacion_id):
    from core.app import Instalacion, db

    instalacion = db.session.get(Instalacion, instalacion_id)
    if not instalacion:
        raise MaterialesValidationError('Instalación no encontrada.')
    return instalacion


def parse_lineas_opcionales_form(form):
    """Pares (id_material, cantidad) ; sin líneas = lista vacía (material añadido más tarde)."""
    from core.services.materiales_service import parse_lineas_form

    if not any(form.getlist('material_id[]')):
        return []
    return parse_lineas_form(form)


def create_instalacion(form, current_user):
    """Nueva instalación (tipo nueva, estado en_curso) y, si hay líneas, su primera salida de material."""
    from core.app import Instalacion, MaterialSalida, MaterialSalidaLinea, db, write_audit

    fecha = parse_fecha_form(form.get('fecha'))
    tecnico_id = form.get('id_tecnico', type=int)
    client_id = form.get('id_client', type=int)
    if not tecnico_id:
        raise MaterialesValidationError('Seleccione un técnico.')
    if not client_id:
        raise MaterialesValidationError('Seleccione un cliente.')
    _validate_tecnico(tecnico_id)
    client = _validate_client(client_id)
    lineas = parse_lineas_opcionales_form(form)
    _validate_materials(lineas)
    sitio = ensure_sitio_activo(client)
    now = datetime.now()

    instalacion = Instalacion(
        id_client=client.id,
        id_sitio=sitio.id,
        tipo='nueva',
        estado='en_curso',
        fecha=fecha,
        id_tecnico=tecnico_id,
        observaciones=parse_observaciones_form(form),
        id_operateur_registro=current_user.id,
        fecha_registro=now,
    )
    db.session.add(instalacion)
    db.session.flush()

    salida = None
    if lineas:
        salida = MaterialSalida(
            fecha=fecha,
            id_tecnico=tecnico_id,
            id_client=client.id,
            tipo_salida='instalacion',
            id_instalacion=instalacion.id,
            estado='registrada',
            id_operateur_registro=current_user.id,
            fecha_registro=now,
        )
        db.session.add(salida)
        db.session.flush()
        for mid, qty in lineas:
            db.session.add(MaterialSalidaLinea(id_salida=salida.id, id_material=mid, cantidad=qty))

    db.session.commit()
    write_audit('INSTALACION_CREATE', id_operateur=current_user.id, detail=f'instalacion_id={instalacion.id}')
    if salida is not None:
        write_audit('CREATE_MATERIAL_SALIDA', id_operateur=current_user.id, detail=f'salida_id={salida.id}')
    return instalacion


def update_instalacion(instalacion_id, form, current_user):
    """Modifica fecha, técnico y observaciones. Cliente, sitio y tipo no son modificables."""
    from core.app import db, write_audit

    instalacion = _load_instalacion(instalacion_id)
    fecha = parse_fecha_form(form.get('fecha'))
    tecnico_id = form.get('id_tecnico', type=int)
    if not tecnico_id:
        raise MaterialesValidationError('Seleccione un técnico.')
    if tecnico_id != instalacion.id_tecnico:
        _validate_tecnico(tecnico_id)

    instalacion.fecha = fecha
    instalacion.id_tecnico = tecnico_id
    instalacion.observaciones = parse_observaciones_form(form)
    instalacion.fecha_modificacion = datetime.now()
    instalacion.id_operateur_modificacion = current_user.id
    db.session.commit()
    write_audit('INSTALACION_UPDATE', id_operateur=current_user.id, detail=f'instalacion_id={instalacion.id}')
    return instalacion


def terminar_instalacion(instalacion_id, current_user):
    from core.app import db, write_audit

    instalacion = _load_instalacion(instalacion_id)
    if instalacion.estado != 'en_curso':
        raise MaterialesValidationError('Solo se puede terminar una instalación en curso.')
    instalacion.estado = 'terminada'
    instalacion.terminada_le = datetime.now()
    instalacion.id_operateur_terminada = current_user.id
    db.session.commit()
    write_audit('INSTALACION_TERMINAR', id_operateur=current_user.id, detail=f'instalacion_id={instalacion.id}')
    return instalacion


def reabrir_instalacion(instalacion_id, current_user):
    from core.app import db, write_audit

    if not current_user.is_admin():
        raise MaterialesValidationError('Solo un administrador puede reabrir una instalación.')
    instalacion = _load_instalacion(instalacion_id)
    if instalacion.estado != 'terminada':
        raise MaterialesValidationError('Solo se puede reabrir una instalación terminada.')
    instalacion.estado = 'en_curso'
    instalacion.terminada_le = None
    instalacion.id_operateur_terminada = None
    instalacion.fecha_modificacion = datetime.now()
    instalacion.id_operateur_modificacion = current_user.id
    db.session.commit()
    write_audit('INSTALACION_REABRIR', id_operateur=current_user.id, detail=f'instalacion_id={instalacion.id}')
    return instalacion


def parse_traslado_lineas_form(form):
    """Líneas (id_material, cantidad, accion) opcionales ; filas sin material se ignoran."""
    from core.app import TRASLADO_ACCIONES

    material_ids = form.getlist('material_id[]')
    cantidades = form.getlist('cantidad[]')
    acciones = form.getlist('accion[]')
    if not (len(material_ids) == len(cantidades) == len(acciones)):
        raise MaterialesValidationError('Datos de líneas de material incompletos.')

    lineas = []
    seen = set()
    for raw_mid, raw_qty, accion in zip(material_ids, cantidades, acciones):
        if not raw_mid:
            continue
        try:
            mid = int(raw_mid)
            qty = int(raw_qty)
        except (TypeError, ValueError):
            raise MaterialesValidationError('Cantidad de material inválida.')
        if qty < 1:
            raise MaterialesValidationError('La cantidad debe ser mayor que 0.')
        accion = (accion or '').strip()
        if accion not in TRASLADO_ACCIONES:
            raise MaterialesValidationError('Acción de material no válida.')
        if (mid, accion) in seen:
            raise MaterialesValidationError('El material ya está en la lista.')
        seen.add((mid, accion))
        lineas.append((mid, qty, accion))
    return lineas


def create_traslado(client, form, current_user):
    """Cierra el sitio activo, abre uno nuevo y crea la instalación tipo traslado (en curso)."""
    from core.app import ClientSitio, Instalacion, InstalacionTrasladoLinea, db, write_audit

    if client is None:
        raise MaterialesValidationError('Cliente no encontrado.')
    _validate_client(client.id)
    adresse = (form.get('adresse') or '').strip()
    ville = (form.get('ville') or '').strip()
    if not adresse:
        raise MaterialesValidationError('La nueva dirección es obligatoria.')
    if not ville:
        raise MaterialesValidationError('El barrio es obligatorio.')
    fecha = parse_fecha_form(form.get('fecha'))
    tecnico_id = form.get('id_tecnico', type=int)
    if not tecnico_id:
        raise MaterialesValidationError('Seleccione un técnico.')
    _validate_tecnico(tecnico_id)
    gps = parse_gps_form(form)
    lineas = parse_traslado_lineas_form(form)
    _validate_materials([(mid, qty) for mid, qty, _accion in lineas], activos_only=False)

    now = datetime.now()
    origen = ensure_sitio_activo(client)
    origen.activo = False
    origen.hasta = fecha

    nuevo = ClientSitio(
        adresse=adresse,
        ville=ville,
        activo=True,
        desde=fecha,
        creado_le=now,
    )
    if gps:
        nuevo.latitud, nuevo.longitud = gps
        nuevo.gps_actualizado_le = now
        nuevo.id_operateur_gps = current_user.id
    client.sitios.append(nuevo)
    db.session.flush()

    client.adresse = adresse
    client.ville = ville
    client.id_operateur_modificacion = current_user.id
    client.modifie_le = now
    _sync_client_gps_from_sitio(client, nuevo)

    instalacion = Instalacion(
        id_client=client.id,
        id_sitio=nuevo.id,
        id_sitio_origen=origen.id,
        tipo='traslado',
        estado='en_curso',
        fecha=fecha,
        id_tecnico=tecnico_id,
        observaciones=parse_observaciones_form(form),
        id_operateur_registro=current_user.id,
        fecha_registro=now,
    )
    db.session.add(instalacion)
    db.session.flush()
    for mid, qty, accion in lineas:
        db.session.add(InstalacionTrasladoLinea(
            id_instalacion=instalacion.id,
            id_material=mid,
            cantidad=qty,
            accion=accion,
        ))
    db.session.commit()
    write_audit(
        'INSTALACION_TRASLADO',
        id_operateur=current_user.id,
        detail=f'client_id={client.id} instalacion_id={instalacion.id} sitio_origen={origen.id}',
    )
    return instalacion


def resolve_instalacion_for_salida(tipo_salida, client_id, form):
    """Instalación (obligatoria) de una salida tipo instalacion ; None para los demás tipos."""
    if tipo_salida != 'instalacion':
        return None
    instalacion_id = form.get('id_instalacion', type=int)
    if not instalacion_id:
        raise MaterialesValidationError('El material de una instalación se registra desde «Nueva instalación».')
    from core.app import Instalacion

    instalacion = scoped_instalaciones_query().filter(Instalacion.id == instalacion_id).first()
    if not instalacion:
        raise MaterialesValidationError('Instalación no encontrada.')
    if instalacion.id_client != client_id:
        raise MaterialesValidationError('El cliente no coincide con la instalación.')
    return instalacion


def instalaciones_base_query():
    from core.app import Instalacion, MaterialSalida, MaterialSalidaLinea, Operateur

    return Instalacion.query.options(
        joinedload(Instalacion.tecnico),
        joinedload(Instalacion.client),
        joinedload(Instalacion.sitio),
        joinedload(Instalacion.salidas).joinedload(MaterialSalida.lineas).joinedload(MaterialSalidaLinea.material),
    ).join(Operateur, Instalacion.id_tecnico == Operateur.id)


def scoped_instalaciones_query():
    """Superadmin : tout. Sinon agencia du técnico et ciudad du client."""
    from flask import has_request_context
    from flask_login import current_user

    from core.app import Instalacion, Operateur

    query = instalaciones_base_query()
    if (
        has_request_context()
        and getattr(current_user, 'is_authenticated', False)
        and not current_user.is_superadmin()
    ):
        query = query.filter(
            Operateur.id_agencia == current_user.id_agencia,
            Instalacion.client.has(id_ciudad=current_user.id_ciudad),
        )
    return query


def instalaciones_du_client(client):
    from core.app import Instalacion

    if client is None:
        return []
    return (
        scoped_instalaciones_query()
        .filter(Instalacion.id_client == client.id)
        .order_by(desc(Instalacion.fecha), desc(Instalacion.id))
        .all()
    )


def instalaciones_del_dia(day=None, agencia_id=None, ciudad_id=None, *, all_agencies=False):
    """Instalaciones de un día calendario (dashboard), fuera del filtro de período."""
    from core.app import Instalacion, Operateur

    if day is None:
        day = datetime.now().date()
    query = instalaciones_base_query().filter(Instalacion.fecha == day)
    if not all_agencies:
        query = query.filter(Operateur.id_agencia == agencia_id)
        if ciudad_id:
            query = query.filter(Instalacion.client.has(id_ciudad=ciudad_id))
    return query.order_by(desc(Instalacion.id)).all()


def apply_instalacion_list_filters(query, request_args):
    from core.app import (
        Client,
        Instalacion,
        INSTALACION_ESTADOS,
        INSTALACION_TIPOS,
        Material,
        MaterialSalida,
        MaterialSalidaLinea,
        Operateur,
        db,
    )

    estado = (request_args.get('estado') or '').strip()
    if estado in INSTALACION_ESTADOS:
        query = query.filter(Instalacion.estado == estado)

    tipo = (request_args.get('tipo') or '').strip()
    if tipo in INSTALACION_TIPOS:
        query = query.filter(Instalacion.tipo == tipo)

    date_from = (request_args.get('date_from') or '').strip()
    date_to = (request_args.get('date_to') or '').strip()
    if date_from:
        try:
            query = query.filter(Instalacion.fecha >= datetime.strptime(date_from, '%Y-%m-%d').date())
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(Instalacion.fecha <= datetime.strptime(date_to, '%Y-%m-%d').date())
        except ValueError:
            pass

    tecnico_id = request_args.get('tecnico', type=int)
    if tecnico_id:
        query = query.filter(Instalacion.id_tecnico == tecnico_id)

    search = (request_args.get('search') or '').strip()
    if search:
        clauses = [
            Operateur.nom.contains(search),
            Instalacion.observaciones.contains(search),
            Instalacion.client.has(
                db.or_(
                    Client.nom.contains(search),
                    Client.telephone.contains(search),
                )
            ),
            Instalacion.salidas.any(
                MaterialSalida.lineas.any(
                    MaterialSalidaLinea.material.has(Material.nombre.contains(search))
                )
            ),
        ]
        if search.isdigit():
            clauses.append(Instalacion.id == int(search))
        query = query.filter(db.or_(*clauses))

    return query.order_by(desc(Instalacion.fecha), desc(Instalacion.id))
