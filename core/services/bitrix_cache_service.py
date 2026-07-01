"""Cache du statut Bitrix24 sur le modèle Incident."""

from datetime import datetime

BITRIX_TERMINAL_STATUS = '5'
DEFAULT_BITRIX_CACHE_TTL = 600


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
        'from_cache': True,
    }


def clear_bitrix_cache(incident):
    incident.bitrix_task_status = None
    incident.bitrix_status_label = None
    incident.bitrix_status_emoji = None
    incident.bitrix_responsible = None
    incident.bitrix_fetched_at = None
    incident.bitrix_fetch_locked = False


def apply_bitrix_cache(incident, info):
    task_status = str(info.get('task_status', '') or '')
    incident.bitrix_task_status = task_status or None
    incident.bitrix_status_label = info.get('status_label')
    incident.bitrix_status_emoji = info.get('status_emoji')
    incident.bitrix_responsible = info.get('responsible_name')
    incident.bitrix_fetched_at = datetime.now()
    incident.bitrix_fetch_locked = task_status == BITRIX_TERMINAL_STATUS


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
