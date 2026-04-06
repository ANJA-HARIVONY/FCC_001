#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("🧪 TEST FINAL DE L'APPLICATION")
print("=" * 40)

try:
    from app import app, db, Client, Operateur, Incident
    
    with app.app_context():
        # Compter les données
        clients_count = Client.query.count()
        operateurs_count = Operateur.query.count() 
        incidents_count = Incident.query.count()
        
        print(f"📊 DONNÉES DANS LA BASE:")
        print(f"   👥 Clients: {clients_count}")
        print(f"   🛠️  Opérateurs: {operateurs_count}")
        print(f"   🎫 Incidents: {incidents_count}")
        
        if clients_count > 0:
            print(f"\n✅ SUCCÈS: {clients_count} clients trouvés")
            
            # Tester la page d'accueil
            with app.test_client() as client:
                response = client.get('/')
                if response.status_code == 200:
                    print(f"   🌐 Page d'accueil: ✅ OK (HTTP 200)")
                    print(f"\n🎉 L'APPLICATION FONCTIONNE CORRECTEMENT!")
                    print(f"✅ Les données sont maintenant visibles")
                    print(f"🌐 Ouvrez http://localhost:5001")
                else:
                    print(f"   ❌ Erreur page: HTTP {response.status_code}")
        else:
            print(f"\n❌ Base de données toujours vide")
            
except Exception as e:
    print(f"❌ Erreur: {e}") 