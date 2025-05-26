#!/usr/bin/env python3
"""
Script de démarrage pour l'application de gestion des clients
Avec support multilingue (Français, Espagnol, Anglais) et impression PDF
"""

import os
import sys
from app import app, db

def create_tables():
    """Créer les tables de base de données si elles n'existent pas"""
    with app.app_context():
        db.create_all()
        print("✅ Tables de base de données créées/vérifiées")

def check_dependencies():
    """Vérifier que toutes les dépendances sont installées"""
    try:
        import flask_babel
        import weasyprint
        print("✅ Toutes les dépendances sont installées")
        return True
    except ImportError as e:
        print(f"❌ Dépendance manquante: {e}")
        print("Installez les dépendances avec: pip install -r requirements.txt")
        return False

def main():
    """Fonction principale"""
    print("🚀 Démarrage de l'application de gestion des clients")
    print("=" * 60)
    
    # Vérifier les dépendances
    if not check_dependencies():
        sys.exit(1)
    
    # Créer les tables
    create_tables()
    
    # Informations sur l'application
    print("\n📋 Fonctionnalités disponibles:")
    print("   • Gestion des clients, opérateurs et incidents")
    print("   • Support multilingue (Français, Espagnol, Anglais)")
    print("   • Impression de fiches clients en PDF")
    print("   • Statistiques et graphiques")
    
    print("\n🌐 Langues supportées:")
    print("   • 🇫🇷 Français (par défaut)")
    print("   • 🇪🇸 Español")
    print("   • 🇬🇧 English")
    
    print("\n🔗 URLs importantes:")
    print("   • Application: http://localhost:5001")
    print("   • Clients: http://localhost:5001/clients")
    print("   • Incidents: http://localhost:5001/incidents")
    print("   • Opérateurs: http://localhost:5001/operateurs")
    
    print("\n" + "=" * 60)
    print("🎯 L'application démarre sur http://localhost:5001")
    print("   Appuyez sur Ctrl+C pour arrêter")
    print("=" * 60)
    
    # Démarrer l'application
    try:
        app.run(debug=True, host='0.0.0.0', port=5001)
    except KeyboardInterrupt:
        print("\n\n👋 Application arrêtée par l'utilisateur")
    except Exception as e:
        print(f"\n❌ Erreur lors du démarrage: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 