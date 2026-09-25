#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests unitaires — navigation sidebar (endpoints valides, droits admin)."""

import os
import re
import unittest

os.environ.setdefault('WEASYPRINT_AVAILABLE', 'false')
os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask import render_template  # noqa: E402
from flask_login import login_user  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)
from werkzeug.security import generate_password_hash  # noqa: E402

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_SIDEBAR = os.path.join(_ROOT, 'presentation', 'templates', 'partials', '_sidebar.html')
_URL_FOR_RE = re.compile(r"url_for\(\s*'([^']+)'")


def _sidebar_endpoints():
    with open(_SIDEBAR, encoding='utf-8') as handle:
        return _URL_FOR_RE.findall(handle.read())


def _sidebar_source():
    with open(_SIDEBAR, encoding='utf-8') as handle:
        return handle.read()


class SidebarTemplateTests(unittest.TestCase):
    def test_sidebar_url_for_endpoints_existen(self):
        endpoints = _sidebar_endpoints()
        self.assertTrue(endpoints)
        missing = [ep for ep in endpoints if ep not in app.view_functions]
        self.assertEqual(
            missing,
            [],
            f'url_for en _sidebar.html apunta a rutas inexistentes: {missing}',
        )

    def test_instalaciones_no_reutiliza_nav_materiales(self):
        source = _sidebar_source()
        self.assertIn('nav-menu-label">Instalaciones', source)
        prefix = source.split('nav-menu-label">Instalaciones', 1)[0]
        block = prefix[prefix.rfind('<li '):]
        self.assertNotIn(
            'nav_materiales',
            block,
            'El ítem Instalaciones no debe reutilizar nav_materiales '
            '(Materiales y Instalaciones quedarían activos a la vez).',
        )
        self.assertIn('nav_instalaciones', block)

    def test_materiales_e_instalaciones_tienen_hubs_distintos(self):
        source = _sidebar_source()
        self.assertIn("url_for('materiales_hub')", source)
        self.assertIn("url_for('instalaciones_hub')", source)
        self.assertIn('instalaciones_hub', app.view_functions)


class SidebarRenderTests(unittest.TestCase):
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
            nom='admin_test',
            telephone='240000001',
            email='admin_test@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        cls.usuario = Operateur(
            nom='usuario_test',
            telephone='240000002',
            email='usuario_test@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            actif=True,
        )
        db.session.add_all([cls.admin, cls.usuario])
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def _render_sidebar(self, user):
        with self.app.test_request_context('/'):
            login_user(user)
            return render_template('partials/_sidebar.html')

    def test_admin_sidebar_materiales_e_instalaciones(self):
        html = self._render_sidebar(self.admin)
        self.assertIn('nav-menu-label">Materiales', html)
        self.assertIn('/materiales', html)
        self.assertIn('nav-menu-label">Instalaciones', html)
        self.assertIn('/instalaciones', html)

    def test_usuario_no_ve_materiales_ni_instalaciones(self):
        html = self._render_sidebar(self.usuario)
        self.assertNotIn('nav-menu-label">Materiales', html)
        self.assertNotIn('nav-menu-label">Instalaciones', html)
        self.assertIn('nav-menu-label">Clientes', html)

    def test_instalaciones_hub_admin_ok_usuario_403(self):
        from werkzeug.exceptions import Forbidden

        with self.app.test_request_context('/instalaciones'):
            login_user(self.admin)
            html = self.app.view_functions['instalaciones_hub']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            self.assertIn('Nueva instalación', html)
            self.assertIn('/materiales/salida/nueva?tipo=instalacion', html)
            self.assertIn('Filtros de búsqueda', html)
            self.assertIn('name="per_page"', html)
            self.assertIn('name="search"', html)
            self.assertIn('name="tecnico"', html)
            self.assertIn('name="date_from"', html)
            self.assertIn('name="date_to"', html)

        with self.app.test_request_context('/instalaciones'):
            login_user(self.usuario)
            with self.assertRaises(Forbidden):
                self.app.view_functions['instalaciones_hub']()

    def test_nueva_salida_instalacion_preselecciona_tipo(self):
        with self.app.test_request_context('/materiales/salida/nueva?tipo=instalacion'):
            login_user(self.admin)
            html = self.app.view_functions['materiales_salida_nueva']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            self.assertIn('name="tipo_salida"', html)
            self.assertIn('value="instalacion"', html)
            self.assertIn('Nueva salida de instalación', html)


if __name__ == '__main__':
    unittest.main()
