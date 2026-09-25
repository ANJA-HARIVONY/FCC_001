#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lógica de negocio — GPS y fotos de instalación del cliente."""

import os
import uuid
from datetime import datetime

from werkzeug.utils import secure_filename

from core.services.materiales_service import MaterialesValidationError

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


def update_client_gps(client, lat, lng, current_user):
    if client is None:
        raise MaterialesValidationError('Cliente no encontrado.')
    client.latitud = lat
    client.longitud = lng
    client.gps_actualizado_le = datetime.now()
    client.id_operateur_gps = current_user.id


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


def _save_one_foto(client, file_storage, current_user):
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
        fichier=f'/uploads/instalaciones/{fname}',
        id_operateur=current_user.id,
        creado_le=datetime.now(),
    ))


def save_instalacion_fotos(client, files, current_user):
    from core.app import MAX_INSTALACION_FOTOS, db, write_audit

    files = [f for f in (files or []) if f and getattr(f, 'filename', None)]
    if not files:
        raise MaterialesValidationError('Seleccione al menos una foto.')
    current = len(client.fotos_instalacion or [])
    if current + len(files) > MAX_INSTALACION_FOTOS:
        raise MaterialesValidationError(
            f'Solo se permiten {MAX_INSTALACION_FOTOS} fotos por instalación '
            f'({current} ya guardadas).'
        )
    for file_storage in files:
        _save_one_foto(client, file_storage, current_user)
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
    """Fotos de instalación asociadas al cliente."""
    if client is None:
        return []
    return list(client.fotos_instalacion or [])
