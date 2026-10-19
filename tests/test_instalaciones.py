#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests — instalaciones (hub, estado, traslado, sitios) y reprise de datos."""

import os
import re
import unittest
from datetime import date, datetime, timedelta

os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask_login import login_user  # noqa: E402
from werkzeug.datastructures import MultiDict  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Client,
    ClientSitio,
    Incident,
    Instalacion,
    Material,
    MaterialSalida,
    MaterialSalidaLinea,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)
from core.services.instalaciones_backfill import run_instalaciones_backfill  # noqa: E402
from core.services.instalaciones_service import (  # noqa: E402
    create_instalacion,
    create_traslado,
    delete_instalacion,
    ensure_sitio_activo,
    reabrir_instalacion,
    terminar_instalacion,
    update_client_gps,
)
from core.services.materiales_service import (  # noqa: E402
    MaterialesValidationError,
    clamp_list_per_page,
    create_salida,
)


class ClampPerPageTests(unittest.TestCase):
    def test_acepta_valores_lista(self):
        for value in (50, 100, 200, 500):
            self.assertEqual(clamp_list_per_page(value), value)

    def test_rechaza_fuera_de_rango(self):
        self.assertEqual(clamp_list_per_page(25), 50)
        self.assertEqual(clamp_list_per_page('abc'), 50)
        self.assertEqual(clamp_list_per_page(None), 50)


class _InstalacionesBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = app
        cls.app.config['TESTING'] = True
        cls.app.config['WTF_CSRF_ENABLED'] = False
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.ctx = cls.app.app_context()
        cls.ctx.push()
        db.drop_all()
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
            nom='Cliente Alpha', telephone='240200001', adresse='Calle 1', ville='Malabo',
            id_ciudad=ciudad.id,
        )
        cls.client_b = Client(
            nom='Cliente Beta', telephone='240200002', adresse='Calle 2', ville='Bata',
            id_ciudad=ciudad.id,
        )
        cls.material = Material(nombre='ONU filtro', tipo='material_cliente', activo=True)
        db.session.add_all([
            cls.admin, cls.tecnico_a, cls.tecnico_b, cls.client_a, cls.client_b, cls.material,
        ])
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def _form(self, **values):
        data = MultiDict()
        for key, value in values.items():
            if isinstance(value, (list, tuple)):
                for item in value:
                    data.add(key, item)
            else:
                data.add(key, value)
        return data


class InstalacionesHubFilterTests(_InstalacionesBase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        today = date.today()
        cls.inst_a = Instalacion(
            id_client=cls.client_a.id, fecha=today, id_tecnico=cls.tecnico_a.id,
            estado='en_curso', tipo='nueva', id_operateur_registro=cls.admin.id,
        )
        cls.inst_b = Instalacion(
            id_client=cls.client_b.id, fecha=today - timedelta(days=10), id_tecnico=cls.tecnico_b.id,
            estado='terminada', tipo='traslado', id_operateur_registro=cls.admin.id,
        )
        db.session.add_all([cls.inst_a, cls.inst_b])
        db.session.commit()
        cls.salida_a = MaterialSalida(
            fecha=today,
            id_tecnico=cls.tecnico_a.id,
            id_client=cls.client_a.id,
            estado='registrada',
            id_operateur_registro=cls.admin.id,
            tipo_salida='instalacion',
            id_instalacion=cls.inst_a.id,
            observaciones='caja alpha',
        )
        cls.salida_b = MaterialSalida(
            fecha=today - timedelta(days=10),
            id_tecnico=cls.tecnico_b.id,
            id_client=cls.client_b.id,
            estado='registrada',
            id_operateur_registro=cls.admin.id,
            tipo_salida='instalacion',
            id_instalacion=cls.inst_b.id,
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
            id_salida=cls.salida_a.id, id_material=cls.material.id, cantidad=1,
        ))
        db.session.commit()

    def _hub_html(self, query_string='/instalaciones'):
        with self.app.test_request_context(query_string):
            login_user(self.admin)
            html = self.app.view_functions['instalaciones_hub']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def test_lista_instalaciones_con_estado(self):
        html = self._hub_html()
        self.assertIn('Cliente Alpha', html)
        self.assertIn('Cliente Beta', html)
        self.assertIn('En curso', html)
        self.assertIn('Terminada', html)
        self.assertIn('ONU filtro', html)

    def test_filtro_search_cliente(self):
        html = self._hub_html('/instalaciones?search=Alpha')
        self.assertIn('Cliente Alpha', html)
        self.assertNotIn('Cliente Beta', html)

    def test_filtro_search_material(self):
        html = self._hub_html('/instalaciones?search=ONU')
        self.assertIn('Cliente Alpha', html)
        self.assertNotIn('Cliente Beta', html)

    def test_filtro_tecnico(self):
        html = self._hub_html(f'/instalaciones?tecnico={self.tecnico_b.id}')
        self.assertIn('Cliente Beta', html)
        self.assertNotIn('Cliente Alpha', html)

    def test_filtro_estado(self):
        html = self._hub_html('/instalaciones?estado=terminada')
        self.assertIn('Cliente Beta', html)
        self.assertNotIn('Cliente Alpha', html)

    def test_filtro_tipo(self):
        html = self._hub_html('/instalaciones?tipo=traslado')
        self.assertIn('Cliente Beta', html)
        self.assertNotIn('Cliente Alpha', html)

    def test_filtro_fecha(self):
        today = date.today().isoformat()
        html = self._hub_html(f'/instalaciones?date_from={today}')
        self.assertIn('Cliente Alpha', html)
        self.assertNotIn('Cliente Beta', html)

    def _dashboard_html(self, query_string='/'):
        with self.app.test_request_context(query_string):
            login_user(self.admin)
            html = self.app.view_functions['dashboard']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def test_dashboard_instalaciones_del_dia_ignora_periodo(self):
        html = self._dashboard_html('/?period=last_6_months')
        self.assertIn('Instalaciones del día', html)
        self.assertIn('Cliente Alpha', html)
        self.assertIn('ONU filtro', html)
        self.assertIn(f'<strong>#{self.inst_a.id}</strong>', html)
        self.assertIn('En curso', html)
        self.assertIn(f'/instalaciones/{self.inst_a.id}', html)
        self.assertNotIn('Cliente Beta', html)
        self.assertNotIn(f'<strong>#{self.inst_b.id}</strong>', html)
        self.assertNotIn('5 últimos registros', html)

    def _dashboard_html_as(self, user, query_string='/'):
        with self.app.test_request_context(query_string):
            login_user(user)
            html = self.app.view_functions['dashboard']()
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def _dashboard_data_as(self, user, query_string='/dashboard-data'):
        with self.app.test_request_context(query_string):
            login_user(user)
            return self.app.view_functions['dashboard_data']().get_json()

    def test_dashboard_superadmin_filtra_ciudad_y_agencia(self):
        malabo = Ciudad.query.filter_by(nombre='Malabo').one()
        bata = Ciudad.query.filter_by(nombre='Bata').one()
        ag_afrimal = Agencia.query.filter_by(nombre='Afrimal').one()
        ag_bata = Agencia.query.filter_by(nombre='Cocoteros').one()
        superadmin = Operateur(
            nom='super_dash',
            telephone='240100090',
            email='super_dash@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=malabo.id,
            id_agencia=ag_afrimal.id,
            role='superadmin',
            actif=True,
        )
        tecnico_afrimal = Operateur(
            nom='Tecnico Afrimal',
            telephone='240100091',
            email='tec_afrimal@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=malabo.id,
            id_agencia=ag_afrimal.id,
            role='usuario',
            categoria='tecnico',
            actif=True,
        )
        tecnico_bata = Operateur(
            nom='Tecnico Bata',
            telephone='240100092',
            email='tec_bata@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=bata.id,
            id_agencia=ag_bata.id,
            role='usuario',
            categoria='tecnico',
            actif=True,
        )
        client_afrimal = Client(
            nom='Cliente Afrimal', telephone='240200091', adresse='Calle Afrimal', ville='Malabo',
            id_ciudad=malabo.id,
        )
        client_bata = Client(
            nom='Cliente Bata Hoy', telephone='240200092', adresse='Calle Bata', ville='Bata',
            id_ciudad=bata.id,
        )
        db.session.add_all([
            superadmin, tecnico_afrimal, tecnico_bata, client_afrimal, client_bata,
        ])
        db.session.commit()
        today = date.today()
        inst_afrimal = Instalacion(
            id_client=client_afrimal.id, fecha=today, id_tecnico=tecnico_afrimal.id,
            estado='en_curso', tipo='nueva', id_operateur_registro=superadmin.id,
        )
        inst_bata = Instalacion(
            id_client=client_bata.id, fecha=today, id_tecnico=tecnico_bata.id,
            estado='en_curso', tipo='nueva', id_operateur_registro=superadmin.id,
        )
        incident_malabo = Incident(
            id_client=self.client_a.id, intitule='Aviso Malabo', status='Pendiente',
            id_operateur=self.tecnico_a.id, date_heure=datetime.now(),
        )
        incident_bata = Incident(
            id_client=client_bata.id, intitule='Aviso Bata', status='Pendiente',
            id_operateur=tecnico_bata.id, date_heure=datetime.now(),
        )
        db.session.add_all([inst_afrimal, inst_bata, incident_malabo, incident_bata])
        db.session.commit()
        try:
            html_admin = self._dashboard_html(f'/?ciudad={bata.id}&agencia={ag_bata.id}')
            self.assertNotIn('id="dashboard-ciudad"', html_admin)
            self.assertNotIn('id="btn-dashboard-filtrar"', html_admin)
            self.assertIn('Cliente Alpha', html_admin)
            self.assertNotIn('Cliente Bata Hoy', html_admin)
            self.assertEqual(
                self._dashboard_data_as(self.admin, f'/dashboard-data?ciudad={bata.id}')['total_incidents'],
                1,
            )

            html_all = self._dashboard_html_as(superadmin, '/')
            self.assertIn('id="btn-dashboard-filtrar"', html_all)
            self.assertIn('id="modalDashboardFiltro"', html_all)
            self.assertIn('id="dashboard-ciudad"', html_all)
            self.assertIn('Todas las ciudades', html_all)
            self.assertIn('Todas las agencias', html_all)
            self.assertIn('Cliente Alpha', html_all)
            self.assertIn('Cliente Afrimal', html_all)
            self.assertIn('Cliente Bata Hoy', html_all)
            self.assertEqual(self._dashboard_data_as(superadmin, '/dashboard-data')['total_incidents'], 2)

            html_bata = self._dashboard_html_as(superadmin, f'/?ciudad={bata.id}')
            self.assertIn('Cliente Bata Hoy', html_bata)
            self.assertNotIn('Cliente Alpha', html_bata)
            self.assertNotIn('Cliente Afrimal', html_bata)
            agencia_select = re.search(r'id="dashboard-agencia".*?</select>', html_bata, re.S)
            self.assertIsNotNone(agencia_select)
            self.assertIn('Cocoteros', agencia_select.group(0))
            self.assertNotIn('Afrimal', agencia_select.group(0))
            self.assertIn(
                f'ciudad={bata.id}',
                html_bata,
            )
            self.assertEqual(
                self._dashboard_data_as(superadmin, f'/dashboard-data?ciudad={bata.id}')['total_incidents'],
                1,
            )

            html_afrimal = self._dashboard_html_as(superadmin, f'/?agencia={ag_afrimal.id}')
            self.assertIn('Cliente Afrimal', html_afrimal)
            self.assertNotIn('Cliente Alpha', html_afrimal)
            self.assertNotIn('Cliente Bata Hoy', html_afrimal)

            html_mismatch = self._dashboard_html_as(
                superadmin, f'/?ciudad={malabo.id}&agencia={ag_bata.id}',
            )
            self.assertIn('Cliente Alpha', html_mismatch)
            self.assertIn('Cliente Afrimal', html_mismatch)
            self.assertNotIn('Cliente Bata Hoy', html_mismatch)
            self.assertNotIn(f'agencia={ag_bata.id}', html_mismatch)
        finally:
            for row in (incident_malabo, incident_bata, inst_afrimal, inst_bata):
                db.session.delete(row)
            db.session.commit()
            for row in (client_afrimal, client_bata, tecnico_afrimal, tecnico_bata, superadmin):
                db.session.delete(row)
            db.session.commit()

    def test_per_page_invalido_cae_a_50(self):
        html = self._hub_html('/instalaciones?per_page=25')
        self.assertIn('option value="50" selected', html)

    def test_paginacion_conserva_filtros(self):
        extras = [
            Instalacion(
                id_client=self.client_a.id, fecha=date.today(), id_tecnico=self.tecnico_a.id,
                id_operateur_registro=self.admin.id,
            )
            for _ in range(50)
        ]
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
            for inst in extras:
                db.session.delete(inst)
            db.session.commit()


class InstalacionCicloTests(_InstalacionesBase):
    def test_crear_terminar_reabrir(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
        ), self.admin)
        self.assertEqual(inst.estado, 'en_curso')
        self.assertEqual(inst.tipo, 'nueva')
        self.assertIsNotNone(inst.sitio)
        self.assertTrue(inst.sitio.activo)
        self.assertEqual(inst.sitio.adresse, 'Calle 1')

        terminar_instalacion(inst.id, self.admin)
        self.assertEqual(inst.estado, 'terminada')
        self.assertIsNotNone(inst.terminada_le)
        with self.assertRaises(MaterialesValidationError):
            terminar_instalacion(inst.id, self.admin)

        reabrir_instalacion(inst.id, self.admin)
        self.assertEqual(inst.estado, 'en_curso')
        self.assertIsNone(inst.terminada_le)

    def test_reabrir_solo_admin(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_b.id),
        ), self.admin)
        terminar_instalacion(inst.id, self.admin)
        with self.assertRaises(MaterialesValidationError):
            reabrir_instalacion(inst.id, self.tecnico_a)

    def test_crear_instalacion_sin_material(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
            **{'material_id[]': [''], 'cantidad[]': ['1']},
        ), self.admin)
        self.assertEqual(inst.salidas, [])

    def test_crear_instalacion_con_material_crea_salida(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
            **{'material_id[]': [str(self.material.id), ''], 'cantidad[]': ['3', '1']},
        ), self.admin)
        self.assertEqual(len(inst.salidas), 1)
        salida = inst.salidas[0]
        self.assertEqual(salida.tipo_salida, 'instalacion')
        self.assertEqual(salida.id_client, self.client_a.id)
        self.assertEqual(salida.id_tecnico, self.tecnico_a.id)
        self.assertEqual([(l.id_material, l.cantidad) for l in salida.lineas], [(self.material.id, 3)])

    def test_eliminar_instalacion_nueva_borra_salidas(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
            **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['2']},
        ), self.admin)
        inst_id = inst.id
        salida_id = inst.salidas[0].id
        delete_instalacion(inst_id, self.admin)
        self.assertIsNone(db.session.get(Instalacion, inst_id))
        self.assertIsNone(db.session.get(MaterialSalida, salida_id))
        self.assertEqual(MaterialSalidaLinea.query.filter_by(id_salida=salida_id).count(), 0)

    def test_salida_instalacion_con_id_instalacion(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
        ), self.admin)
        salida = create_salida(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
            tipo_salida='instalacion',
            id_instalacion=str(inst.id),
            **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['2']},
        ), self.admin)
        self.assertEqual(salida.id_instalacion, inst.id)

    def test_salida_instalacion_sin_id_instalacion_rechazada(self):
        with self.assertRaises(MaterialesValidationError):
            create_salida(self._form(
                fecha=date.today().isoformat(),
                id_tecnico=str(self.tecnico_a.id),
                id_client=str(self.client_a.id),
                tipo_salida='instalacion',
                **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['2']},
            ), self.admin)
        db.session.rollback()

    def test_salida_instalacion_rechaza_cliente_distinto(self):
        inst = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_a.id),
        ), self.admin)
        with self.assertRaises(MaterialesValidationError):
            create_salida(self._form(
                fecha=date.today().isoformat(),
                id_tecnico=str(self.tecnico_a.id),
                id_client=str(self.client_b.id),
                tipo_salida='instalacion',
                id_instalacion=str(inst.id),
                **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['1']},
            ), self.admin)
        db.session.rollback()

    def test_salida_uso_interno_sin_instalacion(self):
        salida = create_salida(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            tipo_salida='uso_interno',
            **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['1']},
        ), self.admin)
        self.assertIsNone(salida.id_instalacion)


class TrasladoTests(_InstalacionesBase):
    def test_traslado_cierra_sitio_y_crea_instalacion(self):
        client = Client(
            nom='Cliente Traslado', telephone='240200099', adresse='Vieja 1', ville='Malabo',
        )
        db.session.add(client)
        db.session.commit()
        with self.app.test_request_context('/'):
            update_client_gps(client, 3.75, 8.78, self.admin)
            db.session.commit()
        origen = client.sitio_activo
        self.assertIsNotNone(origen)

        inst = create_traslado(client, self._form(
            adresse='Nueva 2',
            ville='Ela Nguema',
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_b.id),
            gps_pair='3.70, 8.70',
            **{
                'material_id[]': [str(self.material.id), ''],
                'cantidad[]': ['1', '1'],
                'accion[]': ['reutilizado', 'retirado'],
            },
        ), self.admin)

        self.assertEqual(inst.tipo, 'traslado')
        self.assertEqual(inst.estado, 'en_curso')
        self.assertEqual(inst.id_sitio_origen, origen.id)
        self.assertFalse(origen.activo)
        self.assertEqual(origen.hasta, date.today())
        self.assertEqual(float(origen.latitud), 3.75)

        nuevo = client.sitio_activo
        self.assertEqual(nuevo.id, inst.id_sitio)
        self.assertEqual(nuevo.adresse, 'Nueva 2')
        self.assertEqual(float(nuevo.latitud), 3.70)
        self.assertEqual(client.adresse, 'Nueva 2')
        self.assertEqual(float(client.latitud), 3.70)
        self.assertEqual(len([s for s in client.sitios if s.activo]), 1)

        self.assertEqual(len(inst.lineas_traslado), 1)
        self.assertEqual(inst.lineas_traslado[0].accion, 'reutilizado')

    def test_traslado_no_se_puede_eliminar(self):
        client = Client(nom='Cliente Traslado Del', telephone='240200098', adresse='Vieja 9', ville='Malabo')
        db.session.add(client)
        db.session.commit()
        inst = create_traslado(client, self._form(
            adresse='Nueva 9', ville='Malabo', fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
        ), self.admin)
        with self.assertRaises(MaterialesValidationError):
            delete_instalacion(inst.id, self.admin)
        self.assertIsNotNone(db.session.get(Instalacion, inst.id))

    def test_traslado_exige_direccion(self):
        with self.assertRaises(MaterialesValidationError):
            create_traslado(self.client_b, self._form(
                adresse='', ville='Bata', fecha=date.today().isoformat(),
                id_tecnico=str(self.tecnico_a.id),
            ), self.admin)
        db.session.rollback()

    def test_traslado_sin_gps_deja_gps_vacio(self):
        client = Client(nom='Sin GPS', telephone='240200098', adresse='A', ville='B')
        db.session.add(client)
        db.session.commit()
        create_traslado(client, self._form(
            adresse='C', ville='D', fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
        ), self.admin)
        self.assertFalse(client.sitio_activo.has_gps)
        self.assertIsNone(client.latitud)


class InstalacionesPaginasTests(_InstalacionesBase):
    def _render(self, endpoint, path, **kwargs):
        with self.app.test_request_context(path):
            login_user(self.admin)
            html = self.app.view_functions[endpoint](**kwargs)
            if hasattr(html, 'get_data'):
                html = html.get_data(as_text=True)
            return html

    def test_paginas_renderizan(self):
        inst = create_traslado(self.client_a, self._form(
            adresse='Nueva Render', ville='Malabo', fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            **{'material_id[]': [str(self.material.id)], 'cantidad[]': ['1'], 'accion[]': ['retirado']},
        ), self.admin)

        html = self._render('instalaciones_detalle', f'/instalaciones/{inst.id}', instalacion_id=inst.id)
        self.assertIn('Traslado', html)
        self.assertIn('Retirado', html)
        self.assertIn('Calle 1', html)
        self.assertIn('Añadir material', html)
        self.assertNotIn('confirmerSuppressionInstalacion(this)', html)

        html = self._render('instalaciones_modificar', f'/instalaciones/{inst.id}/modificar', instalacion_id=inst.id)
        self.assertIn('instalacionForm', html)

        nueva = create_instalacion(self._form(
            fecha=date.today().isoformat(),
            id_tecnico=str(self.tecnico_a.id),
            id_client=str(self.client_b.id),
        ), self.admin)
        html = self._render('instalaciones_detalle', f'/instalaciones/{nueva.id}', instalacion_id=nueva.id)
        self.assertIn(f'/instalaciones/{nueva.id}/eliminar', html)
        self.assertIn('confirmEliminarInstalacionModal', html)

        html = self._render('instalaciones_hub', '/instalaciones')
        self.assertIn(f'/instalaciones/{nueva.id}/eliminar', html)
        self.assertNotIn(f'/instalaciones/{inst.id}/eliminar', html)

        html = self._render('instalaciones_nueva', f'/instalaciones/nueva?client={self.client_a.id}')
        self.assertIn('Cliente Alpha', html)
        self.assertIn('Material entregado', html)
        self.assertIn('id="lineaRowTemplate"', html)
        self.assertIn('ONU filtro', html)
        self.assertNotIn('name="material_id[]" class="form-select material-select" required', html)

        html = self._render('client_traslado', f'/clients/{self.client_a.id}/traslado', id=self.client_a.id)
        self.assertIn('Nueva Render', html)
        self.assertIn('Reutilizado', html)

        html = self._render('fiche_client', f'/clients/{self.client_a.id}/fiche', id=self.client_a.id)
        self.assertIn('Direcciones anteriores', html)
        self.assertIn(f'#{inst.id}', html)

        html = self._render(
            'materiales_salida_nueva',
            f'/materiales/salida/nueva?tipo=instalacion&instalacion={inst.id}',
        )
        self.assertIn(f'name="id_instalacion" value="{inst.id}"', html)
        self.assertIn('no modificable', html)
        self.assertNotIn('id="client_search"', html)

        html = self._render('instalaciones_modificar', f'/instalaciones/{inst.id}/modificar', instalacion_id=inst.id)
        self.assertNotIn('id="lineasBody"', html)

        html = self._render('materiales_salidas', '/materiales/salidas')
        self.assertIn('id="tipo_salida_incidencia"', html)
        self.assertNotIn('id="tipo_salida_instalacion"', html)


class BackfillTests(_InstalacionesBase):
    def test_backfill_idempotente(self):
        client = Client(nom='Legado', telephone='240200050', adresse='Antigua', ville='Malabo')
        db.session.add(client)
        db.session.commit()
        salida = MaterialSalida(
            fecha=date.today() - timedelta(days=30),
            id_tecnico=self.tecnico_a.id,
            id_client=client.id,
            estado='registrada',
            id_operateur_registro=self.admin.id,
            tipo_salida='instalacion',
        )
        db.session.add(salida)
        db.session.commit()

        for _ in range(2):
            with db.engine.begin() as conn:
                run_instalaciones_backfill(conn)
        db.session.expire_all()

        sitios = ClientSitio.query.filter_by(id_client=client.id).all()
        self.assertEqual(len(sitios), 1)
        self.assertTrue(sitios[0].activo)
        self.assertEqual(sitios[0].adresse, 'Antigua')

        salida = db.session.get(MaterialSalida, salida.id)
        self.assertIsNotNone(salida.id_instalacion)
        inst = salida.instalacion
        self.assertEqual(inst.estado, 'terminada')
        self.assertEqual(inst.tipo, 'nueva')
        self.assertEqual(inst.id_sitio, sitios[0].id)
        self.assertEqual(Instalacion.query.filter_by(id_client=client.id).count(), 1)

    def test_ensure_sitio_activo_crea_una_vez(self):
        client = Client(nom='Lazy', telephone='240200051', adresse='X', ville='Y')
        db.session.add(client)
        db.session.commit()
        first = ensure_sitio_activo(client)
        second = ensure_sitio_activo(client)
        db.session.commit()
        self.assertEqual(first.id, second.id)


if __name__ == '__main__':
    unittest.main()
