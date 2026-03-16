#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de diagnostic pour tester la connexion Bitrix24.
Affiche l'erreur détaillée en cas de 401.
"""
import os
import json
import urllib.request
from urllib.error import HTTPError, URLError
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

API_URL = os.environ.get('BITRIX24_API', '').strip()
# ID de tâche de test (remplacez par une ref_bitrix valide de votre Bitrix24)
TASK_ID = 82129

def test_bitrix():
    if not API_URL:
        print("ERREUR: BITRIX24_API absent dans .env")
        return
    print(f"URL: {API_URL}")
    print(f"Test avec taskId: {TASK_ID}")
    print("-" * 50)
    url = f"{API_URL.rstrip('/')}/tasks.task.get"
    payload = {"taskId": TASK_ID, "select": ["ID", "TITLE", "STATUS"]}
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data,
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        print("OK! Reponse:", json.dumps(result, indent=2, ensure_ascii=False)[:500])
    except HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        try:
            body = e.read().decode('utf-8', errors='ignore')
            print("Corps reponse:", body)
            data = json.loads(body)
            if 'error' in data:
                print(f"  error: {data.get('error')}")
            if 'error_description' in data:
                print(f"  error_description: {data.get('error_description')}")
        except Exception as ex:
            print("  (impossible de lire le corps)", ex)
        if e.code == 401:
            print("\n>>> SOLUTION: Creer un webhook dans Bitrix24:")
            print("    1. Applications > Developer resources > Incoming webhook")
            print("    2. Cocher la permission TACHES (tasks)")
            print("    3. Copier la nouvelle URL dans .env (BITRIX24_API)")
    except URLError as e:
        print("Erreur reseau:", e.reason)
    except Exception as e:
        print("Erreur:", e)

if __name__ == '__main__':
    test_bitrix()
