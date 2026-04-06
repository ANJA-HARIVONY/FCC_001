#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 SERVICE API KIMI K2
======================
Service pour intégrer l'API Kimi K2 dans l'application FCC_001.
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import ssl
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from flask import current_app


class KimiService:
    """Service pour l'intégration avec l'API Kimi K2"""
    
    def __init__(self):
        """Initialiser le service avec la configuration de l'app"""
        self.api_key = current_app.config.get('KIMI_API_KEY')
        self.model = current_app.config.get('KIMI_MODEL', 'moonshotai/kimi-k2')
        self.api_url = current_app.config.get('KIMI_API_URL', 'https://openrouter.ai/api/v1/chat/completions')
        self.timeout = current_app.config.get('KIMI_TIMEOUT', 30)
        self.max_tokens = current_app.config.get('KIMI_MAX_TOKENS', 1000)
        self.temperature = current_app.config.get('KIMI_TEMPERATURE', 0.7)
    
    def _make_api_call(self, messages: List[Dict], max_tokens: Optional[int] = None, temperature: Optional[float] = None) -> Dict:
        """
        Effectuer un appel API vers Kimi K2
        
        Args:
            messages: Liste des messages au format OpenAI
            max_tokens: Limite de tokens (optionnel)
            temperature: Température pour la génération (optionnel)
            
        Returns:
            dict: Réponse de l'API ou erreur
        """
        # Utiliser les valeurs par défaut si non spécifiées
        max_tokens = max_tokens or self.max_tokens
        temperature = temperature or self.temperature
        
        # Construire le payload
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        # Préparer la requête
        data = json.dumps(payload).encode('utf-8')
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'FCC_001-EtatsIA/1.0'
        }
        
        req = urllib.request.Request(self.api_url, data=data, headers=headers)
        
        try:
            # Envoyer la requête
            context = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=self.timeout, context=context) as response:
                if response.getcode() == 200:
                    response_data = json.loads(response.read().decode('utf-8'))
                    
                    if "choices" in response_data and len(response_data["choices"]) > 0:
                        return {
                            'success': True,
                            'content': response_data["choices"][0]["message"]["content"],
                            'usage': response_data.get('usage', {}),
                            'model': response_data.get('model', self.model)
                        }
                    else:
                        return {'success': False, 'error': 'Aucune réponse reçue'}
                else:
                    return {'success': False, 'error': f'HTTP {response.getcode()}'}
                    
        except urllib.error.HTTPError as e:
            error_response = e.read().decode('utf-8')
            return {'success': False, 'error': f'HTTP Error {e.code}: {error_response}'}
        except urllib.error.URLError as e:
            return {'success': False, 'error': f'URL Error: {str(e)}'}
        except Exception as e:
            return {'success': False, 'error': f'Erreur inattendue: {str(e)}'}
    
    def generate_executive_summary(self, data_context: Dict) -> Dict:
        """
        Générer un résumé exécutif intelligent
        
        Args:
            data_context: Contexte de données (incidents, clients, stats)
            
        Returns:
            dict: Résumé généré ou erreur
        """
        # Construir el prompt para resumen ejecutivo
        prompt = f"""
Eres un experto en análisis de datos de servicio técnico.
Genera un resumen ejecutivo profesional en español basado en estos datos:

PERÍODO: {data_context.get('periode', 'No especificado')}
DATOS GENERALES:
- Total incidentes: {data_context.get('total_incidents', 0)}
- Incidentes resueltos: {data_context.get('incidents_resolus', 0)}
- Incidentes en curso: {data_context.get('incidents_en_cours', 0)}
- Tasa de resolución: {data_context.get('taux_resolution', 0)}%
- Tiempo promedio de resolución: {data_context.get('temps_moyen', 'N/A')}

DISTRIBUCIÓN POR TIPO:
{self._format_incidents_par_type(data_context.get('incidents_par_type', {}))}

RENDIMIENTO OPERADORES:
{self._format_performance_operateurs(data_context.get('operateurs_performance', {}))}

FORMATO RESPUESTA (JSON):
{{
    "resume_executif": "3-4 frases de síntesis general",
    "points_positifs": ["Punto 1", "Punto 2", "Punto 3"],
    "points_attention": ["Punto 1", "Punto 2"],
    "recommandations": ["Acción 1", "Acción 2", "Acción 3"],
    "kpis_cles": {{
        "kpi1": "valor y descripción",
        "kpi2": "valor y descripción"
    }}
}}

Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""

        messages = [{"role": "user", "content": prompt}]
        
        result = self._make_api_call(messages, max_tokens=800)
        
        if result['success']:
            try:
                # Tenter de parser le JSON retourné
                content = result['content'].strip()
                if content.startswith('```json'):
                    content = content[7:-3].strip()
                elif content.startswith('```'):
                    content = content[3:-3].strip()
                
                parsed_content = json.loads(content)
                return {
                    'success': True,
                    'data': parsed_content,
                    'usage': result.get('usage', {}),
                    'type': 'executive_summary'
                }
            except json.JSONDecodeError:
                # Si le JSON est invalide, retourner le texte brut
                return {
                    'success': True,
                    'data': {'resume_executif': result['content']},
                    'usage': result.get('usage', {}),
                    'type': 'executive_summary',
                    'warning': 'Format JSON invalide, contenu en texte brut'
                }
        else:
            return result
    
    def generate_trend_analysis(self, data_context: Dict) -> Dict:
        """
        Générer une analyse des tendances
        
        Args:
            data_context: Contexte de données avec historique temporel
            
        Returns:
            dict: Analyse des tendances ou erreur
        """
        prompt = f"""
Analiza las tendencias de estos datos de servicio técnico en español:

PERÍODO DE ANÁLISIS: {data_context.get('periode', 'No especificado')}
EVOLUCIÓN TEMPORAL:
{self._format_evolution_temporelle(data_context.get('evolution', {}))}

PATRONES IDENTIFICADOS:
- Día de la semana con más incidentes: {data_context.get('pic_jour', 'N/A')}
- Hora pico: {data_context.get('pic_heure', 'N/A')}
- Tipo de incidente dominante: {data_context.get('type_dominant', 'N/A')}

Proporciona un análisis estructurado en JSON:
{{
    "tendances_principales": ["Tendencia 1", "Tendencia 2"],
    "patterns_temporels": {{
        "jours": "descripción de los patrones por día",
        "heures": "descripción de los patrones por hora"
    }},
    "predictions": ["Predicción 1", "Predicción 2"],
    "actions_preventives": ["Acción 1", "Acción 2"]
}}

Responde ÚNICAMENTE con el JSON.
"""

        messages = [{"role": "user", "content": prompt}]
        result = self._make_api_call(messages, max_tokens=600)
        
        if result['success']:
            try:
                content = result['content'].strip()
                if content.startswith('```json'):
                    content = content[7:-3].strip()
                elif content.startswith('```'):
                    content = content[3:-3].strip()
                
                parsed_content = json.loads(content)
                return {
                    'success': True,
                    'data': parsed_content,
                    'usage': result.get('usage', {}),
                    'type': 'trend_analysis'
                }
            except json.JSONDecodeError:
                return {
                    'success': True,
                    'data': {'analyse': result['content']},
                    'usage': result.get('usage', {}),
                    'type': 'trend_analysis',
                    'warning': 'Format JSON invalide'
                }
        else:
            return result
    
    def generate_custom_analysis(self, prompt_user: str, data_context: Dict) -> Dict:
        """
        Générer une analyse personnalisée basée sur un prompt utilisateur
        
        Args:
            prompt_user: Prompt personnalisé de l'utilisateur
            data_context: Contexte de données à analyser
            
        Returns:
            dict: Analyse personnalisée ou erreur
        """
        full_prompt = f"""
El usuario solicita un análisis personalizado. Esta es su solicitud:
"{prompt_user}"

Contexto de datos disponibles:
{json.dumps(data_context, indent=2, ensure_ascii=False)}

Proporciona una respuesta estructurada y profesional en español que responda precisamente a la solicitud del usuario utilizando los datos disponibles.
"""

        messages = [{"role": "user", "content": full_prompt}]
        result = self._make_api_call(messages, max_tokens=800)
        
        if result['success']:
            return {
                'success': True,
                'data': {'analyse_personnalisee': result['content']},
                'usage': result.get('usage', {}),
                'type': 'custom_analysis'
            }
        else:
            return result
    
    def generate_chart_insights(self, chart_data: Dict, chart_type: str) -> str:
        """
        Générer des insights pour accompagner un graphique
        
        Args:
            chart_data: Données du graphique
            chart_type: Type de graphique ('line', 'bar', 'pie', etc.)
            
        Returns:
            str: Insights textuels pour le graphique
        """
        prompt = f"""
Genera una observación corta (2-3 frases) en español para este gráfico {chart_type}:

Datos: {json.dumps(chart_data, indent=2, ensure_ascii=False)}

La observación debe explicar la tendencia principal y dar una interpretación de negocio útil.
Responde solo con el texto de la observación, sin formato.
"""

        messages = [{"role": "user", "content": prompt}]
        result = self._make_api_call(messages, max_tokens=200, temperature=0.5)
        
        if result['success']:
            return result['content'].strip()
        else:
            return f"Error al generar observación: {result.get('error', 'Error desconocido')}"
    
    def _format_incidents_par_type(self, incidents_par_type: Dict) -> str:
        """Formatear los incidentes por tipo para el prompt"""
        if not incidents_par_type:
            return "Ningún dato disponible"
        
        lines = []
        for type_incident, count in incidents_par_type.items():
            lines.append(f"- {type_incident}: {count}")
        return "\n".join(lines)
    
    def _format_performance_operateurs(self, operateurs_perf: Dict) -> str:
        """Formatear el rendimiento de los operadores para el prompt"""
        if not operateurs_perf:
            return "Ningún dato disponible"
        
        lines = []
        for operateur, stats in operateurs_perf.items():
            if isinstance(stats, dict):
                resolved = stats.get('resolus', 0)
                total = stats.get('total', 0)
                lines.append(f"- {operateur}: {resolved}/{total} incidents")
            else:
                lines.append(f"- {operateur}: {stats} incidents")
        return "\n".join(lines)
    
    def _format_evolution_temporelle(self, evolution: Dict) -> str:
        """Formatear la evolución temporal para el prompt"""
        if not evolution:
            return "Ningún dato de evolución disponible"
        
        lines = []
        for periode, valeur in evolution.items():
            lines.append(f"- {periode}: {valeur}")
        return "\n".join(lines)
    
    def generate_cache_key(self, data_context: Dict, analysis_type: str, user_prompt: str = "") -> str:
        """
        Générer une clé de cache basée sur les paramètres
        
        Args:
            data_context: Contexte de données
            analysis_type: Type d'analyse
            user_prompt: Prompt utilisateur (pour analyses personnalisées)
            
        Returns:
            str: Clé de cache SHA-256
        """
        # Créer une chaîne unique basée sur les paramètres
        cache_string = f"{analysis_type}_{json.dumps(data_context, sort_keys=True)}_{user_prompt}"
        
        # Générer un hash SHA-256
        return hashlib.sha256(cache_string.encode('utf-8')).hexdigest()
    
    def test_connection(self) -> Dict:
        """
        Tester la connexion à l'API Kimi K2
        
        Returns:
            dict: Résultat du test de connexion
        """
        messages = [{"role": "user", "content": "Di simplemente 'Test OK' en español."}]
        
        result = self._make_api_call(messages, max_tokens=20, temperature=0.1)
        
        if result['success']:
            return {
                'success': True,
                'message': 'Conexión API Kimi K2 exitosa',
                'response': result['content'],
                'usage': result.get('usage', {})
            }
        else:
            return {
                'success': False,
                'message': 'Fallo de conexión API Kimi K2',
                'error': result.get('error', 'Error desconocido')
            }


# Instance globale du service (initialisée avec l'app context)
def get_kimi_service() -> KimiService:
    """
    Obtenir une instance du service Kimi (avec app context)
    
    Returns:
        KimiService: Instance du service
    """
    return KimiService()