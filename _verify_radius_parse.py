"""Verify nested DMA Softlab payload + live get_userdata(vatsy_r2i)."""
import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env')

from core.services.radius_service import _coerce_sysapi_payload, get_userdata

sample = {
    '0': 0,
    '1': {
        'enableuser': '0',
        'firstname': '008910 VATSY R2I',
        'staticipcpe': '102.164.254.95',
        'mac': '48:8f:5a:ad:c7:99',
    },
    'expiry': '2024-11-23 00:00:00',
}
d = _coerce_sysapi_payload(sample)
assert d is not None
assert int(d['code']) == 0
assert d['firstname'] == '008910 VATSY R2I'
assert d['expiry'] == '2024-11-23 00:00:00'
print('coerce_ok', d['firstname'])

err = _coerce_sysapi_payload([1, 'User not found!'])
assert int(err['code']) == 1
print('error_ok')

live = get_userdata('vatsy_r2i')
print('live_ok', live.get('ok'), 'firstname=', (live.get('data') or {}).get('firstname'))
print('live_full', json.dumps({k: live.get(k) for k in ('ok', 'error', 'not_found')}, ensure_ascii=False))
if live.get('ok'):
    data = live['data']
    print('expiry', data.get('expiry'), 'enableuser', data.get('enableuser'), 'cpe', data.get('cpeipaddress'))
