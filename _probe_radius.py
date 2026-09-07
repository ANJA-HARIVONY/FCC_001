"""Probe RADIUS SysAPI (credentials from .env). Writes sanitized output to _radius_check.txt."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / '.env')
out = ROOT / '_radius_check.txt'

base = (os.environ.get('RADIUS_BASE_URL') or '').rstrip('/')
user = (os.environ.get('RADIUS_API_USER') or '').strip()
pw = (os.environ.get('RADIUS_API_PASS') or '').strip()

lines = [
    f'BASE={base}',
    f'APIUSER_SET={bool(user)}',
    f'PASS_SET={bool(pw)}',
]


def sanitize_url(url: str) -> str:
    return re.sub(r'apipass=[^&]+', 'apipass=***', url)


def probe(uname: str) -> None:
    params = urlencode({
        'apiuser': user,
        'apipass': pw,
        'q': 'get_userdata',
        'username': uname,
    })
    url = f'{base}/sysapi.php?{params}'
    lines.append('---')
    lines.append(f'USERNAME={uname!r}')
    lines.append(f'SAFE_URL={sanitize_url(url)}')
    try:
        req = Request(url, headers={'Accept': '*/*'})
        with urlopen(req, timeout=12) as resp:
            raw = resp.read()
            ctype = resp.headers.get('Content-Type')
            text = raw.decode('utf-8', errors='replace')
        lines.append(f'HTTP_OK content_type={ctype} len={len(text)}')
        lines.append(f'RAW_HEAD={text[:600]!r}')
        blob = text.lstrip('\ufeff').strip()
        for i, ch in enumerate(blob):
            if ch in '{[':
                blob = blob[i:]
                break
        data = json.loads(blob)
        lines.append(f'JSON_TYPE={type(data).__name__}')
        if isinstance(data, dict):
            lines.append(f'KEYS={list(data.keys())[:30]}')
            lines.append(
                f"code={data.get('code')!r} firstname={data.get('firstname')!r} "
                f"enableuser={data.get('enableuser')!r} expiry={data.get('expiry')!r}"
            )
        elif isinstance(data, list):
            lines.append(f'LIST_LEN={len(data)} HEAD={data[:10]!r}')
            if len(data) > 19:
                lines.append(f'POS0_code={data[0]!r} POS19_firstname={data[19]!r}')
    except Exception as exc:
        lines.append(f'ERR={type(exc).__name__}: {exc}')


for name in ('014000', '014000 YOSYP', 'vatsy_r2i'):
    probe(name)

out.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'Wrote {out}')
