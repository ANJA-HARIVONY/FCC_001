#!/usr/bin/env python3
"""
Utilitaire pour ajouter des incidents de test avec des heures variées
Usage: python3 utils/add_test_incidents.py [nombre_jours]
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db, Client, Operateur, Incident
from datetime import datetime, timedelta
import random

def add_test_incidents(nb_jours=7):
    """Ajoute des incidents de test sur plusieurs jours avec des heures variées"""
    
    with app.app_context():
        clients = Client.query.all()
        operateurs = Operateur.query.all()
        
        if not clients or not operateurs:
            print("❌ Aucun client ou opérateur trouvé. Exécutez d'abord init_data.py")
            return
        
        print(f"📊 Ajout d'incidents de test sur {nb_jours} jours...")
        
        intitules = [
            "Coupure réseau",
            "Lenteur connexion",
            "Problème routage",
            "Maintenance",
            "Panne équipement",
            "Configuration",
            "Mise à jour",
            "Incident sécurité",
            "Problème DNS",
            "Saturation réseau"
        ]
        
        statuts = ['En attente', 'Résolut', 'Bitrix']
        heures_bureau = [8, 9, 10, 11, 14, 15, 16, 17, 18]
        
        incidents_ajoutes = 0
        
        for jour in range(nb_jours):
            date_jour = datetime.now().date() - timedelta(days=jour)
            
            # Nombre d'incidents par jour (2-8)
            nb_incidents_jour = random.randint(2, 8)
            
            for _ in range(nb_incidents_jour):
                heure = random.choice(heures_bureau)
                minute = random.randint(0, 59)
                
                date_incident = datetime.combine(
                    date_jour, 
                    datetime.min.time().replace(hour=heure, minute=minute)
                )
                
                incident = Incident(
                    id_client=random.choice(clients).id,
                    intitule=random.choice(intitules),
                    observations=f"Incident de test - {date_incident.strftime('%d/%m/%Y %H:%M')}",
                    status=random.choice(statuts),
                    id_operateur=random.choice(operateurs).id,
                    date_heure=date_incident
                )
                db.session.add(incident)
                incidents_ajoutes += 1
        
        db.session.commit()
        
        print(f"✅ {incidents_ajoutes} incidents de test ajoutés avec succès !")
        print("🌐 Rechargez http://localhost:5001 pour voir les nouveaux graphiques")

if __name__ == "__main__":
    nb_jours = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    add_test_incidents(nb_jours) 