#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Toast d'incidencias Pendiente : un usuario ne voit que les siennes."""

import os
import unittest
from datetime import datetime, timedelta

os.environ['FLASK_ENV'] = 'testing'
os.environ['WTF_CSRF_ENABLED'] = 'false'

from flask_login import login_user  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from core.app import (  # noqa: E402
    Agencia,
    Ciudad,
    Client,
    Incident,
    Operateur,
    app,
    db,
    ensure_ciudad_agencia_seed,
)


class IncidentsPendientesToastTests(unittest.TestCase):
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
        cls.usuario = Operateur(
            nom='usuario_toast',
            telephone='240000301',
            email='usuario_toast@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            actif=True,
        )
        cls.collegue = Operateur(
            nom='collegue_toast',
            telephone='240000302',
            email='collegue_toast@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='usuario',
            actif=True,
        )
        cls.admin = Operateur(
            nom='admin_toast',
            telephone='240000303',
            email='admin_toast@example.com',
            mot_de_passe_hash=generate_password_hash('secret'),
            id_ciudad=ciudad.id,
            id_agencia=agencia.id,
            role='admin',
            actif=True,
        )
        db.session.add_all([cls.usuario, cls.collegue, cls.admin])
        db.session.commit()
        cls.client = Client(
            nom='Cliente toast',
            telephone='240000310',
            adresse='Calle toast',
            ville='Malabo',
            id_ciudad=ciudad.id,
        )
        db.session.add(cls.client)
        db.session.commit()

    @classmethod
    def tearDownClass(cls):
        db.session.remove()
        db.drop_all()
        cls.ctx.pop()

    def setUp(self):
        Incident.query.delete()
        db.session.commit()
        maintenant = datetime.now()
        ancienne = maintenant - timedelta(minutes=45)
        recente = maintenant - timedelta(minutes=5)
        self.mienne = self._incident(self.usuario, 'Pendiente', ancienne, 'La mía')
        self.collegue_inc = self._incident(self.collegue, 'Pendiente', ancienne, 'La del colega')
        self.recente = self._incident(self.usuario, 'Pendiente', recente, 'Reciente')
        self.solucionada = self._incident(self.usuario, 'Solucionadas', ancienne, 'Ya resuelta')

    def _incident(self, operateur, status, quand, intitule):
        incident = Incident(
            id_client=self.client.id,
            intitule=intitule,
            status=status,
            id_operateur=operateur.id,
            date_heure=quand,
        )
        db.session.add(incident)
        db.session.commit()
        return incident

    def _ids(self, user):
        with self.app.test_request_context('/api/incidents-pendientes'):
            login_user(user)
            response = self.app.view_functions['api_incidents_pendientes']()
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        return {item['id'] for item in data['notifications']}

    def test_usuario_solo_ve_sus_pendientes_antiguas(self):
        ids = self._ids(self.usuario)
        self.assertEqual(ids, {self.mienne.id})

    def test_admin_ve_las_pendientes_de_su_agencia_y_ciudad(self):
        ids = self._ids(self.admin)
        self.assertEqual(ids, {self.mienne.id, self.collegue_inc.id})
