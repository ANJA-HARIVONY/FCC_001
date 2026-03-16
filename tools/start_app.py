#!/usr/bin/env python3
"""
Script de démarrage simple pour l'application de gestion des clients
Version macOS compatible
"""

import os
import sys

def main():
    print("🚀 Application de Gestion Client")
    print("=" * 50)
    
    try:
        # Import et test de l'application depuis core/
        print("📦 Chargement des modules depuis core/...")
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))
        from app import app, db
        print("✅ Modules chargés avec succès")
        
        # Création des tables
        print("🗄️  Initialisation de la base de données...")
        with app.app_context():
            db.create_all()
        print("✅ Base de données initialisée")
        
        # Informations
        print("\n🌟 Fonctionnalités disponibles:")
        print("   • Support multilingue (FR/ES/EN)")
        print("   • Gestion clients, opérateurs, incidents")
        print("   • Dashboard avec graphiques")
        print("   • Impression HTML optimisée")
        
        print("\n🌐 Accès à l'application:")
        print("   http://localhost:5001")
        
        print("\n" + "=" * 50)
        print("🎯 Démarrage du serveur...")
        print("   Appuyez sur Ctrl+C pour arrêter")
        print("=" * 50)
        
        # Démarrage du serveur
        app.run(
            debug=True,
            host='0.0.0.0',
            port=5001,
            use_reloader=False  # Évite les problèmes de double démarrage
        )
        
    except KeyboardInterrupt:
        print("\n\n👋 Application arrêtée par l'utilisateur")
        
    except ImportError as e:
        print(f"\n❌ Erreur d'import: {e}")
        print("💡 Solution: pip install -r requirements.txt")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        print("💡 Consultez le guide INSTALL_MACOS.md")
        sys.exit(1)

if __name__ == '__main__':
    main() 