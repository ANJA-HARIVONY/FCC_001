#!/usr/bin/env python3
"""
Exportación de la base de datos MariaDB a formato .sql compatible con HeidiSQL.
Genera un archivo backup_<YYYYMMDD_HHMMSS>.sql en backups/exports/
"""

import os
import sys
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

EXPORTS_DIR = os.path.join(project_root, 'backups', 'exports')


def escape_value(value):
    """Échappe une valeur pour insertion SQL."""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (datetime,)):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
    # String: échapper les apostrophes et backslashes
    val = str(value)
    val = val.replace('\\', '\\\\')
    val = val.replace("'", "\\'")
    val = val.replace('\n', '\\n')
    val = val.replace('\r', '\\r')
    return f"'{val}'"


def export_database(output_path=None):
    """
    Exporte la base de données complète en .sql compatible HeidiSQL.
    Retourne le chemin du fichier généré ou lève une exception.
    """
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
    except Exception as e:
        raise ConnectionError(f"No se pudo conectar a la base de datos: {e}")

    # Préparer le fichier de sortie
    if not output_path:
        os.makedirs(EXPORTS_DIR, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"backup_{timestamp}.sql"
        output_path = os.path.join(EXPORTS_DIR, filename)

    lines = []

    header = f"""-- ============================================================
-- Base de datos: {DB_NAME}
-- Servidor: {DB_HOST}:{DB_PORT}
-- Exportado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- Compatible con: HeidiSQL / MariaDB
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

"""
    lines.append(header)

    try:
        with conn.cursor() as cur:
            # Lister les tables
            cur.execute("SHOW TABLES")
            tables = [row[0] for row in cur.fetchall()]

            for table in tables:
                lines.append(f"-- ------------------------------------------------------------\n")
                lines.append(f"-- Table: `{table}`\n")
                lines.append(f"-- ------------------------------------------------------------\n\n")

                # DROP + CREATE TABLE
                cur.execute(f"SHOW CREATE TABLE `{table}`")
                create_row = cur.fetchone()
                create_stmt = create_row[1]
                lines.append(f"DROP TABLE IF EXISTS `{table}`;\n")
                lines.append(f"{create_stmt};\n\n")

                # Données
                cur.execute(f"SELECT * FROM `{table}`")
                rows = cur.fetchall()

                if rows:
                    # Noms des colonnes
                    col_names = [desc[0] for desc in cur.description]
                    cols_str = ', '.join(f"`{c}`" for c in col_names)

                    lines.append(f"-- Datos de la tabla `{table}` ({len(rows)} registros)\n")

                    # Insérer par lots de 100 pour compatibilité HeidiSQL
                    batch_size = 100
                    for i in range(0, len(rows), batch_size):
                        batch = rows[i:i + batch_size]
                        values_list = []
                        for row in batch:
                            vals = ', '.join(escape_value(v) for v in row)
                            values_list.append(f"  ({vals})")
                        values_str = ',\n'.join(values_list)
                        lines.append(
                            f"INSERT INTO `{table}` ({cols_str}) VALUES\n{values_str};\n"
                        )

                lines.append("\n")

        lines.append("SET FOREIGN_KEY_CHECKS = 1;\n")
        lines.append(f"-- Fin de la exportación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    finally:
        conn.close()

    # Écrire le fichier
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    return output_path


if __name__ == '__main__':
    print("=" * 60)
    print("  EXPORTACIÓN DE BASE DE DATOS - FCC_001")
    print("=" * 60)
    print(f"\n📦 Base de datos: {DB_NAME}@{DB_HOST}:{DB_PORT}")
    print("⏳ Exportando...")

    try:
        path = export_database()
        size_kb = os.path.getsize(path) / 1024
        print(f"\n✅ Exportación completada:")
        print(f"   📄 Archivo: {path}")
        print(f"   📏 Tamaño: {size_kb:.1f} KB")
        print("\nPuede importar este archivo en HeidiSQL:")
        print("  Archivo > Ejecutar archivo SQL...")
    except Exception as e:
        print(f"\n❌ Error durante la exportación: {e}")
        sys.exit(1)

    print("=" * 60)
