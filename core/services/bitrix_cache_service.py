"""Cache du statut Bitrix24 sur le modèle Incident."""

from datetime import datetime, timedelta

BITRIX_TERMINAL_STATUS = '5'
DEFAULT_BITRIX_CACHE_TTL = 600

# Durée de vie du chip « Movida » après détection d'un mouvement côté Bitrix.
BITRIX_MOVED_BADGE_WINDOW_HOURS = 24


def parse_bitrix_datetime(value):
    """ISO 8601 Bitrix (avec offset) → datetime naïf en heure locale serveur."""
    raw = str(value or '').strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace('Z', '+00:00'))
    except ValueError:
        # Certains portails renvoient le format d'affichage au lieu de l'ISO.
        try:
            parsed = datetime.strptime(raw, '%d.%m.%Y %H:%M:%S')
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed
    return parsed.astimezone().replace(tzinfo=None)


def get_bitrix_cache_ttl():
    raw = __import__('os').environ.get('BITRIX_CACHE_TTL', '').strip()
    if not raw:
        return DEFAULT_BITRIX_CACHE_TTL
    try:
        return max(60, int(raw))
    except ValueError:
        return DEFAULT_BITRIX_CACHE_TTL


def incident_bitrix_info_from_cache(incident):
    if not incident.bitrix_fetched_at or not incident.bitrix_task_status:
        return None
    return {
        'task_status': incident.bitrix_task_status,
        'status_label': incident.bitrix_status_label or '',
        'status_emoji': incident.bitrix_status_emoji or '📋',
        'responsible_name': incident.bitrix_responsible or '',
        'title': '',
        'priority': incident.bitrix_priority or '',
        'deadline': incident.bitrix_deadline,
        'created_date': incident.bitrix_created_at,
        'closed_date': incident.bitrix_closed_at,
        'changed_date': incident.bitrix_changed_at,
        'from_cache': True,
    }


def clear_bitrix_cache(incident):
    incident.bitrix_task_status = None
    incident.bitrix_status_label = None
    incident.bitrix_status_emoji = None
    incident.bitrix_responsible = None
    incident.bitrix_fetched_at = None
    incident.bitrix_fetch_locked = False
    incident.bitrix_deadline = None
    incident.bitrix_created_at = None
    incident.bitrix_closed_at = None
    incident.bitrix_changed_at = None
    incident.bitrix_priority = None
    incident.bitrix_moved_at = None


def apply_bitrix_cache(incident, info):
    task_status = str(info.get('task_status', '') or '')
    previous_changed_at = incident.bitrix_changed_at
    changed_date = info.get('changed_date')

    incident.bitrix_task_status = task_status or None
    incident.bitrix_status_label = info.get('status_label')
    incident.bitrix_status_emoji = info.get('status_emoji')
    incident.bitrix_responsible = info.get('responsible_name')
    incident.bitrix_fetched_at = datetime.now()
    incident.bitrix_fetch_locked = task_status == BITRIX_TERMINAL_STATUS
    incident.bitrix_deadline = info.get('deadline')
    incident.bitrix_created_at = info.get('created_date')
    incident.bitrix_closed_at = info.get('closed_date')
    incident.bitrix_changed_at = changed_date
    incident.bitrix_priority = str(info.get('priority', '') or '') or None

    # Premier fetch (previous_changed_at vide) : pas de mouvement, sinon tout serait « Movida ».
    if changed_date and previous_changed_at and changed_date > previous_changed_at:
        incident.bitrix_moved_at = datetime.now()


def _bitrix_api_enabled():
    import os
    flag = os.environ.get('BITRIX24_ENABLED', '').strip().lower()
    if flag in ('0', 'false', 'no', 'off'):
        return False
    return bool(os.environ.get('BITRIX24_API', '').strip())


def should_fetch_bitrix_from_api(incident, force=False):
    if not _bitrix_api_enabled():
        return False
    if incident.status != 'Bitrix' or not incident.ref_bitrix or not str(incident.ref_bitrix).strip():
        return False
    if force:
        return True
    if incident.bitrix_fetch_locked:
        return False
    if not incident.bitrix_fetched_at or not incident.bitrix_task_status:
        return True
    age = (datetime.now() - incident.bitrix_fetched_at).total_seconds()
    return age > get_bitrix_cache_ttl()


def build_bitrix_list_context(incidents):
    result = {}
    for incident in incidents:
        if incident.status != 'Bitrix' or not incident.ref_bitrix:
            continue
        cached = incident_bitrix_info_from_cache(incident)
        result[incident.id] = {
            'info': cached,
            'auto_load': should_fetch_bitrix_from_api(incident),
        }
    return result


def _format_datetime(value):
    return value.strftime('%d/%m/%Y %H:%M') if value else ''


def build_bitrix_task_extras(incident):
    """Données dérivées de la tâche Bitrix pour la ficha (vencimiento, prioridad, movimiento)."""
    from core.app import BITRIX_OVERDUE_STATUSES, BITRIX_PRIORITY_LABELS
    from core.services.incident_status_delay_service import format_retraso

    task_status = incident.bitrix_task_status or ''
    if not task_status:
        return None

    priority = incident.bitrix_priority or ''
    priority_label, priority_emoji = BITRIX_PRIORITY_LABELS.get(priority, ('', ''))

    deadline = incident.bitrix_deadline
    show_plazo = task_status in BITRIX_OVERDUE_STATUSES
    is_overdue = False
    plazo_label = ''
    if show_plazo and deadline:
        delta_min = int((datetime.now() - deadline).total_seconds() // 60)
        is_overdue = delta_min > 0
        plazo_label = format_retraso(abs(delta_min))

    moved_at = incident.bitrix_moved_at
    moved_recently = bool(
        moved_at
        and (datetime.now() - moved_at) < timedelta(hours=BITRIX_MOVED_BADGE_WINDOW_HOURS)
    )

    return {
        'show_plazo': show_plazo,
        'deadline': deadline,
        'deadline_label': _format_datetime(deadline),
        'is_overdue': is_overdue,
        'plazo_label': plazo_label,
        'priority': priority,
        'priority_label': priority_label,
        'priority_emoji': priority_emoji,
        'is_closed': task_status == BITRIX_TERMINAL_STATUS,
        'closed_label': _format_datetime(incident.bitrix_closed_at),
        'created_label': _format_datetime(incident.bitrix_created_at),
        'changed_label': _format_datetime(incident.bitrix_changed_at),
        'moved_recently': moved_recently,
        'moved_label': _format_datetime(moved_at),
    }


def fetch_and_cache_bitrix_info(incident, fetch_fn, force=False):
    """Retourne les infos Bitrix (cache ou API). fetch_fn: callable(task_id) -> dict."""
    if incident.status != 'Bitrix' or not incident.ref_bitrix or not str(incident.ref_bitrix).strip():
        return None

    cached = incident_bitrix_info_from_cache(incident)
    if not should_fetch_bitrix_from_api(incident, force=force):
        return cached

    info = fetch_fn(str(incident.ref_bitrix).strip())
    if 'error' in info:
        return cached or info

    apply_bitrix_cache(incident, info)
    return incident_bitrix_info_from_cache(incident) or info
