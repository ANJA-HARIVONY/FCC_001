#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 Script de démarrage principal pour FCC_001
Architecture organisée et optimisée
"""

import os
import sys
import subprocess

def main():
    """Lancer l'application avec la nouvelle structure"""
    print("🚀 FCC_001 - Application de Gestion Client")
    print("Architecture organisée v2.0")
    print("=" * 50)
    
    # Vérifier l'environnement virtuel
    if not os.path.exists('.venv'):
        print("❌ Environnement virtuel non trouvé!")
        print("Créez-le avec: python -m venv .venv")
        return 1
    
    # Activer l'environnement et démarrer
    print("🔄 Activation de l'environnement virtuel...")
    if os.name == 'nt':  # Windows
        activate_script = '.venv\\Scripts\\activate.bat'
        python_exe = '.venv\\Scripts\\python.exe'
    else:  # Unix/Linux/Mac
        activate_script = '.venv/bin/activate'
        python_exe = '.venv/bin/python'
    
    print("⚡ Démarrage de l'application...")
    
    # Ajouter core au path et lancer
    sys.path.insert(0, 'core')
    
    try:
        import subprocess
        # Auto-installation des dépendances si Flask manque
        try:
            import flask
        except ImportError:
            print("📦 Installation automatique de Flask...")
            subprocess.run([python_exe, '-m', 'pip', 'install', '--no-cache-dir', 'flask', 'flask-sqlalchemy', 'flask-babel'], check=True)
            print("✅ Flask installé!")
        
        from core.app import app
        print("✅ Application chargée avec succès")
        print("🌐 Accès: http://localhost:5001")
        print("📱 Interface multilingue (FR/ES/EN)")
        print("🔧 Mode debug activé")
        print("\nAppuyez sur Ctrl+C pour arrêter")
        
        app.run(debug=True, port=5001, host='0.0.0.0')
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("Solution manuelle:")
        print("  .venv\\Scripts\\activate")
        print("  pip install flask flask-sqlalchemy flask-babel")
        print("  python start_app.py")
        return 1
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())