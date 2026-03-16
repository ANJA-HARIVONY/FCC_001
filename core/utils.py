#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🛠️ UTILIDADES DE LA APLICACIÓN
==============================
Funciones de utilidad y filtros personalizados para Jinja2.
"""

import json
from flask import current_app


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
        """Convertir saltos de línea en etiquetas <br>"""
        if not text:
            return ''
        from markupsafe import Markup
        return Markup(text.replace('\n', '<br>').replace('\r', ''))
    
    return app