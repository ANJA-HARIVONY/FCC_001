#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔍 Analyse des Références Bitrix dans la Base de Données FCC_001
Étape 7 - Vérification des incidents avec status Bitrix et ref à 5 chiffres dans observations
"""

import os
import sys
import re
import json
from datetime import datetime
from pathlib import Path

# Ajouter le répertoire racine et core au path (comme start_app.py)
ROOT_DIR = Path(__file__).resolve().parent.parent
CORE_DIR = ROOT_DIR / 'core'
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(CORE_DIR))

# Pattern pour extraire une référence Bitrix (5 chiffres exactement)
REF_BITRIX_PATTERN = re.compile(r'\b(\d{5})\b')


def extract_bitrix_ref(observations):
    """
    Extrait la référence Bitrix (5 chiffres) du champ observations.
    Retourne: (ref ou None, is_exact_match)
    - is_exact_match: True si observations est exactement les 5 chiffres (ex: "58313")
    """
    if not observations or not str(observations).strip():
        return None, False
    
    obs = str(observations).strip()
    matches = REF_BITRIX_PATTERN.findall(obs)
    
    if not matches:
        return None, False
    
    # Si une seule séquence de 5 chiffres
    if len(matches) == 1:
        ref = matches[0]
        is_exact = obs == ref  # observations = "58313" exactement
        return ref, is_exact
    
    # Plusieurs séquences de 5 chiffres - ambiguïté
    return matches[0], False  # On prend la première par défaut


def analyze_bitrix_incidents():
    """Analyse les incidents Bitrix dans la base de données"""
    
    print("=" * 60)
    print("[ANALYSE] REFERENCES BITRIX - ETAPE 7")
    print("=" * 60)
    
    # Connexion via l'application Flask
    try:
        from core.app import app, db
        from core.app import Incident
    except ImportError as e:
        print(f"Erreur d'import: {e}")
        print("💡 Exécutez depuis la racine du projet: python tools/analyze_bitrix_ref.py")
        return None
    
    with app.app_context():
        # Compter les incidents Bitrix
        incidents_bitrix = Incident.query.filter_by(status='Bitrix').all()
        total_bitrix = len(incidents_bitrix)
        
        if total_bitrix == 0:
            print("\n[!] Aucun incident avec status 'Bitrix' trouve dans la base.")
            return {
                'total_bitrix': 0,
                'avec_ref_5_chiffres': 0,
                'sans_ref': 0,
                'ref_dans_texte': 0,
                'ambigu': 0,
                'exemples': []
            }
        
        print(f"\n[RESULTATS] {total_bitrix} incidents avec status Bitrix")
        print("-" * 60)
        
        # Catégoriser les incidents
        avec_ref_exacte = []      # observations = "58313" exactement
        avec_ref_dans_texte = []  # ref trouvée dans un texte plus long
        sans_ref = []             # pas de 5 chiffres
        ambigu = []               # plusieurs séquences de 5 chiffres
        
        for inc in incidents_bitrix:
            ref, is_exact = extract_bitrix_ref(inc.observations)
            
            if ref is None:
                sans_ref.append({
                    'id': inc.id,
                    'intitule': inc.intitule[:50],
                    'observations': (inc.observations or '')[:80]
                })
            elif is_exact:
                avec_ref_exacte.append({
                    'id': inc.id,
                    'ref_bitrix': ref,
                    'intitule': inc.intitule[:50]
                })
            else:
                # Vérifier s'il y a plusieurs refs
                matches = REF_BITRIX_PATTERN.findall(str(inc.observations or ''))
                if len(matches) > 1:
                    ambigu.append({
                        'id': inc.id,
                        'refs': matches,
                        'observations': (inc.observations or '')[:80]
                    })
                else:
                    avec_ref_dans_texte.append({
                        'id': inc.id,
                        'ref_bitrix': ref,
                        'intitule': inc.intitule[:50],
                        'observations': (inc.observations or '')[:80]
                    })
        
        # Résumé
        nb_exact = len(avec_ref_exacte)
        nb_dans_texte = len(avec_ref_dans_texte)
        nb_sans = len(sans_ref)
        nb_ambigu = len(ambigu)
        
        print(f"[OK] Avec ref exacte (observations = 5 chiffres): {nb_exact}")
        print(f"[OK] Avec ref dans le texte: {nb_dans_texte}")
        print(f"[!] Sans reference Bitrix: {nb_sans}")
        print(f"[!] Ambigu (plusieurs refs): {nb_ambigu}")
        print()
        
        # Détail des sans ref (max 10)
        if sans_ref:
            print("Exemples d'incidents Bitrix SANS reference (5 premiers):")
            for item in sans_ref[:5]:
                obs_preview = (item['observations'] or '(vide)')[:60]
                print(f"   - ID {item['id']}: {item['intitule']} | obs: {obs_preview}")
            print()
        
        # Vérifier si la correction est possible
        print("VIABILITE DE LA CORRECTION")
        print("-" * 60)
        extractibles = nb_exact + nb_dans_texte
        if extractibles > 0:
            print(f"[OK] Correction POSSIBLE: {extractibles} refs peuvent etre extraites vers ref_bitrix")
        if nb_sans > 0:
            print(f"[!] {nb_sans} incidents resteront sans ref_bitrix (a completer manuellement)")
        if nb_ambigu > 0:
            print(f"[!] {nb_ambigu} incidents ambigus - prendre la 1ere ref ou verifier manuellement")
        
        result = {
            'date_analyse': datetime.now().isoformat(),
            'total_bitrix': total_bitrix,
            'avec_ref_exacte': nb_exact,
            'avec_ref_dans_texte': nb_dans_texte,
            'sans_ref': nb_sans,
            'ambigu': nb_ambigu,
            'extractibles': extractibles,
            'correction_possible': extractibles > 0,
            'exemples_sans_ref': sans_ref[:10],
            'exemples_avec_ref': (avec_ref_exacte + avec_ref_dans_texte)[:5]
        }
        
        return result


def save_report(result, output_dir=None):
    """Sauvegarde le rapport JSON"""
    if not result:
        return None
    
    output_dir = output_dir or ROOT_DIR / 'monitoring' / 'logs'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filepath = output_dir / f'bitrix_ref_report_{timestamp}.json'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nRapport JSON sauvegarde: {filepath}")
    return filepath


def main():
    result = analyze_bitrix_incidents()
    if result:
        save_report(result)
    return 0 if result else 1


if __name__ == '__main__':
    sys.exit(main())
