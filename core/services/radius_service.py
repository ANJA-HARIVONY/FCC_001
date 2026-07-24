"""Integracion RADIUS Manager (consulta lectura + cache 5 min)."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

DEFAULT_CACHE_TTL = 300
DEFAULT_TIMEOUT = 8
DEFAULT_CODE_MIN_DIGITS = 4


def radius_enabled() -> bool:
    flag = os.environ.get('RADIUS_ENABLED', '').strip().lower()
    if flag in ('0', 'false', 'no', 'off'):
        return False
    if flag in ('1', 'true', 'yes', 'on'):
        return True
    return bool(os.environ.get('RADIUS_API_USER', '').strip()) and bool(
        os.environ.get('RADIUS_API_PASS', '').strip()
    )


def get_cache_ttl() -> int:
    raw = os.environ.get('RADIUS_CACHE_TTL_SECONDS', '').strip()
    if not raw:
        return DEFAULT_CACHE_TTL
    try:
        return max(30, int(raw))
    except ValueError:
        return DEFAULT_CACHE_TTL


def get_timeout() -> int:
    raw = os.environ.get('RADIUS_TIMEOUT_SECONDS', '').strip()
    if not raw:
        return DEFAULT_TIMEOUT
    try:
        return max(2, int(raw))
    except ValueError:
        return DEFAULT_TIMEOUT


def get_code_min_digits() -> int:
    raw = os.environ.get('RADIUS_CODE_MIN_DIGITS', '').strip()
    if not raw:
        return DEFAULT_CODE_MIN_DIGITS
    try:
        return max(3, int(raw))
    except ValueError:
        return DEFAULT_CODE_MIN_DIGITS


def extract_code_prefix(client_nom: str) -> str:
    """Extrae el código numérico inicial si existe, si no ''."""
    nom = (client_nom or '').strip()
    if not nom:
        return ''
    min_digits = get_code_min_digits()
    match = re.match(rf'^(\d{{{min_digits},}})\b', nom)
    return match.group(1) if match else ''


def extract_search_criterion(client_nom: str) -> dict[str, str]:
    """
    Criterio principal = nombre completo del cliente (para firstname).
    Conserva también el código de prefijo si existe (reintento).
    """
    nom = (client_nom or '').strip()
    if not nom:
        return {'mode': '', 'criterio': '', 'label': '', 'code': ''}

    code = extract_code_prefix(nom)
    return {
        'mode': 'nombre_completo',
        'criterio': nom,
        'label': 'Nombre completo',
        'code': code,
    }


def _firstname_matches(firstname: str, criterio: str) -> bool:
    hay = (firstname or '').casefold()
    needle = (criterio or '').casefold()
    if not needle:
        return False
    return needle in hay


def _normalize_spaces(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '').strip())


def _firstname_matches_normalized(firstname: str, criterio: str) -> bool:
    """Contenencia insensible a mayúsculas, con espacios normalizados."""
    hay = _normalize_spaces(firstname).casefold()
    needle = _normalize_spaces(criterio).casefold()
    if not needle:
        return False
    return needle in hay


def _parse_sessions(raw: Any) -> list[dict[str, str]]:
    sessions: list[dict[str, str]] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                sessions.append({
                    'nasipaddress': str(item.get('nasipaddress') or item.get('nas') or ''),
                    'cpeipaddress': str(item.get('cpeipaddress') or item.get('framedipaddress') or ''),
                    'ap': str(item.get('ap') or ''),
                })
        return [s for s in sessions if s['nasipaddress'] or s['cpeipaddress']]

    if isinstance(raw, dict):
        # Algunos SysAPI devuelven sesiones como claves numéricas en el mismo objeto
        for key, value in raw.items():
            if not str(key).isdigit():
                continue
            if isinstance(value, dict) and (
                'nasipaddress' in value or 'cpeipaddress' in value or 'framedipaddress' in value
            ):
                sessions.append({
                    'nasipaddress': str(value.get('nasipaddress') or ''),
                    'cpeipaddress': str(value.get('cpeipaddress') or value.get('framedipaddress') or ''),
                    'ap': str(value.get('ap') or ''),
                })
        if 'sessions' in raw:
            sessions.extend(_parse_sessions(raw.get('sessions')))
    return [s for s in sessions if s['nasipaddress'] or s['cpeipaddress']]


def _parse_expiry_datetime(expiry_raw: Any) -> Optional[datetime]:
    """Parsea expiry RADIUS (YYYY-MM-DD, YYYY-MM-DD HH:MM:SS o DD/MM/YYYY)."""
    text = str(expiry_raw or '').strip()
    if not text or text in ('0', '0000-00-00', '0000-00-00 00:00:00'):
        return None
    for fmt, n in (
        ('%Y-%m-%d %H:%M:%S', 19),
        ('%Y-%m-%d %H:%M', 16),
        ('%Y-%m-%d', 10),
        ('%d/%m/%Y', 10),
    ):
        try:
            return datetime.strptime(text[:n], fmt)
        except ValueError:
            continue
    return None


def _days_remaining(expiry_raw: Any) -> Optional[int]:
    """Días restantes hasta expiry respecto a hoy (puede ser negativo si ya expiró)."""
    expiry_dt = _parse_expiry_datetime(expiry_raw)
    if expiry_dt is None:
        return None
    return (expiry_dt.date() - datetime.now().date()).days


def _refresh_days_remaining(payload: dict[str, Any]) -> dict[str, Any]:
    """Recalcula days_remaining en data (siempre respecto a hoy)."""
    data = payload.get('data')
    if isinstance(data, dict) and data.get('expiry'):
        data = dict(data)
        data['days_remaining'] = _days_remaining(data.get('expiry'))
        payload = dict(payload)
        payload['data'] = data
    return payload


def _compute_account_status(enableuser: int, expiry_raw: Any) -> dict[str, str]:
    """
    Account status:
    - expired si expiry < hoy
    - enabled si enableuser=1
    - disabled en caso contrario
    """
    expiry_dt = _parse_expiry_datetime(expiry_raw)
    if expiry_dt is not None:
        # Comparar por fecha (ignorar hora) respecto a hoy local
        today = datetime.now().date()
        if expiry_dt.date() < today:
            return {
                'account_status': 'expired',
                'account_status_label': 'Expired',
            }
    if enableuser == 1:
        return {
            'account_status': 'enabled',
            'account_status_label': 'Enabled / Activo',
        }
    return {
        'account_status': 'disabled',
        'account_status_label': 'Disabled / Inactivo',
    }


def _normalize_userdata(payload: dict, username: str) -> dict[str, Any]:
    sessions = _parse_sessions(payload)
    cpe = (
        str(payload.get('cpeipaddress') or '').strip()
        or str(payload.get('staticipcpe') or '').strip()
        or (sessions[0]['cpeipaddress'] if sessions else '')
    )
    nas = (
        str(payload.get('nasipaddress') or '').strip()
        or (sessions[0]['nasipaddress'] if sessions else '')
    )
    enable_raw = payload.get('enableuser', payload.get('enabled', '0'))
    try:
        enableuser = int(enable_raw)
    except (TypeError, ValueError):
        enableuser = 1 if str(enable_raw).strip() in ('1', 'true', 'True') else 0

    expiry_raw = str(payload.get('expiry') or '')
    status = _compute_account_status(enableuser, expiry_raw)
    expiry_dt = _parse_expiry_datetime(expiry_raw)
    expiry = expiry_dt.strftime('%d/%m/%Y') if expiry_dt else ''

    return {
        'username': username,
        'firstname': str(payload.get('firstname') or ''),
        'enableuser': enableuser,
        'expiry': expiry,
        'days_remaining': _days_remaining(expiry_raw),
        'account_status': status['account_status'],
        'account_status_label': status['account_status_label'],
        'staticipcpe': str(payload.get('staticipcpe') or ''),
        'cpeipaddress': cpe,
        'nasipaddress': nas,
        'credits': str(payload.get('credits') or ''),
        'contractvalid': str(payload.get('contractvalid') or ''),
        'mac': str(payload.get('mac') or ''),
        'srvid': str(payload.get('srvid') or ''),
        'srvname': '',
        'service_plan': '',
        'sessions': sessions,
        'online': bool(sessions),
        'connection_status': 'online' if sessions else 'offline',
        'connection_status_label': 'Online / En línea' if sessions else 'Offline / Desconectado',
    }


GET_USERDATA_FIELDS = (
    'code', 'enableuser', 'srvid', 'usemacauth', 'mac', 'maccm', 'groupid', 'custattr',
    'owner', 'staticipcm', 'staticipcpe', 'ipmodecm', 'ipmodecpe', 'poolidcm', 'poolidcpe',
    'credits', 'contractid', 'contractvalid', 'cnic', 'firstname', 'lastname', 'company',
    'address', 'city', 'zip', 'country', 'state', 'phone', 'mobile', 'email', 'comment',
    'taxid', 'gpslong', 'gpslat', 'lang', 'alertemail', 'alertsms', 'warningsent',
    'verified', 'verifyfails', 'verifysentnum', 'pswactsmsnum', 'simuse', 'dlbytes',
    'ulbytes', 'totalbytes', 'onlinetime', 'expiry',
)


def _extract_json_blob(text: str) -> str:
    """Recorta BOM / avisos PHP y localiza el primer JSON {..} o [...]."""
    raw = (text or '').lstrip('\ufeff').strip()
    if not raw:
        return ''
    # Si hay ruido antes del JSON (warnings PHP), tomar desde el primer { o [
    for i, ch in enumerate(raw):
        if ch in '{[':
            return raw[i:]
    return raw


def _list_to_userdata_dict(items: list) -> dict[str, Any]:
    """Convierte respuesta SysAPI tipo array posicional a dict con nombres de campo."""
    data: dict[str, Any] = {}
    limit = min(len(items), len(GET_USERDATA_FIELDS))
    for idx in range(limit):
        data[GET_USERDATA_FIELDS[idx]] = items[idx]
    # El resto suelen ser sesiones online: dicts o listas [nas, cpe, ap]
    sessions = []
    for extra in items[len(GET_USERDATA_FIELDS):]:
        if isinstance(extra, dict):
            sessions.append(extra)
        elif isinstance(extra, (list, tuple)) and len(extra) >= 2:
            sessions.append({
                'nasipaddress': str(extra[0] or ''),
                'cpeipaddress': str(extra[1] or ''),
                'ap': str(extra[2] or '') if len(extra) > 2 else '',
            })
    if sessions:
        data['sessions'] = sessions
    return data


def _coerce_sysapi_payload(data: Any) -> Optional[dict[str, Any]]:
    """
    Normaliza la respuesta SysAPI a dict plano con 'code' + campos de usuario.

    Formatos observados:
    - Error: [1, "User not found!"]
    - Éxito DMA Softlab: {"0": 0, "1": {enableuser, firstname, ...}, "expiry": "...", ...}
    - Objeto plano: {"code": 0, "firstname": "..."}
    - Array posicional
    """
    if isinstance(data, dict):
        # Formato anidado DMA: claves "0" (code) y "1" (datos usuario)
        if '0' in data and '1' in data and isinstance(data.get('1'), dict):
            nested = dict(data['1'])
            merged: dict[str, Any] = {**nested, 'code': data['0']}
            for key in (
                'simuse', 'dlbytes', 'ulbytes', 'totalbytes', 'onlinetime', 'expiry',
            ):
                if key in data and key not in merged:
                    merged[key] = data[key]
            # Sesiones: otras claves numéricas cuyo valor es dict con nas/cpe
            sessions = []
            for key, value in data.items():
                if key in ('0', '1'):
                    continue
                if str(key).isdigit() and isinstance(value, dict):
                    if 'nasipaddress' in value or 'cpeipaddress' in value:
                        sessions.append(value)
            if sessions:
                merged['sessions'] = sessions
            return merged

        # Objeto ya plano
        if 'code' in data or 'firstname' in data or 'enableuser' in data:
            return data
        return data

    if isinstance(data, list):
        if not data:
            return None
        # [{"code":0, ...}]
        if len(data) == 1 and isinstance(data[0], dict):
            return _coerce_sysapi_payload(data[0])
        # Error corto: [code, str]
        if len(data) == 2 and not isinstance(data[0], dict):
            return {'code': data[0], 'str': data[1]}
        # Array posicional get_userdata
        if not isinstance(data[0], dict):
            return _list_to_userdata_dict(data)
        for item in data:
            if isinstance(item, dict) and ('code' in item or '0' in item):
                return _coerce_sysapi_payload(item)
        if isinstance(data[0], dict):
            return _coerce_sysapi_payload(data[0])

    return None


def get_userdata(username: str) -> dict[str, Any]:
    """Llama SysAPI get_userdata. Devuelve {ok, data|error}."""
    base = os.environ.get('RADIUS_BASE_URL', 'http://10.26.0.4/radiusmanager/api').rstrip('/')
    apiuser = os.environ.get('RADIUS_API_USER', '').strip()
    apipass = os.environ.get('RADIUS_API_PASS', '').strip()
    if not apiuser or not apipass:
        return {'ok': False, 'error': 'RADIUS no configurado (RADIUS_API_USER / RADIUS_API_PASS).'}

    params = urlencode({
        'apiuser': apiuser,
        'apipass': apipass,
        'q': 'get_userdata',
        'username': username,
    })
    url = f'{base}/sysapi.php?{params}'
    try:
        req = Request(url, method='GET', headers={'Accept': 'application/json, text/plain, */*'})
        with urlopen(req, timeout=get_timeout()) as resp:
            body = resp.read().decode('utf-8', errors='replace')
        blob = _extract_json_blob(body)
        if not blob:
            logger.warning('RADIUS respuesta vacía (username=%s)', username)
            return {'ok': False, 'error': 'Respuesta RADIUS inválida.'}
        parsed = json.loads(blob)
    except HTTPError as exc:
        logger.warning('RADIUS HTTP error: %s', exc)
        return {'ok': False, 'error': 'RADIUS no disponible temporalmente.'}
    except (URLError, TimeoutError, OSError) as exc:
        logger.warning('RADIUS network error: %s', exc)
        return {'ok': False, 'error': 'RADIUS no disponible temporalmente.'}
    except json.JSONDecodeError:
        logger.warning(
            'RADIUS respuesta no JSON (username=%s, head=%r)',
            username,
            (body[:180] if 'body' in locals() else ''),
        )
        return {'ok': False, 'error': 'Respuesta RADIUS inválida.'}

    data = _coerce_sysapi_payload(parsed)
    if not data:
        logger.warning(
            'RADIUS payload no reconocible (username=%s, type=%s)',
            username,
            type(parsed).__name__,
        )
        return {'ok': False, 'error': 'Respuesta RADIUS inválida.'}

    code = data.get('code')
    try:
        code_int = int(code)
    except (TypeError, ValueError):
        code_int = 1

    if code_int != 0:
        return {
            'ok': False,
            'error': str(data.get('str') or 'No se encontró cuenta en RADIUS'),
            'not_found': True,
        }

    return {'ok': True, 'data': _normalize_userdata(data, username)}


_SRVNAME_CACHE: dict[str, str] = {}


def get_srv(srvid: str) -> dict[str, Any]:
    """SysAPI get_srv — detalle del service plan (srvname)."""
    srvid = str(srvid or '').strip()
    if not srvid:
        return {'ok': False, 'error': 'srvid vacío', 'not_found': True}
    if srvid in _SRVNAME_CACHE:
        return {
            'ok': True,
            'data': {'code': 0, 'srvid': srvid, 'srvname': _SRVNAME_CACHE[srvid]},
        }

    base = os.environ.get('RADIUS_BASE_URL', 'http://10.26.0.4/radiusmanager/api').rstrip('/')
    apiuser = os.environ.get('RADIUS_API_USER', '').strip()
    apipass = os.environ.get('RADIUS_API_PASS', '').strip()
    if not apiuser or not apipass:
        return {'ok': False, 'error': 'RADIUS no configurado (RADIUS_API_USER / RADIUS_API_PASS).'}

    params = urlencode({
        'apiuser': apiuser,
        'apipass': apipass,
        'q': 'get_srv',
        'srvid': srvid,
    })
    url = f'{base}/sysapi.php?{params}'
    try:
        req = Request(url, method='GET', headers={'Accept': 'application/json, text/plain, */*'})
        with urlopen(req, timeout=get_timeout()) as resp:
            body = resp.read().decode('utf-8', errors='replace')
        blob = _extract_json_blob(body)
        if not blob:
            return {'ok': False, 'error': 'Respuesta RADIUS inválida.'}
        parsed = json.loads(blob)
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        logger.warning('RADIUS get_srv error (srvid=%s): %s', srvid, exc)
        return {'ok': False, 'error': 'RADIUS no disponible temporalmente.'}

    srvname = ''
    # Formato observado: [0, [{"srvid":"40","srvname":"Prepago 2Mbps", ...}]]
    if isinstance(parsed, list) and len(parsed) >= 2:
        try:
            code_ok = int(parsed[0]) == 0
        except (TypeError, ValueError):
            code_ok = False
        if code_ok:
            plans = parsed[1]
            if isinstance(plans, list):
                for plan in plans:
                    if isinstance(plan, dict) and str(plan.get('srvid') or '') == srvid:
                        srvname = str(plan.get('srvname') or plan.get('descr') or '').strip()
                        break
                if not srvname and plans and isinstance(plans[0], dict):
                    srvname = str(plans[0].get('srvname') or plans[0].get('descr') or '').strip()
            elif isinstance(plans, dict):
                srvname = str(plans.get('srvname') or plans.get('descr') or '').strip()

    if not srvname:
        data = _coerce_sysapi_payload(parsed)
        if isinstance(data, dict):
            srvname = str(data.get('srvname') or data.get('descr') or '').strip()

    if srvname:
        _SRVNAME_CACHE[srvid] = srvname
        return {'ok': True, 'data': {'code': 0, 'srvid': srvid, 'srvname': srvname}}

    return {'ok': False, 'error': 'Service plan no encontrado', 'not_found': True}


def enrich_with_service_plan(userdata: dict[str, Any]) -> dict[str, Any]:
    """Añade srvname / service_plan usando get_srv(srvid)."""
    out = dict(userdata)
    srvid = str(out.get('srvid') or '').strip()
    out.setdefault('srvname', '')
    if not srvid:
        out['service_plan'] = '—'
        return out

    srv = get_srv(srvid)
    if srv.get('ok'):
        srvname = str((srv.get('data') or {}).get('srvname') or '').strip()
        out['srvname'] = srvname
        out['service_plan'] = f'{srvname} (ID {srvid})' if srvname else f'ID {srvid}'
    else:
        out['service_plan'] = f'ID {srvid}'
    return out


def _radius_db_configured() -> bool:
    return bool(os.environ.get('RADIUS_DB_HOST', '').strip()) and bool(
        os.environ.get('RADIUS_DB_USER', '').strip()
    )


def search_usernames_by_firstname(criterio: str) -> dict[str, Any]:
    """
    Busca usernames en DB RADIUS (rm_users) donde firstname contiene criterio.
    Opcional: requiere RADIUS_DB_*.
    """
    if not _radius_db_configured():
        return {'ok': False, 'error': 'db_not_configured', 'usernames': []}

    host = os.environ.get('RADIUS_DB_HOST', '').strip()
    port = int(os.environ.get('RADIUS_DB_PORT', '3306') or 3306)
    name = os.environ.get('RADIUS_DB_NAME', 'radius').strip() or 'radius'
    user = os.environ.get('RADIUS_DB_USER', '').strip()
    password = os.environ.get('RADIUS_DB_PASSWORD', '')
    table = os.environ.get('RADIUS_DB_TABLE', 'rm_users').strip() or 'rm_users'
    # Solo caracteres seguros para nombre de tabla
    if not re.match(r'^[A-Za-z0-9_]+$', table):
        return {'ok': False, 'error': 'Tabla RADIUS_DB_TABLE inválida.', 'usernames': []}

    try:
        import pymysql
    except ImportError:
        return {'ok': False, 'error': 'pymysql no disponible.', 'usernames': []}

    like = f'%{criterio}%'
    sql = (
        f'SELECT username, firstname FROM `{table}` '
        f'WHERE firstname LIKE %s COLLATE utf8_general_ci '
        f'LIMIT 20'
    )
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=name,
            connect_timeout=get_timeout(),
            read_timeout=get_timeout(),
            charset='utf8mb4',
        )
        try:
            with conn.cursor() as cur:
                try:
                    cur.execute(sql, (like,))
                except Exception:
                    # Fallback sin COLLATE si el charset no lo soporta
                    cur.execute(
                        f'SELECT username, firstname FROM `{table}` WHERE LOWER(firstname) LIKE LOWER(%s) LIMIT 20',
                        (like,),
                    )
                rows = cur.fetchall()
        finally:
            conn.close()
    except Exception as exc:
        logger.warning('RADIUS DB search error: %s', exc)
        return {'ok': False, 'error': 'No se pudo consultar la base RADIUS.', 'usernames': []}

    matches = []
    for row in rows:
        username = str(row[0] or '').strip()
        firstname = str(row[1] or '').strip()
        if username and _firstname_matches_normalized(firstname, criterio):
            matches.append({'username': username, 'firstname': firstname})
    return {'ok': True, 'usernames': matches}


def _search_candidates(criterio: str) -> dict[str, Any]:
    """Busca en firstname (DB RADIUS)."""
    return search_usernames_by_firstname(criterio)


def _ok_result(data: dict, label: str, mode: str) -> dict[str, Any]:
    return {
        'status': 'ok',
        'message': '',
        'criterio_label': label,
        'mode': mode,
        'data': data,
        'from_cache': False,
        'fetched_at': datetime.now().isoformat(timespec='seconds'),
    }


def _resolve_via_sysapi(nom_completo: str, code: str) -> dict[str, Any]:
    """
    Sin RADIUS_DB: obtiene cuentas vía SysAPI y acepta SOLO si
    firstname contiene el nombre completo del cliente
    (ej. firstname contiene "014000 YOSYP").

    Intentos de username SysAPI (solo para localizar la cuenta):
    1) nombre completo
    2) código (si existe)
    """
    tried: list[str] = []
    usernames_to_try: list[str] = []
    # Primero el nombre completo por si el username RADIUS = nombre
    usernames_to_try.append(nom_completo)
    if code and code not in usernames_to_try:
        usernames_to_try.append(code)
    # Variante sin espacios dobles ya normalizada en nom_completo

    last_error = None
    saw_not_found = False

    for uname in usernames_to_try:
        if uname in tried:
            continue
        tried.append(uname)
        api = get_userdata(uname)
        if not api.get('ok'):
            if api.get('not_found'):
                saw_not_found = True
                continue
            last_error = api.get('error') or 'RADIUS no disponible temporalmente.'
            # Error de red/config: no seguir si es indisponibilidad
            if 'inválida' in (last_error or '').lower() or 'disponible' in (last_error or '').lower():
                # Seguir probando otros username; solo cortar en config
                if 'no configurado' in (last_error or '').lower():
                    return {
                        'status': 'error',
                        'message': last_error,
                        'criterio_label': 'Nombre completo',
                        'mode': 'nombre_completo',
                        'from_cache': False,
                    }
            continue

        data = api['data']
        firstname = data.get('firstname') or ''
        # Criterio obligatorio: firstname contiene el NOMBRE COMPLETO
        if _firstname_matches_normalized(firstname, nom_completo):
            return _ok_result(data, f'Nombre completo ({nom_completo})', 'nombre_completo')

        # Cuenta hallada pero firstname no tiene el nombre completo → seguir
        logger.info(
            'RADIUS username=%s firstname=%r no contiene nombre completo %r',
            uname,
            firstname,
            nom_completo,
        )

    if last_error and not saw_not_found:
        return {
            'status': 'error',
            'message': last_error,
            'criterio_label': f'Nombre completo ({nom_completo})',
            'mode': 'nombre_completo',
            'from_cache': False,
        }

    return {
        'status': 'not_found',
        'message': (
            f'No se encontró en RADIUS una cuenta cuyo firstname contenga '
            f'«{nom_completo}». '
            f'SysAPI solo busca por username (login), no por firstname. '
            f'Configure RADIUS_DB_* en .env para buscar por firstname, '
            f'o verifique el username RADIUS del cliente.'
        ),
        'criterio_label': f'Nombre completo ({nom_completo})',
        'mode': 'nombre_completo',
        'from_cache': False,
    }


def _resolve_via_db(nom_completo: str, code: str) -> dict[str, Any]:
    """Búsqueda firstname vía DB: nombre completo, luego código si hace falta."""
    label = f'Nombre completo ({nom_completo})'
    mode = 'nombre_completo'
    db_result = _search_candidates(nom_completo)
    if not db_result.get('ok'):
        return {
            'status': 'error',
            'message': db_result.get('error') or 'RADIUS no disponible temporalmente.',
            'criterio_label': label,
            'mode': mode,
            'from_cache': False,
        }

    candidates = list(db_result.get('usernames') or [])

    if not candidates and code:
        label = f'Código {code} (reintento)'
        mode = 'codigo'
        db_code = _search_candidates(code)
        if not db_code.get('ok'):
            return {
                'status': 'error',
                'message': db_code.get('error') or 'RADIUS no disponible temporalmente.',
                'criterio_label': label,
                'mode': mode,
                'from_cache': False,
            }
        candidates = list(db_code.get('usernames') or [])

    if not candidates:
        return {
            'status': 'not_found',
            'message': (
                f'No se encontró en RADIUS una cuenta cuyo firstname contenga '
                f'«{nom_completo}».'
            ),
            'criterio_label': f'Nombre completo ({nom_completo})',
            'mode': 'nombre_completo',
            'from_cache': False,
        }

    if len(candidates) > 1:
        # Preferir el que mejor matchee el nombre completo
        exact = [
            c for c in candidates
            if _firstname_matches_normalized(c.get('firstname', ''), nom_completo)
        ]
        if len(exact) == 1:
            candidates = exact
        elif len(exact) > 1:
            candidates = exact
        else:
            return {
                'status': 'ambiguous',
                'message': 'Varias cuentas coinciden — revise el criterio',
                'criterio_label': label,
                'mode': mode,
                'candidates': candidates,
                'from_cache': False,
            }

    if len(candidates) > 1:
        return {
            'status': 'ambiguous',
            'message': 'Varias cuentas coinciden — revise el criterio',
            'criterio_label': label,
            'mode': mode,
            'candidates': candidates,
            'from_cache': False,
        }

    username = candidates[0]['username']
    api = get_userdata(username)
    if not api.get('ok'):
        return {
            'status': 'error' if not api.get('not_found') else 'not_found',
            'message': api.get('error') or 'No se encontró cuenta en RADIUS',
            'criterio_label': label,
            'mode': mode,
            'from_cache': False,
        }

    data = api['data']
    # Siempre validar nombre completo en firstname cuando el modo es nombre_completo
    if mode == 'nombre_completo':
        if not _firstname_matches_normalized(data.get('firstname', ''), nom_completo):
            return {
                'status': 'not_found',
                'message': (
                    f'No se encontró en RADIUS una cuenta cuyo firstname contenga '
                    f'«{nom_completo}».'
                ),
                'criterio_label': label,
                'mode': mode,
                'from_cache': False,
            }
    elif code and not _firstname_matches_normalized(data.get('firstname', ''), code):
        return {
            'status': 'not_found',
            'message': 'No se encontró cuenta en RADIUS',
            'criterio_label': label,
            'mode': mode,
            'from_cache': False,
        }

    return _ok_result(data, label, mode)


def resolve_radius_for_client(client) -> dict[str, Any]:
    """
    Resolución oficial V1: Client.username_radius → SysAPI get_userdata(username).
    """
    if not radius_enabled():
        return {
            'status': 'disabled',
            'message': 'Integración RADIUS desactivada.',
            'from_cache': False,
        }

    username = (getattr(client, 'username_radius', None) or '').strip()
    if not username:
        return {
            'status': 'empty_name',
            'message': (
                'Sin Username RADIUS. Edite el cliente y complete el campo '
                '«Username RADIUS» (login SysAPI).'
            ),
            'criterio_label': '',
            'mode': 'username_radius',
            'from_cache': False,
        }

    api = get_userdata(username)
    if not api.get('ok'):
        return {
            'status': 'error' if not api.get('not_found') else 'not_found',
            'message': api.get('error') or 'No se encontró cuenta en RADIUS',
            'criterio_label': f'Username RADIUS ({username})',
            'mode': 'username_radius',
            'from_cache': False,
        }

    data = enrich_with_service_plan(api['data'])
    return _ok_result(
        data,
        f'Username RADIUS ({username})',
        'username_radius',
    )


def resolve_radius_accounts(client_nom: str) -> dict[str, Any]:
    """
    Fallback legacy (firstname / código). Preferir resolve_radius_for_client.
    """
    if not radius_enabled():
        return {
            'status': 'disabled',
            'message': 'Integración RADIUS desactivada.',
            'from_cache': False,
        }

    criterion = extract_search_criterion(client_nom)
    nom_completo = _normalize_spaces(criterion.get('criterio') or '')
    code = criterion.get('code') or ''
    if not nom_completo:
        return {
            'status': 'empty_name',
            'message': 'Sin nombre de cliente',
            'criterio_label': '',
            'mode': '',
            'from_cache': False,
        }

    if _radius_db_configured():
        return _resolve_via_db(nom_completo, code)

    return _resolve_via_sysapi(nom_completo, code)


def cache_is_fresh(client, force: bool = False) -> bool:
    if force:
        return False
    fetched_at = getattr(client, 'radius_cache_at', None)
    raw = getattr(client, 'radius_cache_json', None)
    if not fetched_at or not raw:
        return False
    age = (datetime.now() - fetched_at).total_seconds()
    return age < get_cache_ttl()


def read_cache(client) -> Optional[dict[str, Any]]:
    raw = getattr(client, 'radius_cache_json', None)
    fetched_at = getattr(client, 'radius_cache_at', None)
    if not raw or not fetched_at:
        return None
    try:
        payload = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    payload = dict(payload)
    payload['from_cache'] = True
    payload['fetched_at'] = fetched_at.isoformat(timespec='seconds')
    age_sec = max(0, int((datetime.now() - fetched_at).total_seconds()))
    payload['cache_age_seconds'] = age_sec
    payload['cache_age_minutes'] = max(0, age_sec // 60)
    return payload


def write_cache(client, payload: dict[str, Any]) -> None:
    to_store = {k: v for k, v in payload.items() if k not in ('from_cache', 'cache_age_seconds', 'cache_age_minutes')}
    client.radius_cache_json = json.dumps(to_store, ensure_ascii=False)
    client.radius_cache_at = datetime.now()


def get_client_radius_info(client, force: bool = False) -> dict[str, Any]:
    """Punto de entrada: cache 5 min o resolución vía username_radius."""
    if not radius_enabled():
        return {
            'status': 'disabled',
            'message': 'Integración RADIUS desactivada.',
            'from_cache': False,
        }

    if cache_is_fresh(client, force=force):
        cached = read_cache(client)
        if cached:
            return _refresh_days_remaining(cached)

    result = resolve_radius_for_client(client)
    write_cache(client, result)
    result['from_cache'] = False
    result['cache_age_seconds'] = 0
    result['cache_age_minutes'] = 0
    if not result.get('fetched_at'):
        result['fetched_at'] = datetime.now().isoformat(timespec='seconds')
    return _refresh_days_remaining(result)
