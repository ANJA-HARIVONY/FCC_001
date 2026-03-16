#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🧪 PROGRAMME DE TEST API KIMI K2
=================================
Programme simple pour tester l'API Kimi K2 par vous-même.

Utilisation:
    python test_kimi.py
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import ssl
from datetime import datetime

# ✅ Configuration API validée
API_KEY = "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"
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "moonshotai/kimi-k2"

def test_kimi_api(message):
    """
    Envoie un message à l'API Kimi K2 et retourne la réponse
    
    Args:
        message (str): Votre message à envoyer à l'IA
        
    Returns:
        str: Réponse de l'IA ou message d'erreur
    """
    print(f"📤 Envoi du message: {message}")
    
    # Préparer la requête
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": message
            }
        ],
        "max_tokens": 500,
        "temperature": 0.7
    }
    
    data = json.dumps(payload).encode('utf-8')
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    req = urllib.request.Request(API_URL, data=data, headers=headers)
    
    try:
        # Envoyer la requête
        context = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=30, context=context) as response:
            if response.getcode() == 200:
                response_data = json.loads(response.read().decode('utf-8'))
                
                if "choices" in response_data and len(response_data["choices"]) > 0:
                    ai_response = response_data["choices"][0]["message"]["content"]
                    
                    # Afficher les informations de consommation
                    if "usage" in response_data:
                        usage = response_data["usage"]
                        tokens = usage.get('total_tokens', 'N/A')
                        print(f"📊 Tokens utilisés: {tokens}")
                    
                    return ai_response
                else:
                    return "❌ Erreur: Aucune réponse reçue"
            else:
                return f"❌ Erreur HTTP: {response.getcode()}"
                
    except Exception as e:
        return f"❌ Erreur: {str(e)}"

def menu_principal():
    """Menu principal interactif"""
    print("🤖 TESTEUR API KIMI K2")
    print("=" * 40)
    print("1. Test rapide")
    print("2. Poser une question personnalisée")
    print("3. Test d'analyse de données")
    print("4. Test de génération de code")
    print("5. Quitter")
    print("-" * 40)
    
    while True:
        try:
            choix = input("👉 Votre choix (1-5): ").strip()
            
            if choix == "1":
                test_rapide()
            elif choix == "2":
                test_personnalise()
            elif choix == "3":
                test_analyse()
            elif choix == "4":
                test_code()
            elif choix == "5":
                print("👋 Au revoir !")
                break
            else:
                print("❌ Choix invalide, veuillez choisir entre 1 et 5")
                
        except KeyboardInterrupt:
            print("\n👋 Programme interrompu par l'utilisateur")
            break
        except Exception as e:
            print(f"❌ Erreur: {e}")

def test_rapide():
    """Test de connectivité rapide"""
    print("\n🧪 TEST RAPIDE DE CONNECTIVITÉ")
    print("-" * 40)
    
    message = "Salut ! Confirme-moi que tu fonctionnes en disant 'API OK' en français."
    response = test_kimi_api(message)
    
    print(f"🤖 Réponse IA:")
    print(f"   {response}")
    print()

def test_personnalise():
    """Test avec question personnalisée"""
    print("\n💬 QUESTION PERSONNALISÉE")
    print("-" * 40)
    
    question = input("❓ Votre question: ").strip()
    if question:
        response = test_kimi_api(question)
        print(f"\n🤖 Réponse IA:")
        print(f"   {response}")
    else:
        print("❌ Question vide")
    print()

def test_analyse():
    """Test d'analyse de données"""
    print("\n📊 TEST D'ANALYSE DE DONNÉES")
    print("-" * 40)
    
    message = """
Analyse ces données de ventes et donne-moi un résumé en français :

DONNÉES Q1 2025:
- Ventes totales: 150,000€
- Nombre de commandes: 450
- Panier moyen: 333€
- Retours: 5%
- Nouveaux clients: 180
- Clients fidèles: 270

Donne-moi un point positif, un point d'attention et une recommandation.
"""
    
    response = test_kimi_api(message)
    print(f"🤖 Analyse IA:")
    print(f"   {response}")
    print()

def test_code():
    """Test de génération de code"""
    print("\n💻 TEST DE GÉNÉRATION DE CODE")
    print("-" * 40)
    
    message = """
Écris-moi une fonction Python simple qui :
1. Calcule la moyenne d'une liste de nombres
2. Gère les cas d'erreur (liste vide)
3. Retourne le résultat avec 2 décimales

Donne le code avec des commentaires en français.
"""
    
    response = test_kimi_api(message)
    print(f"🤖 Code généré:")
    print(response)
    print()

def test_automatique():
    """Série de tests automatiques"""
    print("🔄 TESTS AUTOMATIQUES")
    print("=" * 40)
    
    tests = [
        "Dis 'Test 1 OK' en français",
        "Calcule 15 + 27 et explique",
        "Que peux-tu faire pour moi ?",
        "Écris un haiku sur la programmation"
    ]
    
    for i, test in enumerate(tests, 1):
        print(f"\n📝 Test {i}: {test}")
        response = test_kimi_api(test)
        print(f"✅ Réponse: {response[:100]}{'...' if len(response) > 100 else ''}")
    
    print("\n🎉 Tous les tests automatiques terminés !")

if __name__ == "__main__":
    print("🚀 PROGRAMME DE TEST API KIMI K2")
    print("=" * 50)
    print(f"🔑 API: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"🤖 Modèle: {MODEL}")
    print(f"📡 Endpoint: {API_URL}")
    print()
    
    # Offrir le choix du mode
    print("Choisissez le mode de test:")
    print("1. Mode interactif (menu)")
    print("2. Tests automatiques")
    
    try:
        mode = input("👉 Votre choix (1 ou 2): ").strip()
        print()
        
        if mode == "1":
            menu_principal()
        elif mode == "2":
            test_automatique()
        else:
            print("Mode invalide, lancement du mode interactif...")
            menu_principal()
            
    except KeyboardInterrupt:
        print("\n👋 Programme interrompu")
    except Exception as e:
        print(f"❌ Erreur: {e}")