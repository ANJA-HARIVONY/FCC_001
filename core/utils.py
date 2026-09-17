#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🛠️ UTILIDADES DE LA APLICACIÓN
==============================
Funciones de utilidad y filtros personalizados para Jinja2.
"""

import json
import re


_BR_RE = re.compile(r'(?i)<br\s*/?>')
_P_OPEN_RE = re.compile(r'(?i)<p[^>]*>')
_P_CLOSE_RE = re.compile(r'(?i)</p\s*>')
_HR_HTML_RE = re.compile(r'(?i)<hr\s*/?>')
_HEADING_RE = re.compile(r'^(#{1,4})\s+(.*)$')
_UL_RE = re.compile(r'^[\*\-]\s+(.*)$')
_OL_RE = re.compile(r'^\d+[.)]\s+(.*)$')
_RULE_RE = re.compile(r'^(-{3,}|_{3,}|\*{3,})$')
_TITLE_RE = re.compile(r'^\*\*(.+)\*\*$')
_META_RE = re.compile(r'^\*\*([^*]+):\*\*\s*(.*)$')
_BOLD_RE = re.compile(r'\*\*(.+?)\*\*')
_ITALIC_RE = re.compile(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)')
_INFORME_TEXT_KEYS = (
    'resume_executif',
    'analyse_personnalisee',
    'analyse',
)


def _strip_json_fence(text):
    raw = (text or '').strip()
    if raw.startswith('```'):
        raw = re.sub(r'^```(?:json)?\s*', '', raw, count=1, flags=re.IGNORECASE)
        if raw.endswith('```'):
            raw = raw[:-3]
    return raw.strip()


def _extract_json_string_field(text, key):
    marker = f'"{key}"'
    idx = text.find(marker)
    if idx < 0:
        return None, False
    colon = text.find(':', idx + len(marker))
    if colon < 0:
        return None, False
    cursor = colon + 1
    while cursor < len(text) and text[cursor].isspace():
        cursor += 1
    if cursor >= len(text) or text[cursor] != '"':
        return None, False
    cursor += 1
    chars = []
    closed = False
    while cursor < len(text):
        ch = text[cursor]
        if ch == '\\' and cursor + 1 < len(text):
            nxt = text[cursor + 1]
            chars.append({
                'n': '\n', 't': '\t', 'r': '\r', '"': '"', '\\': '\\',
            }.get(nxt, nxt))
            cursor += 2
            continue
        if ch == '"':
            closed = True
            break
        chars.append(ch)
        cursor += 1
    value = ''.join(chars).strip()
    return (value or None), closed


def _extract_json_string_array(text, key):
    marker = f'"{key}"'
    idx = text.find(marker)
    if idx < 0:
        return None
    bracket = text.find('[', idx + len(marker))
    if bracket < 0:
        return None
    items = []
    cursor = bracket + 1
    while cursor < len(text):
        ch = text[cursor]
        if ch == ']':
            break
        if ch == '"':
            cursor += 1
            chars = []
            while cursor < len(text):
                cur = text[cursor]
                if cur == '\\' and cursor + 1 < len(text):
                    nxt = text[cursor + 1]
                    chars.append({
                        'n': '\n', 't': '\t', 'r': '\r', '"': '"', '\\': '\\',
                    }.get(nxt, nxt))
                    cursor += 2
                    continue
                if cur == '"':
                    cursor += 1
                    break
                chars.append(cur)
                cursor += 1
            item = ''.join(chars).strip()
            if item:
                items.append(item)
            continue
        cursor += 1
    return items or None


def parse_informe_json(text):
    """Parse un JSON d'informe, y compris une réponse Gemini tronquée."""
    raw = _strip_json_fence(text)
    if not raw.startswith('{'):
        return None
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    recovered = {}
    for key in _INFORME_TEXT_KEYS:
        value, closed = _extract_json_string_field(raw, key)
        if value:
            recovered[key] = value if closed else value.rstrip(' ,') + '…'

    for key in (
        'points_positifs',
        'points_attention',
        'recommandations',
        'tendances_principales',
    ):
        items = _extract_json_string_array(raw, key)
        if items:
            recovered[key] = items

    return recovered or None


def unwrap_informe_text(text):
    """Si le texte est un JSON d'informe, retourne le résumé lisible."""
    if text is None:
        return ''
    raw = str(text).strip()
    if not raw:
        return ''
    parsed = parse_informe_json(raw)
    if not parsed:
        return raw
    for key in _INFORME_TEXT_KEYS:
        value = parsed.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return raw


def render_informe_prose(text):
    """Convertit un texto Markdown/HTML simple de informe IA en HTML sûr."""
    from markupsafe import Markup, escape

    if not text:
        return Markup('')

    raw = unwrap_informe_text(text)
    if not raw:
        return Markup('')
    raw = raw.replace('\r\n', '\n').replace('\r', '\n')
    raw = _BR_RE.sub('\n', raw)
    raw = _P_CLOSE_RE.sub('\n\n', raw)
    raw = _P_OPEN_RE.sub('', raw)
    raw = _HR_HTML_RE.sub('\n---\n', raw)
    raw = re.sub(r'\n{3,}', '\n\n', raw)

    def inline(value):
        escaped = str(escape(value))
        escaped = _BOLD_RE.sub(r'<strong>\1</strong>', escaped)
        escaped = _ITALIC_RE.sub(r'<em>\1</em>', escaped)
        return escaped

    parts = []
    list_tag = None
    meta_open = False

    def close_list():
        nonlocal list_tag
        if list_tag:
            parts.append(f'</{list_tag}>')
            list_tag = None

    def close_meta():
        nonlocal meta_open
        if meta_open:
            parts.append('</dl>')
            meta_open = False

    def close_blocks():
        close_list()
        close_meta()

    for line in raw.split('\n'):
        stripped = line.strip()
        if not stripped:
            close_blocks()
            continue

        if _RULE_RE.fullmatch(stripped):
            close_blocks()
            parts.append('<hr class="etats-custom-prose__rule">')
            continue

        heading = _HEADING_RE.match(stripped)
        if heading:
            close_blocks()
            level = min(max(len(heading.group(1)), 2), 4)
            parts.append(
                f'<h{level} class="etats-custom-prose__h">{inline(heading.group(2))}</h{level}>'
            )
            continue

        title = _TITLE_RE.fullmatch(stripped)
        if title and ':' not in title.group(1):
            close_blocks()
            parts.append(
                f'<h2 class="etats-custom-prose__title">{inline(title.group(1))}</h2>'
            )
            continue

        meta = _META_RE.match(stripped)
        if meta:
            close_list()
            if not meta_open:
                parts.append('<dl class="etats-custom-prose__meta">')
                meta_open = True
            parts.append(
                '<div class="etats-custom-prose__meta-row">'
                f'<dt>{inline(meta.group(1).strip())}</dt>'
                f'<dd>{inline(meta.group(2).strip())}</dd>'
                '</div>'
            )
            continue

        ul_item = _UL_RE.match(stripped)
        if ul_item:
            close_meta()
            if list_tag != 'ul':
                close_list()
                parts.append('<ul class="etats-custom-prose__list">')
                list_tag = 'ul'
            parts.append(f'<li>{inline(ul_item.group(1))}</li>')
            continue

        ol_item = _OL_RE.match(stripped)
        if ol_item:
            close_meta()
            if list_tag != 'ol':
                close_list()
                parts.append('<ol class="etats-custom-prose__list">')
                list_tag = 'ol'
            parts.append(f'<li>{inline(ol_item.group(1))}</li>')
            continue

        close_blocks()
        parts.append(f'<p>{inline(stripped)}</p>')

    close_blocks()
    return Markup(''.join(parts))


def setup_template_filters(app):
    """Configurar filtros personalizados para Jinja2"""
    
    @app.template_filter('from_json')
    def from_json_filter(json_string):
        """Convertir string JSON a objeto Python"""
        try:
            if isinstance(json_string, str):
                return json.loads(json_string)
            else:
                return json_string
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @app.template_filter('nl2br')
    def nl2br_filter(text):
        """Convertir saltos de línea en etiquetas <br>, en echappant le HTML.

        IMPORTANT : on echappe d'abord la saisie utilisateur (escape) puis on
        injecte les <br> via Markup. Sans cette etape, un contenu provenant
        d'une saisie ou d'une reponse IA pourrait contenir du HTML/script et
        provoquer un XSS stocke.
        """
        if not text:
            return ''
        from markupsafe import Markup, escape
        escaped = escape(str(text)).replace('\r', '')
        return Markup(escaped.replace('\n', '<br>'))

    @app.template_filter('informe_prose')
    def informe_prose_filter(text):
        """Affiche un informe IA (Markdown + <br>) comme document HTML sûr."""
        return render_informe_prose(text)

    @app.template_filter('unwrap_informe')
    def unwrap_informe_filter(text):
        """Extrait le texte lisible si Gemini a renvoyé un JSON brut."""
        return unwrap_informe_text(text)

    @app.template_filter('material_foto_url')
    def material_foto_url_filter(foto_path):
        from core.services.materiales_service import material_foto_url
        return material_foto_url(foto_path)

    @app.template_filter('salida_lineas_copy')
    def salida_lineas_copy_filter(salida):
        from core.services.materiales_service import salida_lineas_copy_data
        return salida_lineas_copy_data(salida)

    return app
