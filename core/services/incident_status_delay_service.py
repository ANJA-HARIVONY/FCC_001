#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cálculo de retrasos en cambio de estado (Atención al cliente)."""

from calendar import monthrange
from datetime import date, datetime, time

from sqlalchemy.orm import joinedload

STATUS_DELAY_THRESHOLD_DEFAULT = 30
STATUS_DELAY_TARGET_STATUSES = ('Bitrix', 'Solucionadas')
STATUS_DELAY_ALLOWED_TRANSITIONS = {
    (None, 'Bitrix'),
    (None, 'Solucionadas'),
    ('Pendiente', 'Bitrix'),
    ('Pendiente', 'Solucionadas'),
    ('Bitrix', 'Solucionadas'),
}


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value).strip()[:10], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def default_period_dates(today=None):
    """Mes actual por defecto."""
    today = today or date.today()
    start = today.replace(day=1)
    end = today.replace(day=monthrange(today.year, today.month)[1])
    return start, end


def parse_ficha_filters(args):
    """Lee filtros GET de la ficha (periodo + estado destino)."""
    date_from = _parse_date(args.get('date_from'))
    date_to = _parse_date(args.get('date_to'))
    if not date_from or not date_to:
        date_from, date_to = default_period_dates()
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    estado_destino = (args.get('estado_destino') or '').strip()
    if estado_destino not in STATUS_DELAY_TARGET_STATUSES:
        estado_destino = ''

    try:
        umbral = int(args.get('umbral') or STATUS_DELAY_THRESHOLD_DEFAULT)
    except (TypeError, ValueError):
        umbral = STATUS_DELAY_THRESHOLD_DEFAULT
    umbral = max(1, min(umbral, 1440))

    return {
        'date_from': date_from,
        'date_to': date_to,
        'estado_destino': estado_destino,
        'umbral': umbral,
    }


def _period_bounds(date_from, date_to):
    start_dt = datetime.combine(date_from, time.min)
    end_dt = datetime.combine(date_to, time.max)
    return start_dt, end_dt


def _transition_key(estado_anterior, estado_nuevo):
    return (estado_anterior or None, estado_nuevo)


def _start_timestamp(incident, row, previous_row):
    """V1: creación → destino; Bitrix→Solucionadas: desde entrada en Bitrix."""
    if row.estado_anterior == 'Bitrix' and row.estado_nuevo == 'Solucionadas':
        if previous_row and previous_row.cambiado_en:
            return previous_row.cambiado_en
    return incident.date_heure


def _truncate(text, max_len=200):
    if not text:
        return ''
    text = str(text).strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + '…'


def _format_retraso(minutes):
    minutes = int(minutes)
    if minutes < 60:
        return f'{minutes} min'
    hours, mins = divmod(minutes, 60)
    if mins == 0:
        return f'{hours} h'
    return f'{hours} h {mins} min'


def build_status_delay_rows(operateur_id, filters=None):
    """
    Lista de retrasos (> umbral) cuyo autor es operateur_id.
    Retorna (rows, kpis).
    """
    from core.app import Incident, IncidentComentario, IncidentEstadoHistorial

    filters = filters or {}
    date_from = filters.get('date_from')
    date_to = filters.get('date_to')
    if not date_from or not date_to:
        date_from, date_to = default_period_dates()
    estado_destino = filters.get('estado_destino') or ''
    umbral = int(filters.get('umbral') or STATUS_DELAY_THRESHOLD_DEFAULT)
    start_dt, end_dt = _period_bounds(date_from, date_to)

    query = (
        IncidentEstadoHistorial.query
        .filter(
            IncidentEstadoHistorial.id_operateur == operateur_id,
            IncidentEstadoHistorial.estado_nuevo.in_(STATUS_DELAY_TARGET_STATUSES),
            IncidentEstadoHistorial.cambiado_en >= start_dt,
            IncidentEstadoHistorial.cambiado_en <= end_dt,
        )
        .options(
            joinedload(IncidentEstadoHistorial.incident).joinedload(Incident.client),
        )
        .order_by(IncidentEstadoHistorial.cambiado_en.desc())
    )
    if estado_destino:
        query = query.filter(IncidentEstadoHistorial.estado_nuevo == estado_destino)

    historial_rows = query.all()
    if not historial_rows:
        return [], _empty_kpis()

    incident_ids = {r.id_incident for r in historial_rows}
    all_hist = (
        IncidentEstadoHistorial.query
        .filter(IncidentEstadoHistorial.id_incident.in_(incident_ids))
        .order_by(
            IncidentEstadoHistorial.id_incident.asc(),
            IncidentEstadoHistorial.cambiado_en.asc(),
            IncidentEstadoHistorial.id.asc(),
        )
        .all()
    )
    prev_by_id = {}
    last_by_incident = {}
    for h in all_hist:
        prev_by_id[h.id] = last_by_incident.get(h.id_incident)
        last_by_incident[h.id_incident] = h

    comments_by_incident = {}
    if incident_ids:
        for c in (
            IncidentComentario.query
            .filter(IncidentComentario.id_incident.in_(incident_ids))
            .order_by(IncidentComentario.creado_en.asc())
            .all()
        ):
            comments_by_incident.setdefault(c.id_incident, []).append(c)

    rows = []
    for row in historial_rows:
        key = _transition_key(row.estado_anterior, row.estado_nuevo)
        if key not in STATUS_DELAY_ALLOWED_TRANSITIONS:
            continue
        incident = row.incident
        if not incident:
            continue
        start_ts = _start_timestamp(incident, row, prev_by_id.get(row.id))
        if not start_ts or not row.cambiado_en:
            continue
        delta = row.cambiado_en - start_ts
        delay_minutes = int(delta.total_seconds() // 60)
        if delay_minutes <= umbral:
            continue

        comments = comments_by_incident.get(incident.id, [])
        comments_before = [c for c in comments if c.creado_en and c.creado_en <= row.cambiado_en]
        last_comment = comments_before[-1].contenido if comments_before else ''
        client = incident.client
        tiempo_pendiente = None
        if start_ts and incident.date_heure:
            tiempo_pendiente = int((row.cambiado_en - incident.date_heure).total_seconds() // 60)

        rows.append({
            'historial_id': row.id,
            'incident_id': incident.id,
            'cliente': client.nom if client else '—',
            'cliente_ville': client.ville if client else '',
            'categoria_cliente': getattr(client, 'categoria', None) if client else None,
            'asunto': incident.intitule or '',
            'estado_inicial': row.estado_anterior or 'Pendiente',
            'estado_destino': row.estado_nuevo,
            'fecha_creacion': incident.date_heure,
            'fecha_cambio': row.cambiado_en,
            'retraso_min': delay_minutes,
            'retraso_label': _format_retraso(delay_minutes),
            'ref_bitrix': row.ref_bitrix or incident.ref_bitrix or '',
            'comentarios_count': len(comments_before),
            'ultimo_comentario': _truncate(last_comment),
            'observaciones': _truncate(incident.observations or ''),
            'tiempo_pendiente_min': tiempo_pendiente,
            'ciudad': client.ville if client else '',
        })

    return rows, build_kpis(rows)


def _empty_kpis():
    return {
        'total': 0,
        'retraso_medio': 0,
        'retraso_max': 0,
        'pct_bitrix': 0,
        'pct_solucionadas': 0,
    }


def build_kpis(rows):
    if not rows:
        return _empty_kpis()
    total = len(rows)
    delays = [r['retraso_min'] for r in rows]
    n_bitrix = sum(1 for r in rows if r['estado_destino'] == 'Bitrix')
    n_sol = sum(1 for r in rows if r['estado_destino'] == 'Solucionadas')
    return {
        'total': total,
        'retraso_medio': int(round(sum(delays) / total)),
        'retraso_max': max(delays),
        'pct_bitrix': int(round(100 * n_bitrix / total)),
        'pct_solucionadas': int(round(100 * n_sol / total)),
    }


def paginate_rows(rows, page=1, per_page=50):
    page = max(1, int(page or 1))
    per_page = max(1, min(int(per_page or 50), 200))
    total = len(rows)
    start = (page - 1) * per_page
    end = start + per_page
    pages = max(1, (total + per_page - 1) // per_page)
    return {
        'items': rows[start:end],
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': pages,
        'has_prev': page > 1,
        'has_next': page < pages,
        'prev_num': page - 1 if page > 1 else None,
        'next_num': page + 1 if page < pages else None,
    }
