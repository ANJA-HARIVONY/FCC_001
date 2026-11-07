#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests — mensaje de cabecera (información del día)."""

import os
import unittest

os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask import render_template  # noqa: E402
from flask_login import login_user  # noqa: E402
from werkzeug.exceptions import Forbidden  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from core.app import (  # noqa: E402
    MENSAJE_INFO_TEXTO_MAX,
    Agencia,
    Ciudad,
    MensajeInfo,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)


class MensajeInfoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = app
        cls.app.config['TESTING'] = True
        cls.app.config['WTF_CSRF_ENABLED'] = False
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.ctx = cls.app.app_context()
        cls.ctx.push()
        db.create_all()
        ensure_ciudad_agencia_seed()
        ciudad = Ciudad.query.first()
        agencia = Agencia.query.first()
        cls.admin = Operateur(
            nom='admin_mensaje',
            telephone='240000201',
            email='admin_mensaje@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        cls.usuario = Operateur(
            nom='usuario_mensaje',
            telephone='240000202',
            email='usuario_mensaje@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            actif=True,
        )
        cls.superadmin = Operateur(
            nom='super_mensaje',
            telephone='240000203',
            email='super_mensaje@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='superadmin',
            actif=True,
        )
        db.session.add_all([cls.admin, cls.usuario, cls.superadmin])
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def setUp(self):
        MensajeInfo.query.delete()
        db.session.commit()

    def _json(self, result):
        if isinstance(result, tuple):
            response, status = result
            return status, response.get_json()
        return result.status_code, result.get_json()

    def _put(self, user, texto, activo):
        with self.app.test_request_context(
            '/api/mensaje-info',
            method='PUT',
            json={'texto': texto, 'activo': activo},
        ):
            login_user(user)
            return self._json(self.app.view_functions['api_put_mensaje_info']())

    def _get(self, user):
        with self.app.test_request_context('/api/mensaje-info'):
            login_user(user)
            return self._json(self.app.view_functions['api_get_mensaje_info']())

    def _header(self, user):
        with self.app.test_request_context('/'):
            login_user(user)
            return render_template('partials/_header.html')

    def test_usuario_no_puede_guardar(self):
        with self.app.test_request_context(
            '/api/mensaje-info',
            method='PUT',
            json={'texto': 'Aviso', 'activo': True},
        ):
            login_user(self.usuario)
            with self.assertRaises(Forbidden):
                self.app.view_functions['api_put_mensaje_info']()

    def test_admin_y_superadmin_publican_y_el_texto_se_desplaza(self):
        status, data = self._put(self.admin, 'Corte de fibra hasta las 18:00', True)
        self.assertEqual(status, 200)
        self.assertTrue(data['ok'])
        self.assertTrue(data['activo'])

        html_usuario = self._header(self.usuario)
        self.assertIn('app-header__info-text', html_usuario)
        self.assertIn('Corte de fibra hasta las 18:00', html_usuario)
        self.assertIn('Info:', html_usuario)
        self.assertNotIn('btn-mensaje-info', html_usuario)

        html_admin = self._header(self.admin)
        self.assertIn('btn-mensaje-info', html_admin)
        with self.app.test_request_context('/'):
            login_user(self.admin)
            modal = render_template('partials/_mensaje_info_modal.html')
        self.assertIn('id="modalMensajeInfo"', modal)
        self.assertIn('mensaje-info-activo', modal)

        status, data = self._put(self.superadmin, 'Mantenimiento esta noche', True)
        self.assertEqual(status, 200)
        self.assertEqual(data['texto'], 'Mantenimiento esta noche')
        self.assertEqual(MensajeInfo.query.count(), 1)

    def test_inactivo_no_se_muestra_y_el_borrador_queda_en_el_admin(self):
        self._put(self.admin, 'Borrador interno', False)
        html = self._header(self.usuario)
        self.assertNotIn('app-header__info', html)
        self.assertNotIn('Borrador interno', html)

        status, data = self._get(self.usuario)
        self.assertEqual(status, 200)
        self.assertEqual(data['texto'], '')
        self.assertFalse(data['activo'])

        status, data = self._get(self.admin)
        self.assertEqual(data['texto'], 'Borrador interno')
        self.assertFalse(data['activo'])

    def test_activo_vacio_y_texto_demasiado_largo(self):
        status, data = self._put(self.admin, '   ', True)
        self.assertEqual(status, 400)
        self.assertFalse(data['ok'])

        status, data = self._put(self.admin, 'a' * (MENSAJE_INFO_TEXTO_MAX + 1), True)
        self.assertEqual(status, 400)
        self.assertIn(str(MENSAJE_INFO_TEXTO_MAX), data['error'])

    def test_pagina_completa_muestra_el_ticker_solo_si_activo(self):
        self._put(self.admin, 'Aviso de prueba en cabecera', True)
        with self.app.test_request_context('/'):
            login_user(self.admin)
            html_admin = render_template('base.html')
        self.assertIn('app-header__info-text', html_admin)
        self.assertIn('Aviso de prueba en cabecera', html_admin)
        self.assertIn('modalMensajeInfo', html_admin)
        self.assertIn('mensaje-info.js', html_admin)

        with self.app.test_request_context('/'):
            login_user(self.usuario)
            html_usuario = render_template('base.html')
        self.assertIn('Aviso de prueba en cabecera', html_usuario)
        self.assertNotIn('btn-mensaje-info', html_usuario)
        self.assertNotIn('mensaje-info.js', html_usuario)

    def test_saltos_de_linea_se_unen(self):
        status, data = self._put(self.admin, 'Hola\n\nmundo', True)
        self.assertEqual(status, 200)
        self.assertEqual(data['texto'], 'Hola mundo')
