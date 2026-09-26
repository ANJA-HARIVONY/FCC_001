#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Exportación Excel del informe de salidas de material."""

from datetime import datetime
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font

from core.services.materiales_service import (
    MATERIAL_TIPO_LABELS,
    SALIDA_TIPO_LABELS,
    build_informe_rows,
)

HEADER_FONT = Font(bold=True)

COLUMNS = (
    'Fecha',
    'Técnico',
    'Cliente',
    'Material',
    'Tipo material',
    'Tipo salida',
    'Cantidad',
)

COLUMN_WIDTHS = {
    'A': 12,
    'B': 22,
    'C': 24,
    'D': 28,
    'E': 18,
    'F': 14,
    'G': 10,
}


def _linea_row_values(linea):
    salida = linea.salida
    material = linea.material
    fecha = salida.fecha.strftime('%d/%m/%Y') if salida and salida.fecha else ''
    tecnico = salida.tecnico.nom if salida and salida.tecnico else ''
    if salida and salida.client:
        cliente = salida.client.nom
    elif salida and salida.tipo_salida == 'uso_interno':
        cliente = 'Uso interno'
    else:
        cliente = 'Uso general'
    material_nombre = material.nombre if material else ''
    material_tipo = MATERIAL_TIPO_LABELS.get(material.tipo, material.tipo) if material else ''
    tipo_salida = SALIDA_TIPO_LABELS.get(salida.tipo_salida, salida.tipo_salida) if salida else ''
    return (
        fecha,
        tecnico,
        cliente,
        material_nombre,
        material_tipo,
        tipo_salida,
        linea.cantidad,
    )


def build_informe_workbook(date_from, date_to, agencia_id=None, filters=None, group_by=None):
    """Genera un workbook Excel con el detalle filtrado (sin subtotales)."""
    del group_by  # obsoleto
    lineas = build_informe_rows(date_from, date_to, agencia_id, filters=filters)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Informe salidas'

    for col_idx, header in enumerate(COLUMNS, start=1):
        ws.cell(row=1, column=col_idx, value=header).font = HEADER_FONT

    for row_idx, linea in enumerate(lineas, start=2):
        for col_idx, value in enumerate(_linea_row_values(linea), start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)

    for col_letter, width in COLUMN_WIDTHS.items():
        ws.column_dimensions[col_letter].width = width
    ws.freeze_panes = 'A2'

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def build_informe_export_filename():
    return f"informe_salidas_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"


SALIDA_LIST_COLUMNS = (
    'ID',
    'Fecha',
    'Tipo',
    'Técnico',
    'Cliente',
    'Materiales',
)

SALIDA_LIST_COLUMN_WIDTHS = {
    'A': 8,
    'B': 12,
    'C': 14,
    'D': 22,
    'E': 28,
    'F': 40,
}


def _salida_list_cliente(salida):
    if salida.client:
        return salida.client.nom
    if getattr(salida, 'tipo_salida', None) == 'uso_interno':
        return 'Uso interno'
    return 'Uso general'


def _salida_list_materiales(salida):
    parts = []
    for linea in (salida.lineas or []):
        nombre = linea.material.nombre if linea.material else '?'
        modelo = (linea.material.modelo if linea.material and linea.material.modelo else '?')
        parts.append(f'{nombre}({modelo}) x{linea.cantidad}')
    return ', '.join(parts)


def _salida_list_row(salida):
    fecha = salida.fecha.strftime('%d/%m/%Y') if salida.fecha else ''
    return (
        salida.id,
        fecha,
        SALIDA_TIPO_LABELS.get(salida.tipo_salida, salida.tipo_salida or ''),
        salida.tecnico.nom if salida.tecnico else '',
        _salida_list_cliente(salida),
        _salida_list_materiales(salida),
    )


def build_salidas_list_workbook(salidas):
    """Genera un workbook Excel con solo la página actual de salidas."""
    wb = Workbook()
    ws = wb.active
    ws.title = 'Salidas'

    for col_idx, header in enumerate(SALIDA_LIST_COLUMNS, start=1):
        ws.cell(row=1, column=col_idx, value=header).font = HEADER_FONT

    for row_idx, salida in enumerate(salidas, start=2):
        for col_idx, value in enumerate(_salida_list_row(salida), start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)

    for col_letter, width in SALIDA_LIST_COLUMN_WIDTHS.items():
        ws.column_dimensions[col_letter].width = width
    ws.freeze_panes = 'A2'

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def build_salidas_export_filename():
    return f"salidas_material_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
