#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎬 DÉMONSTRATION API KIMI K2
============================
Démonstration automatique pour montrer les capacités de l'API.
"""

import json
import urllib.request
import ssl
from datetime import datetime

# Configuration API
API_KEY = "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"
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "moonshotai/kimi-k2"

def call_kimi(message):
    """Appel simple à l'API Kimi K2"""
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": message}],
        "max_tokens": 300,
        "temperature": 0.7
    }
    
    data = json.dumps(payload).encode('utf-8')
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    req = urllib.request.Request(API_URL, data=data, headers=headers)
    
    try:
        context = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=30, context=context) as response:
            if response.getcode() == 200:
                data = json.loads(response.read().decode('utf-8'))
                if "choices" in data and data["choices"]:
                    return data["choices"][0]["message"]["content"]
        return "❌ Erreur de réponse"
    except Exception as e:
        return f"❌ Erreur: {e}"

def demo():
    """Démonstration des capacités"""
    print("🎬 DÉMONSTRATION API KIMI K2")
    print("=" * 50)
    
    tests = [
        {
            "titre": "🧪 Test de connectivité",
            "message": "Dis simplement 'API fonctionne' en français."
        },
        {
            "titre": "🧮 Calcul mathématique",
            "message": "Calcule 127 × 43 et explique le résultat en une phrase."
        },
        {
            "titre": "📊 Analyse de données",
            "message": "Analyse ces chiffres: Ventes janvier: 50k€, février: 65k€, mars: 48k€. Donne une conclusion en 2 phrases."
        },
        {
            "titre": "💻 Génération de code",
            "message": "Écris une fonction Python qui vérifie si un nombre est premier. Code seulement, commentaires en français."
        }
    ]
    
    for i, test in enumerate(tests, 1):
        print(f"\n{test['titre']}")
        print("-" * 40)
        print(f"📤 Question: {test['message']}")
        
        response = call_kimi(test['message'])
        print(f"🤖 Réponse IA:")
        print(f"   {response}")
        
        if i < len(tests):
            print("\n⏳ Test suivant...")
    
    print(f"\n🎉 DÉMONSTRATION TERMINÉE!")
    print("✅ L'API Kimi K2 est pleinement opérationnelle")

if __name__ == "__main__":
    demo()