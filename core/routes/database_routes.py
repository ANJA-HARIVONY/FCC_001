#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rutas de gestión de la base de datos."""

import os
import sys
import tempfile
from datetime import datetime

from flask import flash, jsonify, make_response, redirect, render_template, url_for
from sqlalchemy import inspect, text

from core.app import app, db, superadmin_required


@app.route('/base-de-datos')
@superadmin_required
def base_de_datos():
    """Page principale de gestion de la base de données (admin uniquement)."""
    return render_template('database.html')


@app.route('/base-de-datos/verificar', methods=['POST'])
@superadmin_required
def base_de_datos_verificar():
    """Lance la vérification de la BDD et retourne un rapport JSON."""
    try:
        # Vérification intégrée pour éviter la dépendance à un module externe absent en prod.
        db.session.execute(text('SELECT 1'))

        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        counts = {}
        integrity = []
        foreign_keys = []
        warnings = 0
        errors = 0
        passed = 0

        for table in table_names:
            try:
                count_result = db.session.execute(text(f'SELECT COUNT(*) FROM `{table}`'))
                counts[table] = int(count_result.scalar() or 0)
                integrity.append({'table': table, 'status': 'OK', 'message': 'Tabla accesible'})
                passed += 1
            except Exception as table_error:
                counts[table] = None
                integrity.append({'table': table, 'status': 'ERROR', 'message': str(table_error)})
                errors += 1

            # Vérification simple des clés étrangères (orphans)
            try:
                for fk in inspector.get_foreign_keys(table):
                    constrained_columns = fk.get('constrained_columns') or []
                    referred_table = fk.get('referred_table')
                    referred_columns = fk.get('referred_columns') or []

                    if len(constrained_columns) != 1 or len(referred_columns) != 1 or not referred_table:
                        continue

                    local_col = constrained_columns[0]
                    ref_col = referred_columns[0]
                    fk_name = fk.get('name') or f'{table}.{local_col} -> {referred_table}.{ref_col}'

                    orphan_query = text(
                        f'''
                        SELECT COUNT(*)
                        FROM `{table}` t
                        LEFT JOIN `{referred_table}` r ON t.`{local_col}` = r.`{ref_col}`
                        WHERE t.`{local_col}` IS NOT NULL AND r.`{ref_col}` IS NULL
                        '''
                    )
                    orphans = int(db.session.execute(orphan_query).scalar() or 0)

                    status = 'OK' if orphans == 0 else 'WARNING'
                    if status == 'OK':
                        passed += 1
                    else:
                        warnings += 1

                    foreign_keys.append({
                        'name': fk_name,
                        'orphans': orphans,
                        'status': status
                    })
            except Exception as fk_error:
                warnings += 1
                foreign_keys.append({
                    'name': f'FK check failed on {table}',
                    'orphans': 0,
                    'status': 'WARNING',
                    'message': str(fk_error)
                })

        total_checks = passed + warnings + errors
        if errors > 0:
            global_status = 'ERROR'
        elif warnings > 0:
            global_status = 'WARNING'
        else:
            global_status = 'OK'

        result = {
            'host': os.environ.get('DB_HOST', 'localhost'),
            'database': os.environ.get('DB_NAME', 'fcc_001_db'),
            'timestamp': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'connection': {'ok': True, 'message': 'Conexión exitosa'},
            'tables': table_names,
            'counts': counts,
            'integrity': integrity,
            'foreign_keys': foreign_keys,
            'summary': {
                'status': global_status,
                'total_checks': total_checks,
                'passed': passed,
                'warnings': warnings,
                'errors': errors
            }
        }
        return jsonify({'ok': True, 'data': result})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/base-de-datos/exportar')
@superadmin_required
def base_de_datos_exportar():
    """Génère et télécharge un fichier .sql compatible HeidiSQL (admin uniquement)."""
    try:
        tools_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools')
        if tools_dir not in sys.path:
            sys.path.insert(0, tools_dir)
        from export_database_sql import export_database

        # Générer dans un fichier temporaire puis renvoyer en téléchargement
        with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as tmp:
            tmp_path = tmp.name

        output_path = export_database(output_path=tmp_path)

        with open(output_path, 'rb') as f:
            sql_bytes = f.read()

        os.unlink(tmp_path)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"backup_{timestamp}.sql"

        response = make_response(sql_bytes)
        response.headers['Content-Type'] = 'application/octet-stream'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        flash(f'Error al exportar la base de datos: {str(e)}', 'error')
        return redirect(url_for('base_de_datos'))
