#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Service Gemini pour la rédaction des informes (etats)."""

import json
import ssl
import urllib.error
import urllib.request
from typing import Any, Dict, List

from flask import current_app

from core.utils import parse_informe_json

SYSTEM_INSTRUCTION = (
    "Analiza los datos y redacta un informe profesional, claro y breve. "
    "Responde en español. No inventes cifras ni hechos: utiliza únicamente "
    "los datos proporcionados. Distingue clientes corporativos y particulares "
    "cuando sea relevante, y ten en cuenta las notas del día del período. "
    "Tono concreto, útil para un responsable de atención al cliente."
)


class GeminiService:
    """Appels REST à l'API Gemini (generateContent, Google AI Studio)."""

    def __init__(self):
        self.api_key = (current_app.config.get('GEMINI_API_KEY') or '').strip()
        self.model = (
            current_app.config.get('GEMINI_MODEL') or 'gemini-3.6-flash'
        ).strip()
        configured_url = (current_app.config.get('GEMINI_API_URL') or '').strip().rstrip('/')
        if configured_url.endswith(':generateContent') or configured_url.endswith('/interactions'):
            self.api_url = configured_url
        else:
            base = configured_url or 'https://generativelanguage.googleapis.com/v1beta/models'
            self.api_url = f'{base}/{self.model}:generateContent'
        self.timeout = int(current_app.config.get('GEMINI_TIMEOUT') or 60)
        self.max_tokens = int(current_app.config.get('GEMINI_MAX_TOKENS') or 4096)

    def generate_executive_summary(self, data_context: Dict) -> Dict:
        prompt = f"""
Genera un resumen ejecutivo profesional basado en estos datos del servicio de atención al cliente.

PERÍODO: {data_context.get('periode', 'No especificado')}
AGENCIA: {data_context.get('agence_label', 'Todas las agencias')}

DATOS GENERALES:
- Total incidentes: {data_context.get('total_incidents', 0)}
- Solucionadas (a distancia): {data_context.get('incidents_resolus', 0)}
- Pendientes: {data_context.get('incidents_en_cours', 0)}
- Bitrix (terreno): {data_context.get('incidents_bitrix', 0)}
- Tasa de resolución: {data_context.get('taux_resolution', 0)}%
- Clientes impactados: {data_context.get('nombre_clients_impactes', 0)}
- Operadores activos: {data_context.get('nombre_operateurs_actifs', 0)}

{self._format_clientes_categoria(data_context.get('clientes_categoria', {}))}

NOTAS DEL DÍA:
{self._format_notas_del_dia(data_context.get('notas_del_dia', []))}

DISTRIBUCIÓN POR TIPO:
{self._format_incidents_par_type(data_context.get('incidents_par_type', {}))}

RENDIMIENTO OPERADORES:
{self._format_performance_operateurs(data_context.get('operateurs_performance', {}))}

FORMATO RESPUESTA (JSON):
{{
    "resume_executif": "3-4 frases de síntesis general",
    "points_positifs": ["Punto 1", "Punto 2"],
    "points_attention": ["Punto 1", "Punto 2"],
    "recommandations": ["Acción 1", "Acción 2"]
}}

Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""
        return self._generate_json(prompt, 'executive_summary')

    def generate_trend_analysis(self, data_context: Dict) -> Dict:
        prompt = f"""
Analiza las tendencias de estos datos de atención al cliente.

PERÍODO: {data_context.get('periode', 'No especificado')}
AGENCIA: {data_context.get('agence_label', 'Todas las agencias')}
TOTAL INCIDENTES: {data_context.get('total_incidents', 0)}
TASA DE RESOLUCIÓN: {data_context.get('taux_resolution', 0)}%
BITRIX (terreno): {data_context.get('incidents_bitrix', 0)}

{self._format_clientes_categoria(data_context.get('clientes_categoria', {}))}

NOTAS DEL DÍA:
{self._format_notas_del_dia(data_context.get('notas_del_dia', []))}

EVOLUCIÓN TEMPORAL:
{self._format_evolution_temporelle(data_context.get('evolution', []))}

TIPOS MÁS FRECUENTES:
{self._format_incidents_par_type(data_context.get('incidents_par_type', {}))}

FORMATO RESPUESTA (JSON):
{{
    "tendances_principales": ["Tendencia 1", "Tendencia 2", "Tendencia 3"]
}}

Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""
        return self._generate_json(prompt, 'trend_analysis')

    def generate_performance_analysis(self, data_context: Dict) -> Dict:
        prompt = f"""
Redacta un informe breve de actividad por usuario/operador.

PERÍODO: {data_context.get('periode', 'No especificado')}
AGENCIA: {data_context.get('agence_label', 'Todas las agencias')}
TOTAL INCIDENTES: {data_context.get('total_incidents', 0)}
SOLUCIONADAS: {data_context.get('incidents_resolus', 0)}
BITRIX: {data_context.get('incidents_bitrix', 0)}
OPERADORES ACTIVOS: {data_context.get('nombre_operateurs_actifs', 0)}

{self._format_clientes_categoria(data_context.get('clientes_categoria', {}))}

NOTAS DEL DÍA:
{self._format_notas_del_dia(data_context.get('notas_del_dia', []))}

ACTIVIDAD POR USUARIO:
{self._format_activite_utilisateurs(data_context.get('activite_utilisateurs', []))}

FORMATO RESPUESTA (JSON):
{{
    "resume_executif": "2-3 frases sobre la carga y el rendimiento del equipo",
    "points_positifs": ["Punto 1", "Punto 2"],
    "points_attention": ["Punto 1"],
    "recommandations": ["Acción 1", "Acción 2"]
}}

Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""
        return self._generate_json(prompt, 'performance_analysis')

    def generate_custom_analysis(self, prompt_user: str, data_context: Dict) -> Dict:
        prompt = f"""
El usuario solicita un análisis personalizado:
"{prompt_user}"

Contexto de datos disponibles:
{json.dumps(self._compact_context(data_context), indent=2, ensure_ascii=False)}

Redacta un informe breve y profesional en español.
Reglas de formato:
- Usa Markdown sencillo: título en negrita, ### para secciones, listas con -, **etiqueta:** valor.
- No uses HTML (<br>, <p>, <div>, etc.).
- No inventes cifras. Si un dato es 0, dilo con claridad.
- Distingue clientes corporativos y particulares.
- Incorpora las notas del día del período cuando aporten contexto.
"""
        result = self._make_api_call(prompt, json_mode=False)
        if not result.get('success'):
            return result
        parsed = parse_informe_json(result.get('content') or '')
        if parsed:
            if not parsed.get('analyse_personnalisee') and parsed.get('resume_executif'):
                parsed['analyse_personnalisee'] = parsed['resume_executif']
            return {
                'success': True,
                'data': parsed,
                'usage': result.get('usage', {}),
                'type': 'custom_analysis',
                'model': result.get('model', self.model),
            }
        return {
            'success': True,
            'data': {'analyse_personnalisee': result['content']},
            'usage': result.get('usage', {}),
            'type': 'custom_analysis',
            'model': result.get('model', self.model),
        }

    def _generate_json(self, prompt: str, analysis_type: str) -> Dict:
        result = self._make_api_call(prompt, json_mode=True)
        if not result.get('success'):
            return result
        parsed = parse_informe_json(result.get('content') or '')
        if parsed is None:
            return {
                'success': True,
                'data': {'resume_executif': result.get('content', '')},
                'usage': result.get('usage', {}),
                'type': analysis_type,
                'model': result.get('model', self.model),
                'warning': 'Format JSON invalide, contenu en texte brut',
            }
        return {
            'success': True,
            'data': parsed,
            'usage': result.get('usage', {}),
            'type': analysis_type,
            'model': result.get('model', self.model),
        }

    def _make_api_call(self, prompt: str, json_mode: bool = True) -> Dict:
        if not self.api_key:
            return {'success': False, 'error': 'GEMINI_API_KEY no está configurada'}

        payload = self._generate_content_payload(prompt, json_mode)
        result = self._post_json(self.api_url, payload)
        if self._is_thinking_rejected(result):
            payload = self._generate_content_payload(prompt, json_mode, with_thinking=False)
            result = self._post_json(self.api_url, payload)
        if result.get('success') or not self._is_not_found(result):
            return result

        # L'API Interactions est sur /v1beta/interactions (pas v1beta2).
        fallback_url = 'https://generativelanguage.googleapis.com/v1beta/interactions'
        return self._post_json(fallback_url, self._interactions_payload(prompt, json_mode))

    def _generate_content_payload(
        self, prompt: str, json_mode: bool, with_thinking: bool = True
    ) -> Dict[str, Any]:
        generation_config: Dict[str, Any] = {
            'maxOutputTokens': self.max_tokens,
        }
        if with_thinking:
            generation_config['thinkingConfig'] = {
                'thinkingBudget': 0,
            }
        if json_mode:
            generation_config['responseMimeType'] = 'application/json'
        return {
            'systemInstruction': {
                'parts': [{'text': SYSTEM_INSTRUCTION}],
            },
            'contents': [
                {
                    'role': 'user',
                    'parts': [{'text': prompt.strip()}],
                }
            ],
            'generationConfig': generation_config,
        }

    def _interactions_payload(self, prompt: str, json_mode: bool) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            'model': self.model,
            'input': prompt.strip(),
            'system_instruction': SYSTEM_INSTRUCTION,
            'store': False,
            'generation_config': {
                'max_output_tokens': self.max_tokens,
                'thinking_level': 'minimal',
            },
        }
        if json_mode:
            payload['response_format'] = {
                'type': 'text',
                'mime_type': 'application/json',
            }
        return payload

    def _post_json(self, url: str, payload: Dict[str, Any]) -> Dict:
        data = json.dumps(payload).encode('utf-8')
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': self.api_key,
            'User-Agent': 'FCC_001-EtatsIA/1.0',
        }
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            context = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=self.timeout, context=context) as response:
                body = response.read().decode('utf-8')
                if response.getcode() != 200:
                    return {'success': False, 'error': f'HTTP {response.getcode()}'}
                return self._parse_api_response(json.loads(body))
        except urllib.error.HTTPError as exc:
            detail = self._safe_http_error(exc)
            return {'success': False, 'error': f'HTTP {exc.code}: {detail}', 'http_code': exc.code}
        except urllib.error.URLError as exc:
            return {'success': False, 'error': f'Error de red Gemini: {exc.reason}'}
        except Exception as exc:
            return {'success': False, 'error': f'Error inesperado Gemini: {exc}'}

    @staticmethod
    def _is_thinking_rejected(result: Dict) -> bool:
        if result.get('success'):
            return False
        error = str(result.get('error') or '').lower()
        return result.get('http_code') == 400 and 'thinking' in error

    @staticmethod
    def _is_not_found(result: Dict) -> bool:
        if result.get('http_code') == 404:
            return True
        error = str(result.get('error') or '')
        return error.startswith('HTTP 404')

    def _parse_api_response(self, response_data: Dict) -> Dict:
        if response_data.get('error'):
            err = response_data['error']
            message = err.get('message') if isinstance(err, dict) else str(err)
            return {'success': False, 'error': message or 'Error Gemini'}

        text = self._extract_output_text(response_data)
        if not text:
            status = (response_data.get('status') or '').lower()
            if status and status not in ('completed', 'complete', 'succeeded', 'success'):
                return {
                    'success': False,
                    'error': f'Respuesta Gemini incompleta ({status})',
                }
            return {'success': False, 'error': 'Gemini devolvió una respuesta vacía'}

        usage_raw = response_data.get('usageMetadata') or response_data.get('usage') or {}
        usage = {
            'prompt_tokens': usage_raw.get('promptTokenCount') or usage_raw.get('total_input_tokens'),
            'completion_tokens': usage_raw.get('candidatesTokenCount') or usage_raw.get('total_output_tokens'),
            'total_tokens': usage_raw.get('totalTokenCount') or usage_raw.get('total_tokens'),
        }
        return {
            'success': True,
            'content': text,
            'usage': usage,
            'model': response_data.get('model') or self.model,
        }

    @staticmethod
    def _extract_output_text(response_data: Dict) -> str:
        if response_data.get('output_text'):
            return str(response_data['output_text']).strip()

        candidates = response_data.get('candidates') or []
        if candidates:
            parts = (candidates[0].get('content') or {}).get('parts') or []
            text = ''.join(
                part.get('text', '')
                for part in parts
                if isinstance(part, dict) and part.get('text') and not part.get('thought')
            ).strip()
            if not text:
                text = ''.join(
                    part.get('text', '')
                    for part in parts
                    if isinstance(part, dict) and part.get('text')
                ).strip()
            if text:
                return text

        texts = []
        for step in response_data.get('steps') or []:
            if not isinstance(step, dict):
                continue
            if step.get('type') not in ('model_output', None, ''):
                continue
            for item in step.get('content') or []:
                if isinstance(item, dict) and item.get('text'):
                    texts.append(str(item['text']))
                elif isinstance(item, str):
                    texts.append(item)
        return ''.join(texts).strip()

    @staticmethod
    def _safe_http_error(exc: urllib.error.HTTPError) -> str:
        try:
            raw = exc.read().decode('utf-8', errors='replace')
            payload = json.loads(raw)
            err = payload.get('error') if isinstance(payload, dict) else None
            if isinstance(err, dict) and err.get('message'):
                return err['message']
            return raw[:400]
        except Exception:
            return exc.reason or 'Error HTTP Gemini'

    @staticmethod
    def _compact_context(data_context: Dict) -> Dict:
        evolution = data_context.get('evolution') or []
        if isinstance(evolution, list) and len(evolution) > 31:
            evolution = evolution[:10] + evolution[-10:]
        compact = dict(data_context)
        compact['evolution'] = evolution
        notas = compact.get('notas_del_dia') or []
        if isinstance(notas, list) and len(notas) > 60:
            compact['notas_del_dia'] = notas[:60]
            compact['notas_omitidas'] = len(notas) - 60
        return compact

    @staticmethod
    def _format_incidents_par_type(incidents_par_type: Dict) -> str:
        if not incidents_par_type:
            return 'Ningún dato disponible'
        return '\n'.join(f'- {label}: {count}' for label, count in incidents_par_type.items())

    @staticmethod
    def _format_performance_operateurs(operateurs_perf: Dict) -> str:
        if not operateurs_perf:
            return 'Ningún dato disponible'
        lines = []
        for operateur, stats in operateurs_perf.items():
            if isinstance(stats, dict):
                resolved = stats.get('resolus', 0)
                total = stats.get('total', 0)
                lines.append(f'- {operateur}: {resolved}/{total} incidentes')
            else:
                lines.append(f'- {operateur}: {stats} incidentes')
        return '\n'.join(lines)

    @staticmethod
    def _format_activite_utilisateurs(rows: List[Dict]) -> str:
        if not rows:
            return 'Ningún dato disponible'
        lines = []
        for row in rows:
            lines.append(
                f"- {row.get('usuario', '?')}: total {row.get('total', 0)}, "
                f"solucionadas {row.get('solucionadas', 0)}, "
                f"bitrix {row.get('bitrix', 0)}"
            )
        return '\n'.join(lines)

    @staticmethod
    def _format_evolution_temporelle(evolution) -> str:
        if not evolution:
            return 'Ningún dato de evolución disponible'
        if isinstance(evolution, dict):
            return '\n'.join(f'- {periode}: {valeur}' for periode, valeur in evolution.items())
        lines = []
        for point in evolution:
            if not isinstance(point, dict):
                continue
            line = (
                f"- {point.get('label')}: total {point.get('count', 0)}, "
                f"solucionadas {point.get('solucionadas', 0)}, "
                f"bitrix {point.get('bitrix', 0)}"
            )
            if point.get('apreciacion'):
                line += f", nota del día: {point.get('apreciacion')}"
            lines.append(line)
        return '\n'.join(lines) or 'Ningún dato de evolución disponible'

    @staticmethod
    def _format_clientes_categoria(cats: Dict) -> str:
        if not cats:
            return 'CLIENTES POR CATEGORÍA:\nNingún dato disponible'
        return (
            'CLIENTES POR CATEGORÍA:\n'
            f"- Corporativos: {cats.get('incidents_corporativo', 0)} incidencias "
            f"({cats.get('clientes_corporativo', 0)} clientes únicos)\n"
            f"- Particulares: {cats.get('incidents_particular', 0)} incidencias "
            f"({cats.get('clientes_particular', 0)} clientes únicos)"
        )

    @staticmethod
    def _format_notas_del_dia(notas) -> str:
        if not notas:
            return 'Ninguna nota del día en el período.'
        lines = []
        for nota in notas[:60]:
            if not isinstance(nota, dict):
                continue
            lines.append(f"- {nota.get('fecha')}: {nota.get('texto')}")
        omitted = max(len(notas) - 60, 0)
        if omitted:
            lines.append(f'- … y {omitted} nota(s) más')
        return '\n'.join(lines) or 'Ninguna nota del día en el período.'


def get_gemini_service() -> GeminiService:
    return GeminiService()
