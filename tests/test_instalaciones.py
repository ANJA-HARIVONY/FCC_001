#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests — hub Instalaciones (filtros y paginación como clientes/incidencias)."""

import os
import unittest
from datetime import date, timedelta

os.environ.setdefault('WEASYPRINT_AVAILABLE', 'false')
os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask_login import login_user  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Client,
    Material,
    MaterialSalida,
    MaterialSalidaLinea,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)
from core.services.materiales_service import clamp_list_per_page  # noqa: E402


class ClampPerPageTests(unittest.TestCase):
    def test_acepta_valores_lista(self):
        for value in (50, 100, 200, 500):
            self.assertEqual(clamp_list_per_page(value), value)

    def test_rechaza_fuera_de_rango(self):
        self.assertEqual(clamp_list_per_page(25), 50)
        self.assertEqual(clamp_list_per_page('abc'), 50)
        self.assertEqual(clamp_list_per_page(None), 50)


class InstalacionesHubFilterTests(unittest.TestCase):
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
            nom='admin_instala',
            telephone='240100001',
            email='admin_instala@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        cls.tecnico_a = Operateur(
            nom='Tecnico Alpha',
            telephone='240100002',
            email='tec_alpha@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            categoria='tecnico',
            actif=True,
        )
        cls.tecnico_b = Operateur(
            nom='Tecnico Beta',
            telephone='240100003',
            email='tec_beta@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            categoria='tecnico',
            actif=True,
        )
        cls.client_a = Client(
            nom='Cliente Alpha',
            telephone='240200001',
            adresse='Calle 1',
            ville='Malabo',
            id_ciudad=ciudad.id,
        )
        cls.client_b = Client(
            nom='Cliente Beta',
            telephone='240200002',
            adresse='Calle 2',
            ville='Bata',
            id_ciudad=ciudad.id,
        )
        cls.material = Material(
            nombre='ONU filtro',
            tipo='material_cliente',
            activo=True,
        )
        db.session.add_all([
            cls.admin, cls.tecnico_a, cls.tecnico_b, cls.client_a, cls.client_b, cls.material,
        ])
        db.session.commit()

        today = date.today()
        cls.salida_a = MaterialSalida(
            fecha=today,
            id_tecnico=cls.tecnico_a.id,
            id_client=cls.client_a.id,
            estado='registrada',
            id_operateur_registro=cls.admin.id,
            tipo_salida='instalacion',
            observaciones='caja alpha',
        )
        cls.salida_b = MaterialSalida(
            fecha=today - timedelta(days=10),
            id_tecnico=cls.tecnico_b.id,
            id_client=cls.client_b.id,
            estado='registrada',
            id_operateur_registro=cls.admin.id,
            tipo_salida='instalacion',
        )
        cls.salida_interna = MaterialSalida(
            fecha=today,
            id_tecnico=cls.tecnico_a.id,
            id_client=None,
            estado='registrada',
            id_operateur_registro=cls.admin.id,
            tipo_salida='uso_interno',
        )
        db.session.add_all([cls.salida_a, cls.salida_b, cls.salida_interna])
        db.session.commit()
        db.session.add(MaterialSalidaLinea(
            id_salida=cls.salida_a.id,
            id_material=cls.material.id,
            cantidad=1,
        ))
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def _hub_html(self, query_string='/instalaciones'):
        with self.app.test_request_context(query_string):
            login_user(self.admin)
            html = self.app.view_functions['instalaciones_hub']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def test_lista_solo_tipo_instalacion(self):
        html = self._hub_html()
        self.assertIn('Cliente Alpha', html)
        self.assertIn('Cliente Beta', html)
        self.assertNotIn('uso_interno', html)

    def test_filtro_search_cliente(self):
        html = self._hub_html('/instalaciones?search=Alpha')
        self.assertIn('Cliente Alpha', html)
        self.assertNotIn('Cliente Beta', html)

    def test_filtro_tecnico(self):
        html = self._hub_html(f'/instalaciones?tecnico={self.tecnico_b.id}')
        self.assertIn('Cliente Beta', html)
        self.assertNotIn('Cliente Alpha', html)

    def test_filtro_fecha(self):
        today = date.today().isoformat()
        html = self._hub_html(f'/instalaciones?date_from={today}')
        self.assertIn('Cliente Alpha', html)
        self.assertNotIn('Cliente Beta', html)

    def test_per_page_invalido_cae_a_50(self):
        html = self._hub_html('/instalaciones?per_page=25')
        self.assertIn('option value="50" selected', html)

    def test_paginacion_conserva_filtros(self):
        extras = []
        today = date.today()
        for index in range(50):
            extras.append(MaterialSalida(
                fecha=today,
                id_tecnico=self.tecnico_a.id,
                id_client=self.client_a.id,
                estado='registrada',
                id_operateur_registro=self.admin.id,
                tipo_salida='instalacion',
            ))
        db.session.add_all(extras)
        db.session.commit()
        try:
            html = self._hub_html('/instalaciones?search=Alpha&per_page=50')
            self.assertIn('pagination', html)
            self.assertIn('page=2', html)
            self.assertIn('search=Alpha', html)
            self.assertIn('per_page=50', html)
            self.assertIn('Mostrando', html)
        finally:
            for salida in extras:
                db.session.delete(salida)
            db.session.commit()


if __name__ == '__main__':
    unittest.main()
