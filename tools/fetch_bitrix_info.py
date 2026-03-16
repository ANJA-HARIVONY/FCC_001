#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interaction avec Bitrix24 - Point 8 du PROMPT
Récupère l'état de la tarea et le responsable depuis Bitrix24 pour les incidents avec ref_bitrix.
Affiche les informations dans la console.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'core'))

# Charger les variables d'environnement
from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

# Statuts Bitrix24 (tasks.task.get) - en español
STATUS_LABELS = {
    '2': 'En espera de ejecución',
    '3': 'En curso',
    '4': 'En espera de control',
    '5': 'Terminada',
    '6': 'Aplazada',
}


def get_bitrix_task_info(api_base_url: str, task_id: str) -> dict | None:
    """
    Appelle l'API Bitrix24 tasks.task.get pour récupérer les infos d'une tâche.
    Retourne un dict avec status, status_label, responsible_id, responsible_name ou None en cas d'erreur.
    """
    try:
        import urllib.request
        import json

        url = f"{api_base_url.rstrip('/')}/tasks.task.get"
        payload = {
            "taskId": int(task_id),
            "select": ["ID", "TITLE", "STATUS", "REAL_STATUS", "RESPONSIBLE_ID", "RESPONSIBLE"]
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode('utf-8'))

        if 'error' in result:
            return {'error': result.get('error_description', result.get('error', 'Erreur inconnue'))}

        task_data = result.get('result', {}).get('task', {})
        if not task_data:
            return {'error': 'Tâche non trouvée ou accès refusé'}

        # API Bitrix retourne camelCase (status, responsibleId, responsible)
        status = str(task_data.get('status', task_data.get('realStatus', task_data.get('STATUS', ''))))
        status_label = STATUS_LABELS.get(status, f'Statut {status}')
        responsible_id = task_data.get('responsibleId', task_data.get('RESPONSIBLE_ID', ''))
        responsible = task_data.get('responsible', {})
        responsible_name = responsible.get('name', '') if isinstance(responsible, dict) else str(responsible)

        # Si pas de nom dans responsible, afficher l'ID
        if not responsible_name and responsible_id:
            responsible_name = f"ID: {responsible_id}"

        title = task_data.get('title', task_data.get('TITLE', ''))

        return {
            'status': status,
            'status_label': status_label,
            'responsible_id': responsible_id,
            'responsible_name': responsible_name or '(non défini)',
            'title': title,
        }
    except Exception as e:
        return {'error': str(e)}


def main():
    api_url = os.environ.get('BITRIX24_API', '').strip()
    if not api_url:
        print("ERREUR: Variable BITRIX24_API absente dans .env")
        sys.exit(1)

    lines = []
    lines.append("=" * 70)
    lines.append("INTERACTION BITRIX24 - Etat et responsable des taches")
    lines.append("=" * 70)
    lines.append(f"API: {api_url}")
    lines.append("")

    try:
        from core.app import app
        from core.app import Incident
    except ImportError as e:
        lines.append(f"ERREUR import: {e}")
        print("\n".join(lines))
        sys.exit(1)

    with app.app_context():
        incidents = Incident.query.filter(
            Incident.status == 'Bitrix',
            Incident.ref_bitrix.isnot(None),
            Incident.ref_bitrix != ''
        ).order_by(Incident.id.desc()).limit(20).all()

        if not incidents:
            lines.append("Aucun incident Bitrix avec ref_bitrix trouve.")
            output = "\n".join(lines)
            print(output)
            (ROOT / "monitoring" / "logs").mkdir(parents=True, exist_ok=True)
            (ROOT / "monitoring" / "logs" / "bitrix_fetch_output.txt").write_text(output, encoding="utf-8")
            sys.exit(0)

        lines.append(f"Incidents Bitrix avec ref_bitrix: {len(incidents)} (limite 20)\n")

        for inc in incidents:
            ref = inc.ref_bitrix.strip()
            titre_inc = (inc.intitule or '')[:50]
            if len(inc.intitule or '') > 50:
                titre_inc += '...'
            lines.append(f"--- Incident #{inc.id} | ref_bitrix: {ref} | {titre_inc}")
            info = get_bitrix_task_info(api_url, ref)
            if 'error' in info:
                lines.append(f"  [X] Erreur: {info['error']}")
            else:
                lines.append(f"  Etat de la tarea: {info['status_label']} (code: {info['status']})")
                lines.append(f"  Responsable: {info['responsible_name']}")
                if info.get('title'):
                    t = info['title'][:60]
                    if len(info['title']) > 60:
                        t += '...'
                    lines.append(f"  Titre Bitrix: {t}")
            lines.append("")

        lines.append("=" * 70)
        lines.append("Termine.")

    output = "\n".join(lines)
    print(output)
    (ROOT / "monitoring" / "logs").mkdir(parents=True, exist_ok=True)
    (ROOT / "monitoring" / "logs" / "bitrix_fetch_output.txt").write_text(output, encoding="utf-8")


if __name__ == '__main__':
    main()
