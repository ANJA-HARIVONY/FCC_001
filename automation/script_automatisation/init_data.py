#!/usr/bin/env python3
"""
Script d'initialisation des données de test pour l'application de gestion client
"""

from app import app, db, Client, Operateur, Incident
from datetime import datetime, timedelta
import random

def init_test_data():
    """Initialise la base de données avec des données de test"""
    
    with app.app_context():
        # Créer les tables si elles n'existent pas
        db.create_all()
        
        # Vérifier si des données existent déjà
        if Client.query.first():
            print("Des données existent déjà dans la base de données.")
            return
        
        print("Initialisation des données de test...")
        
        # Créer des clients de test
        clients = [
            Client(
                nom="TELMA Antananarivo",
                contact="contact@telma.mg",
                adresse="67 Rue Rainandriamampandry",
                ville="Antananarivo",
                ip_router="192.168.1.1",
                ip_antea="192.168.1.10"
            ),
            Client(
                nom="Orange Madagascar",
                contact="support@orange.mg",
                adresse="Immeuble Orange Ankorondrano",
                ville="Antananarivo",
                ip_router="192.168.2.1",
                ip_antea="192.168.2.10"
            ),
            Client(
                nom="Airtel Madagascar",
                contact="service@airtel.mg",
                adresse="Lot II M 85 Antaninarenina",
                ville="Antananarivo",
                ip_router="192.168.3.1",
                ip_antea="192.168.3.10"
            ),
            Client(
                nom="Blueline Fianarantsoa",
                contact="admin@blueline.mg",
                adresse="Avenue de l'Indépendance",
                ville="Fianarantsoa",
                ip_router="192.168.4.1",
                ip_antea="192.168.4.10"
            ),
            Client(
                nom="Gulfsat Toamasina",
                contact="tech@gulfsat.mg",
                adresse="Boulevard Joffre",
                ville="Toamasina",
                ip_router="192.168.5.1",
                ip_antea="192.168.5.10"
            )
        ]
        
        for client in clients:
            db.session.add(client)
        
        # Créer des opérateurs de test
        operateurs = [
            Operateur(nom="Jean Rakoto", telephone="+261 34 12 345 67"),
            Operateur(nom="Marie Razafy", telephone="+261 33 98 765 43"),
            Operateur(nom="Paul Andry", telephone="+261 32 55 123 89"),
            Operateur(nom="Sophie Rabe", telephone="+261 34 77 456 12")
        ]
        
        for operateur in operateurs:
            db.session.add(operateur)
        
        # Sauvegarder pour obtenir les IDs
        db.session.commit()
        
        # Créer des incidents de test
        statuts = ['En attente', 'Résolut', 'Bitrix']
        intitules = [
            "Perte de connexion internet",
            "Problème de routage",
            "Latence élevée sur le réseau",
            "Coupure intermittente",
            "Configuration firewall",
            "Mise à jour firmware",
            "Problème DNS",
            "Saturation bande passante",
            "Défaillance équipement",
            "Maintenance préventive"
        ]
        
        observations = [
            "Client signale une coupure depuis ce matin",
            "Problème résolu après redémarrage du routeur",
            "Intervention technique nécessaire sur site",
            "Configuration mise à jour avec succès",
            "Problème lié à la météo, résolu automatiquement",
            "Maintenance programmée effectuée",
            "Ticket transféré vers l'équipe réseau",
            "Client satisfait de la résolution",
            "Suivi nécessaire dans 24h",
            "Problème récurrent, investigation en cours"
        ]
        
        # Créer des incidents sur les 30 derniers jours
        for i in range(25):
            date_incident = datetime.now() - timedelta(days=random.randint(0, 30))
            
            incident = Incident(
                id_client=random.choice(clients).id,
                intitule=random.choice(intitules),
                observations=random.choice(observations),
                status=random.choice(statuts),
                id_operateur=random.choice(operateurs).id,
                date_heure=date_incident
            )
            db.session.add(incident)
        
        db.session.commit()
        
        print("✅ Données de test créées avec succès !")
        print(f"   - {len(clients)} clients")
        print(f"   - {len(operateurs)} opérateurs") 
        print(f"   - 25 incidents")
        print("\nVous pouvez maintenant tester l'application avec ces données.")

if __name__ == "__main__":
    init_test_data() 