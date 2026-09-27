#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reprise idempotente : sitios de clientes, fotos y salidas de instalación existentes.

SQL puro sobre una conexión (Alembic o engine) : no importar core.app aquí.
"""

from datetime import datetime

from sqlalchemy import text


def backfill_client_sitios(conn):
    """Un sitio activo por cliente sin sitio, copiado de la dirección y GPS actuales."""
    conn.execute(
        text(
            'INSERT INTO client_sitio '
            '(id_client, adresse, ville, latitud, longitud, gps_actualizado_le, '
            'id_operateur_gps, activo, desde, hasta, creado_le) '
            'SELECT c.id, COALESCE(c.adresse, \'\'), COALESCE(c.ville, \'\'), c.latitud, c.longitud, '
            'c.gps_actualizado_le, c.id_operateur_gps, :activo, NULL, NULL, :now '
            'FROM client c '
            'WHERE NOT EXISTS (SELECT 1 FROM client_sitio s WHERE s.id_client = c.id)'
        ),
        {'activo': True, 'now': datetime.now()},
    )


def backfill_fotos_sitio(conn):
    """Asocia las fotos sin sitio al sitio activo de su cliente."""
    conn.execute(
        text(
            'UPDATE instalacion_foto SET id_sitio = ('
            'SELECT MAX(s.id) FROM client_sitio s '
            'WHERE s.id_client = instalacion_foto.id_client AND s.activo = :activo'
            ') WHERE id_sitio IS NULL AND id_client IS NOT NULL'
        ),
        {'activo': True},
    )


def backfill_instalaciones_desde_salidas(conn):
    """Una instalación terminada por cada salida tipo instalacion aún sin instalación."""
    rows = conn.execute(
        text(
            'SELECT id, id_client, fecha, id_tecnico, id_operateur_registro, fecha_registro '
            'FROM material_salida '
            "WHERE tipo_salida = 'instalacion' AND id_instalacion IS NULL AND id_client IS NOT NULL "
            'ORDER BY id'
        )
    ).fetchall()
    now = datetime.now()
    for row in rows:
        sitio_id = conn.execute(
            text(
                'SELECT MAX(id) FROM client_sitio WHERE id_client = :cid AND activo = :activo'
            ),
            {'cid': row.id_client, 'activo': True},
        ).scalar()
        registrada = row.fecha_registro or now
        result = conn.execute(
            text(
                'INSERT INTO instalacion '
                '(id_client, id_sitio, id_sitio_origen, tipo, estado, fecha, id_tecnico, '
                'observaciones, id_operateur_registro, fecha_registro, terminada_le) '
                "VALUES (:cid, :sid, NULL, 'nueva', 'terminada', :fecha, :tec, NULL, :reg, :freg, :term)"
            ),
            {
                'cid': row.id_client,
                'sid': sitio_id,
                'fecha': row.fecha,
                'tec': row.id_tecnico,
                'reg': row.id_operateur_registro,
                'freg': registrada,
                'term': registrada,
            },
        )
        conn.execute(
            text('UPDATE material_salida SET id_instalacion = :iid WHERE id = :sid'),
            {'iid': result.lastrowid, 'sid': row.id},
        )


def run_instalaciones_backfill(conn):
    backfill_client_sitios(conn)
    backfill_fotos_sitio(conn)
    backfill_instalaciones_desde_salidas(conn)
