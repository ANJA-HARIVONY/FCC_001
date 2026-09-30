#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests — paginación de Salidas de material (mismo esquema que clientes/incidencias)."""

import os
import unittest
from datetime import date

os.environ.setdefault('WEASYPRINT_AVAILABLE', 'false')
os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask_login import login_user  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from werkzeug.exceptions import Forbidden  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Material,
    MaterialSalida,
    MaterialSalidaLinea,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)


class MaterialesSalidasPaginationTests(unittest.TestCase):
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
            nom='admin_salidas',
            telephone='240300001',
            email='admin_salidas@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        cls.tecnico = Operateur(
            nom='Tecnico Salidas',
            telephone='240300002',
            email='tec_salidas@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            categoria='tecnico',
            actif=True,
        )
        db.session.add_all([cls.admin, cls.tecnico])
        db.session.commit()
        extras = [
            MaterialSalida(
                fecha=date.today(),
                id_tecnico=cls.tecnico.id,
                id_client=None,
                estado='registrada',
                id_operateur_registro=cls.admin.id,
                tipo_salida='uso_interno',
            )
            for _ in range(51)
        ]
        db.session.add_all(extras)
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def _html(self, query_string='/materiales/salidas'):
        with self.app.test_request_context(query_string):
            login_user(self.admin)
            html = self.app.view_functions['materiales_salidas']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def test_per_page_invalido_cae_a_50(self):
        html = self._html('/materiales/salidas?per_page=25')
        self.assertIn('name="per_page"', html)
        self.assertIn('option value="50" selected', html)

    def test_filtros_reproducen_botones_incidencias(self):
        html = self._html()
        self.assertIn('Filtros de búsqueda', html)
        self.assertIn('formFiltrosSalidas', html)
        self.assertIn('name="search"', html)
        self.assertIn('Recordar filtros', html)
        self.assertIn('Buscar', html)
        self.assertIn('Reiniciar', html)
        self.assertIn('printReport()', html)
        self.assertIn('/materiales/salidas/export.xlsx', html)
        self.assertIn('materiales_salidas_export_xlsx', app.view_functions)

    def test_export_xlsx_pagina_actual(self):
        with self.app.test_request_context('/materiales/salidas/export.xlsx?per_page=50'):
            login_user(self.admin)
            response = self.app.view_functions['materiales_salidas_export_xlsx']()
            self.assertEqual(response.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.assertTrue(response.headers.get('Content-Disposition', '').startswith('attachment'))

    def test_paginacion_numerada_conserva_filtros(self):
        html = self._html('/materiales/salidas?tipo_salida=uso_interno&per_page=50')
        self.assertIn('pagination', html)
        self.assertIn('page=2', html)
        self.assertIn('tipo_salida=uso_interno', html)
        self.assertIn('per_page=50', html)
        self.assertIn('Mostrando', html)

    def test_lista_admin_muestra_eliminar(self):
        html = self._html()
        self.assertIn('confirmerSuppressionSalida', html)
        self.assertIn('confirmEliminarSalidaModal', html)
        self.assertIn('fa-trash', html)

    def test_admin_elimina_salida_y_lineas(self):
        material = Material(nombre='Router test eliminar', tipo='material_cliente', activo=True)
        db.session.add(material)
        db.session.flush()
        salida = MaterialSalida(
            fecha=date.today(),
            id_tecnico=self.tecnico.id,
            id_client=None,
            estado='registrada',
            id_operateur_registro=self.admin.id,
            tipo_salida='uso_interno',
        )
        db.session.add(salida)
        db.session.flush()
        db.session.add(MaterialSalidaLinea(id_salida=salida.id, id_material=material.id, cantidad=2))
        db.session.commit()
        sid = salida.id

        with self.app.test_request_context(
            f'/materiales/salidas/{sid}/supprimer',
            method='POST',
        ):
            login_user(self.admin)
            response = self.app.view_functions['materiales_salida_supprimer'](salida_id=sid)

        self.assertEqual(response.status_code, 302)
        self.assertIsNone(db.session.get(MaterialSalida, sid))
        self.assertEqual(MaterialSalidaLinea.query.filter_by(id_salida=sid).count(), 0)

    def test_usuario_no_puede_eliminar_salida(self):
        salida = MaterialSalida.query.first()
        with self.app.test_request_context(
            f'/materiales/salidas/{salida.id}/supprimer',
            method='POST',
        ):
            login_user(self.tecnico)
            with self.assertRaises(Forbidden):
                self.app.view_functions['materiales_salida_supprimer'](salida_id=salida.id)


if __name__ == '__main__':
    unittest.main()
