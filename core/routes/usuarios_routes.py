#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de administración de usuarios."""

import os
from datetime import datetime

from flask import abort, flash, redirect, render_template, request, url_for
from flask_babel import gettext
from flask_login import current_user, login_required
from sqlalchemy.orm import joinedload
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from core.app import (
    Agencia,
    CATEGORIAS_OPERATEUR,
    Ciudad,
    Operateur,
    ROLE_USUARIO,
    ROLES_OPERATEUR,
    app,
    db,
    normalize_categoria_operateur,
    normalize_role,
    superadmin_required,
    write_audit,
)


@app.route('/usuarios')
@superadmin_required
def usuarios():
    search_query = (request.args.get('search') or '').strip()
    role_filter = (request.args.get('role') or '').strip()
    categoria_filter = (request.args.get('categoria') or '').strip()
    actif_filter = (request.args.get('actif') or '').strip()
    ciudad_filter = (request.args.get('ciudad') or '').strip()
    agencia_filter = (request.args.get('agencia') or '').strip()

    if role_filter not in ('',) + ROLES_OPERATEUR:
        role_filter = ''
    if categoria_filter and categoria_filter not in CATEGORIAS_OPERATEUR:
        categoria_filter = ''
    if actif_filter not in ('', '1', '0'):
        actif_filter = ''

    ciudad_id = None
    if ciudad_filter:
        try:
            ciudad_id = int(ciudad_filter)
            if not db.session.get(Ciudad, ciudad_id):
                ciudad_id = None
                ciudad_filter = ''
        except (TypeError, ValueError):
            ciudad_id = None
            ciudad_filter = ''

    agencia_id = None
    if agencia_filter:
        try:
            agencia_id = int(agencia_filter)
            ag = db.session.get(Agencia, agencia_id)
            if not ag:
                agencia_id = None
                agencia_filter = ''
            elif ciudad_id and ag.id_ciudad != ciudad_id:
                agencia_id = None
                agencia_filter = ''
        except (TypeError, ValueError):
            agencia_id = None
            agencia_filter = ''

    query = Operateur.query.options(
        joinedload(Operateur.ciudad),
        joinedload(Operateur.agencia),
    )
    if search_query:
        query = query.filter(
            db.or_(
                Operateur.nom.contains(search_query),
                Operateur.telephone.contains(search_query),
                Operateur.email.contains(search_query),
            )
        )
    if role_filter:
        query = query.filter(Operateur.role == role_filter)
    if categoria_filter:
        query = query.filter(Operateur.categoria == categoria_filter)
    if actif_filter == '1':
        query = query.filter(Operateur.actif.is_(True))
    elif actif_filter == '0':
        query = query.filter(Operateur.actif.is_(False))
    if ciudad_id:
        query = query.filter(Operateur.id_ciudad == ciudad_id)
    if agencia_id:
        query = query.filter(Operateur.id_agencia == agencia_id)

    users = query.order_by(Operateur.nom).all()
    ciudades = Ciudad.query.order_by(Ciudad.nombre).all()
    if ciudad_id:
        agencias = Agencia.query.filter_by(id_ciudad=ciudad_id).order_by(Agencia.nombre).all()
    else:
        agencias = Agencia.query.order_by(Agencia.nombre).all()

    filters_active = bool(
        search_query or role_filter or categoria_filter or actif_filter or ciudad_filter or agencia_filter
    )
    return render_template(
        'usuarios.html',
        users=users,
        ciudades=ciudades,
        agencias=agencias,
        search_query=search_query,
        role_filter=role_filter,
        categoria_filter=categoria_filter,
        actif_filter=actif_filter,
        ciudad_filter=ciudad_filter,
        agencia_filter=agencia_filter,
        filters_active=filters_active,
    )


@app.route('/usuarios/nuevo', methods=['GET', 'POST'])
@superadmin_required
def nuevo_usuario():
    ciudades = Ciudad.query.order_by(Ciudad.nombre).all()
    if request.method == 'POST':
        nom = (request.form.get('nom') or '').strip()
        telephone = (request.form.get('telephone') or '').strip()
        email = (request.form.get('email') or '').strip() or None
        password = request.form.get('password') or ''
        id_ciudad = request.form.get('id_ciudad', type=int)
        id_agencia = request.form.get('id_agencia', type=int)
        role = normalize_role((request.form.get('role') or ROLE_USUARIO).strip())
        categoria = normalize_categoria_operateur(request.form.get('categoria'))
        if not nom or not telephone or not id_ciudad or not id_agencia:
            flash(gettext('Nombre, teléfono, ciudad y agencia son obligatorios.'), 'error')
        elif not password:
            flash(gettext('La contraseña es obligatoria para un nuevo usuario.'), 'error')
        else:
            ag = Agencia.query.get_or_404(id_agencia)
            if ag.id_ciudad != id_ciudad:
                flash(gettext('La agencia no pertenece a la ciudad seleccionada.'), 'error')
            elif email and Operateur.query.filter_by(email=email).first():
                flash(gettext('Ya existe un usuario con este correo.'), 'error')
            elif Operateur.query.filter_by(telephone=telephone).first():
                flash(gettext('Ya existe un usuario con este teléfono.'), 'error')
            else:
                u = Operateur(
                    nom=nom,
                    telephone=telephone,
                    email=email,
                    mot_de_passe_hash=generate_password_hash(password),
                    id_ciudad=id_ciudad,
                    id_agencia=id_agencia,
                    role=role,
                    categoria=categoria,
                    actif=True,
                    cree_le=datetime.now(),
                )
                db.session.add(u)
                db.session.commit()
                write_audit('CREATE_USER', id_operateur=current_user.id, detail=f'id={u.id}')
                flash(gettext('Usuario creado.'), 'success')
                return redirect(url_for('usuarios'))
    agencias = Agencia.query.order_by(Agencia.nombre).all() if request.method == 'GET' else []
    return render_template('nuevo_usuario.html', ciudades=ciudades, agencias=agencias)


@app.route('/usuarios/<int:user_id>/editar', methods=['GET', 'POST'])
@superadmin_required
def editar_usuario(user_id):
    u = Operateur.query.get_or_404(user_id)
    ciudades = Ciudad.query.order_by(Ciudad.nombre).all()
    if request.method == 'POST':
        nom = (request.form.get('nom') or '').strip()
        telephone = (request.form.get('telephone') or '').strip()
        email = (request.form.get('email') or '').strip() or None
        password = request.form.get('password') or ''
        id_ciudad = request.form.get('id_ciudad', type=int)
        id_agencia = request.form.get('id_agencia', type=int)
        role = normalize_role((request.form.get('role') or ROLE_USUARIO).strip())
        categoria = normalize_categoria_operateur(request.form.get('categoria'))
        if not nom or not telephone or not id_ciudad or not id_agencia:
            flash(gettext('Nombre, teléfono, ciudad y agencia son obligatorios.'), 'error')
        else:
            ag = Agencia.query.get_or_404(id_agencia)
            if ag.id_ciudad != id_ciudad:
                flash(gettext('La agencia no pertenece a la ciudad seleccionada.'), 'error')
            else:
                other = Operateur.query.filter(Operateur.email == email, Operateur.id != u.id).first() if email else None
                if other:
                    flash(gettext('Ya existe un usuario con este correo.'), 'error')
                else:
                    other_tel = Operateur.query.filter(Operateur.telephone == telephone, Operateur.id != u.id).first()
                    if other_tel:
                        flash(gettext('Ya existe un usuario con este teléfono.'), 'error')
                    else:
                        u.nom = nom
                        u.telephone = telephone
                        u.email = email
                        u.id_ciudad = id_ciudad
                        u.id_agencia = id_agencia
                        u.role = role
                        u.categoria = normalize_categoria_operateur(
                            request.form.get('categoria'), default=u.categoria
                        )
                        u.modifie_le = datetime.now()
                        if password.strip():
                            u.mot_de_passe_hash = generate_password_hash(password)
                        db.session.commit()
                        write_audit('UPDATE_USER', id_operateur=current_user.id, detail=f'id={u.id}')
                        flash(gettext('Usuario actualizado.'), 'success')
                        return redirect(url_for('usuarios'))
    agencias = Agencia.query.filter_by(id_ciudad=u.id_ciudad).order_by(Agencia.nombre).all()
    return render_template('editar_usuario.html', user=u, ciudades=ciudades, agencias=agencias)


@app.route('/usuarios/<int:user_id>/desactivar', methods=['POST'])
@superadmin_required
def desactivar_usuario(user_id):
    u = Operateur.query.get_or_404(user_id)
    if u.id == current_user.id:
        flash(gettext('No puede desactivar su propia cuenta.'), 'error')
        return redirect(url_for('usuarios'))
    u.actif = not u.actif
    u.modifie_le = datetime.now()
    db.session.commit()
    write_audit('TOGGLE_USER_ACTIVE', id_operateur=current_user.id, detail=f'id={user_id} actif={u.actif}')
    flash(gettext('Estado del usuario actualizado.'), 'success')
    return redirect(url_for('usuarios'))


def _allowed_avatar(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ('jpg', 'jpeg', 'png', 'webp')


@app.route('/usuarios/<int:user_id>/avatar', methods=['POST'])
@login_required
def upload_avatar_usuario(user_id):
    if not current_user.is_superadmin() and current_user.id != user_id:
        abort(403)
    u = Operateur.query.get_or_404(user_id)
    f = request.files.get('avatar')
    if not f or not f.filename:
        flash(gettext('Seleccione un archivo.'), 'error')
        return redirect(url_for('editar_usuario', user_id=user_id) if current_user.is_superadmin() else url_for('perfil'))
    if not _allowed_avatar(f.filename):
        flash(gettext('Formato no válido (JPG, PNG, WEBP).'), 'error')
        return redirect(url_for('editar_usuario', user_id=user_id) if current_user.is_superadmin() else url_for('perfil'))
    data = f.read()
    if len(data) > 2 * 1024 * 1024:
        flash(gettext('Archivo demasiado grande (máx. 2 MB).'), 'error')
        return redirect(url_for('editar_usuario', user_id=user_id) if current_user.is_superadmin() else url_for('perfil'))
    ext = secure_filename(f.filename).rsplit('.', 1)[-1].lower()
    av_dir = os.path.join(app.static_folder, 'avatars')
    os.makedirs(av_dir, exist_ok=True)
    fname = f'avatar_{user_id}.{ext}'
    path = os.path.join(av_dir, fname)
    with open(path, 'wb') as out:
        out.write(data)
    u.avatar_url = f'/static/avatars/{fname}'
    u.modifie_le = datetime.now()
    db.session.commit()
    flash(gettext('Avatar actualizado.'), 'success')
    if current_user.is_superadmin():
        return redirect(url_for('editar_usuario', user_id=user_id))
    return redirect(url_for('dashboard'))
