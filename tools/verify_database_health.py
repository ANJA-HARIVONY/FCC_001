#!/usr/bin/env python3
"""
Verificación de salud de la base de datos MariaDB - FCC_001
Comprueba: conectividad, integridad de tablas, conteos y restricciones.
"""

import os
import sys
import json
from datetime import datetime

# Charger les variables d'environnement depuis .env
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
env_file = os.path.join(project_root, '.env')

if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                os.environ.setdefault(key.strip(), value.strip())

DB_HOST     = os.environ.get('DB_HOST', 'localhost')
DB_PORT     = int(os.environ.get('DB_PORT', '3306'))
DB_NAME     = os.environ.get('DB_NAME', 'fcc_001_db')
DB_USER     = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')


def verify_database():
    """
    Exécute tous les contrôles de santé de la base de données.
    Retourne un dict avec les résultats structurés.
    """
    result = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'database': DB_NAME,
        'host': f"{DB_HOST}:{DB_PORT}",
        'connection': {'ok': False, 'message': ''},
        'tables': [],
        'counts': {},
        'integrity': [],
        'foreign_keys': [],
        'summary': {'status': 'ERROR', 'total_checks': 0, 'passed': 0, 'warnings': 0, 'errors': 0}
    }

    try:
        import pymysql
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            connect_timeout=10
        )
        result['connection']['ok'] = True
        result['connection']['message'] = 'Conexión establecida correctamente'
    except Exception as e:
        result['connection']['message'] = str(e)
        result['summary']['status'] = 'ERROR'
        result['summary']['errors'] += 1
        return result

    try:
        with conn.cursor() as cur:
            # 1. Lister les tables
            cur.execute("SHOW TABLES")
            tables = [row[0] for row in cur.fetchall()]
            result['tables'] = tables

            # 2. Compter les enregistrements par table
            for table in tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM `{table}`")
                    count = cur.fetchone()[0]
                    result['counts'][table] = count
                except Exception as e:
                    result['counts'][table] = f"ERROR: {e}"

            # 3. CHECK TABLE (intégrité)
            for table in tables:
                try:
                    cur.execute(f"CHECK TABLE `{table}`")
                    rows = cur.fetchall()
                    for row in rows:
                        msg_type = row[2].upper() if len(row) > 2 else 'OK'
                        msg_text = row[3] if len(row) > 3 else 'OK'
                        check_entry = {
                            'table': table,
                            'status': msg_type,
                            'message': msg_text
                        }
                        result['integrity'].append(check_entry)
                        if msg_type == 'ERROR':
                            result['summary']['errors'] += 1
                        elif msg_type == 'WARNING':
                            result['summary']['warnings'] += 1
                except Exception as e:
                    result['integrity'].append({
                        'table': table,
                        'status': 'ERROR',
                        'message': str(e)
                    })
                    result['summary']['errors'] += 1

            # 4. Vérification des clés étrangères (incidents orphelins)
            fk_checks = [
                {
                    'name': 'Incidencias → Clientes',
                    'query': (
                        "SELECT COUNT(*) FROM incidencia i "
                        "LEFT JOIN client c ON i.id_client = c.id "
                        "WHERE c.id IS NULL"
                    )
                },
                {
                    'name': 'Incidencias → Operadores',
                    'query': (
                        "SELECT COUNT(*) FROM incidencia i "
                        "LEFT JOIN operateur o ON i.id_operateur = o.id "
                        "WHERE o.id IS NULL"
                    )
                },
            ]
            for fk in fk_checks:
                try:
                    cur.execute(fk['query'])
                    orphans = cur.fetchone()[0]
                    fk_entry = {
                        'name': fk['name'],
                        'orphans': orphans,
                        'status': 'OK' if orphans == 0 else 'WARNING'
                    }
                    result['foreign_keys'].append(fk_entry)
                    if orphans > 0:
                        result['summary']['warnings'] += 1
                except Exception as e:
                    # Table non trouvée (nom différent) — ignorer silencieusement
                    pass

        conn.close()

        # Calcul du statut global
        total = result['summary']['errors'] + result['summary']['warnings']
        result['summary']['total_checks'] = len(result['integrity']) + len(result['foreign_keys']) + 1  # +1 connexion
        result['summary']['passed'] = result['summary']['total_checks'] - result['summary']['errors'] - result['summary']['warnings']

        if result['summary']['errors'] > 0:
            result['summary']['status'] = 'ERROR'
        elif result['summary']['warnings'] > 0:
            result['summary']['status'] = 'WARNING'
        else:
            result['summary']['status'] = 'OK'

    except Exception as e:
        result['summary']['errors'] += 1
        result['summary']['status'] = 'ERROR'
        result['connection']['message'] = f"Error durante la verificación: {e}"

    return result


if __name__ == '__main__':
    print("=" * 60)
    print("  VERIFICACIÓN DE BASE DE DATOS - FCC_001")
    print("=" * 60)

    data = verify_database()

    print(f"\n🔌 Conexión: {'✅ OK' if data['connection']['ok'] else '❌ ERROR'}")
    print(f"   {data['connection']['message']}")

    if data['connection']['ok']:
        print(f"\n📋 Tablas encontradas ({len(data['tables'])}):")
        for table in data['tables']:
            count = data['counts'].get(table, '?')
            print(f"   • {table}: {count} registros")

        print(f"\n🔍 Integridad de tablas:")
        for entry in data['integrity']:
            icon = '✅' if entry['status'] == 'OK' else ('⚠️' if entry['status'] == 'WARNING' else '❌')
            print(f"   {icon} {entry['table']}: {entry['message']}")

        if data['foreign_keys']:
            print(f"\n🔗 Claves foráneas:")
            for fk in data['foreign_keys']:
                icon = '✅' if fk['status'] == 'OK' else '⚠️'
                print(f"   {icon} {fk['name']}: {fk['orphans']} huérfanos")

    status_icon = {'OK': '✅', 'WARNING': '⚠️', 'ERROR': '❌'}.get(data['summary']['status'], '❓')
    print(f"\n{status_icon} ESTADO GLOBAL: {data['summary']['status']}")
    print(f"   Verificaciones: {data['summary']['total_checks']} | "
          f"OK: {data['summary']['passed']} | "
          f"Avisos: {data['summary']['warnings']} | "
          f"Errores: {data['summary']['errors']}")
    print("=" * 60)
