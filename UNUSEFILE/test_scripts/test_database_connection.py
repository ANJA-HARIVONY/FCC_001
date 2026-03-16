#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test pour vérifier la connexion à la base de données
et afficher des exemples d'observations à nettoyer
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    observations = db.Column(db.Text)
    intitule = db.Column(db.String(200))

def test_connection():
    """
    Test de connexion à la base de données
    """
    print("🔌 Test de connexion à la base de données...")
    
    try:
        with app.app_context():
            # Test de connexion simple
            result = db.session.execute(db.text("SELECT 1")).fetchone()
            if result:
                print("✅ Connexion à la base de données réussie!")
                return True
            else:
                print("❌ Problème de connexion à la base de données")
                return False
    except Exception as e:
        print(f"❌ Erreur de connexion: {str(e)}")
        return False

def show_database_info():
    """
    Affiche des informations sur la base de données
    """
    print("\n📊 Informations sur la base de données:")
    
    with app.app_context():
        try:
            # Compter les incidents
            total_incidents = Incident.query.count()
            print(f"   📋 Total d'incidents: {total_incidents}")
            
            # Compter les incidents avec observations
            incidents_with_obs = Incident.query.filter(
                Incident.observations.isnot(None),
                Incident.observations != ''
            ).count()
            print(f"   📝 Incidents avec observations: {incidents_with_obs}")
            
            # Compter les incidents avec le pattern Bitrix
            bitrix_pattern = "Incident migré depuis CSV. Bitrix: "
            bitrix_incidents = Incident.query.filter(
                Incident.observations.like(f'%{bitrix_pattern}%')
            ).count()
            print(f"   🎯 Incidents avec pattern Bitrix: {bitrix_incidents}")
            
        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")

def show_examples():
    """
    Affiche quelques exemples d'observations
    """
    print("\n📋 Exemples d'observations à nettoyer:")
    
    with app.app_context():
        try:
            # Chercher des exemples avec le pattern Bitrix
            bitrix_pattern = "Incident migré depuis CSV. Bitrix: "
            examples = Incident.query.filter(
                Incident.observations.like(f'%{bitrix_pattern}%')
            ).limit(5).all()
            
            if examples:
                print("-" * 60)
                for i, incident in enumerate(examples, 1):
                    print(f"\n{i}. Incident ID: {incident.id}")
                    print(f"   Intitulé: {incident.intitule}")
                    print(f"   Observation: {incident.observations}")
                    
                    # Montrer ce que donnerait le nettoyage
                    import re
                    match = re.search(r'Incident migré depuis CSV\. Bitrix: (\d+)', incident.observations)
                    if match:
                        cleaned = match.group(1)
                        print(f"   → Après nettoyage: {cleaned}")
                    print("-" * 60)
            else:
                print("   ℹ️  Aucun exemple trouvé avec le pattern Bitrix")
                
                # Montrer d'autres exemples d'observations
                other_examples = Incident.query.filter(
                    Incident.observations.isnot(None),
                    Incident.observations != ''
                ).limit(3).all()
                
                if other_examples:
                    print("\n📋 Autres exemples d'observations:")
                    for i, incident in enumerate(other_examples, 1):
                        print(f"\n{i}. ID {incident.id}: {incident.observations[:100]}...")
                
        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")

def main():
    """
    Fonction principale de test
    """
    print("=" * 60)
    print("🧪 TEST DE CONNEXION ET ANALYSE DES DONNÉES")
    print("=" * 60)
    print()
    print("Ce script vérifie:")
    print("• La connexion à la base de données")
    print("• Les statistiques des observations")
    print("• Des exemples d'observations à nettoyer")
    print()
    
    # Test de connexion
    if not test_connection():
        print("\n❌ Impossible de se connecter à la base de données.")
        print("Vérifiez votre configuration dans config.py")
        return
    
    # Informations sur la base
    show_database_info()
    
    # Exemples
    show_examples()
    
    print("\n" + "=" * 60)
    print("✅ Test terminé!")
    print("=" * 60)
    print("\n💡 Prochaines étapes:")
    print("1. Si des incidents Bitrix sont trouvés, utilisez les scripts de nettoyage")
    print("2. Commencez par 'clean_observations_advanced.py' pour une première fois")
    print("3. Utilisez 'quick_clean_bitrix.py' pour les exécutions rapides")

if __name__ == "__main__":
    main() 