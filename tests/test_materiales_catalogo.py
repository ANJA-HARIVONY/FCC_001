#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests — tri du catalogue de materiales (nombre, modelo)."""

import os
import unittest

os.environ.setdefault('WEASYPRINT_AVAILABLE', 'false')
os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask_login import login_user  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Material,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)


class MaterialesCatalogoSortTests(unittest.TestCase):
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
            nom='admin_catalogo',
            telephone='240300101',
            email='admin_catalogo@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        db.session.add(cls.admin)
        db.session.commit()
        db.session.add_all([
            Material(nombre='Antena', modelo='A1', tipo='outillage', activo=True),
            Material(nombre='Cable', modelo='M9', tipo='material_cliente', activo=True),
            Material(nombre='Router', modelo=None, tipo='outillage', activo=True),
            Material(nombre='Bobina', modelo='B2', tipo='material_cliente', activo=True),
        ])
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def _html(self, query_string='/materiales/catalogo'):
        with self.app.test_request_context(query_string):
            login_user(self.admin)
            html = self.app.view_functions['materiales_catalogo']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def _ordered_nombres(self, html):
        positions = [(html.find(f'>{name}<'), name) for name in ('Antena', 'Bobina', 'Cable', 'Router')]
        positions = [(pos, name) for pos, name in positions if pos >= 0]
        positions.sort()
        return [name for _, name in positions]

    def test_defaut_groupe_par_tipo_puis_nombre(self):
        self.assertEqual(
            self._ordered_nombres(self._html()),
            ['Bobina', 'Cable', 'Antena', 'Router'],
        )

    def test_tri_nombre_asc_et_desc(self):
        self.assertEqual(
            self._ordered_nombres(self._html('/materiales/catalogo?sort=nombre&order=asc')),
            ['Antena', 'Bobina', 'Cable', 'Router'],
        )
        self.assertEqual(
            self._ordered_nombres(self._html('/materiales/catalogo?sort=nombre&order=desc')),
            ['Router', 'Cable', 'Bobina', 'Antena'],
        )

    def test_tri_modelo_asc_place_les_vides_en_tete(self):
        self.assertEqual(
            self._ordered_nombres(self._html('/materiales/catalogo?sort=modelo&order=asc')),
            ['Router', 'Antena', 'Bobina', 'Cable'],
        )

    def test_tri_invalide_revient_au_defaut(self):
        self.assertEqual(
            self._ordered_nombres(self._html('/materiales/catalogo?sort=tipo&order=desc')),
            ['Bobina', 'Cable', 'Antena', 'Router'],
        )

    def test_liens_de_tri_conservent_le_filtre_tipo(self):
        html = self._html('/materiales/catalogo?tipo=outillage&sort=nombre&order=asc')
        self.assertIn('sort=nombre', html)
        self.assertIn('sort=modelo', html)
        self.assertIn('tipo=outillage', html)
        self.assertIn('fa-sort-up', html)
        self.assertIn('>Antena<', html)
        self.assertIn('>Router<', html)
        self.assertNotIn('>Cable<', html)
        self.assertNotIn('>Bobina<', html)
