#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute la colonne ref_bitrix a la table incident (MariaDB/MySQL)
A executer AVANT de demarrer l'application si l'erreur "Unknown column ref_bitrix" apparait
"""
import os
import sys
from pathlib import Path

# Charger .env si present
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env')
except ImportError:
    pass

def add_column():
    try:
        import pymysql
    except ImportError:
        print("Installez pymysql: pip install pymysql")
        return 1

    host = os.environ.get('DB_HOST', 'localhost')
    port = int(os.environ.get('DB_PORT', '3306'))
    db_name = os.environ.get('DB_NAME', 'fcc_001_db')
    user = os.environ.get('DB_USER', 'root')
    password = os.environ.get('DB_PASSWORD', 'toor')

    try:
        conn = pymysql.connect(
            host=host, port=port, user=user, password=password,
            database=db_name, charset='utf8mb4'
        )
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL")
        conn.commit()
        conn.close()
        print("Colonne ref_bitrix ajoutee avec succes.")
        return 0
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1060:  # Duplicate column name
            print("La colonne ref_bitrix existe deja.")
            return 0
        print(f"Erreur: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(add_column())
