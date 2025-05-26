#!/usr/bin/env python3
"""
Script de test pour l'application
"""

try:
    print("🔄 Chargement de l'application...")
    from app import app, db
    print("✅ Application chargée avec succès")
    
    print("🔄 Test de création des tables...")
    with app.app_context():
        db.create_all()
        print("✅ Tables créées avec succès")
    
    print("🔄 Test de démarrage du serveur...")
    print("🌐 L'application va démarrer sur http://localhost:5001")
    print("   Appuyez sur Ctrl+C pour arrêter")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc() 