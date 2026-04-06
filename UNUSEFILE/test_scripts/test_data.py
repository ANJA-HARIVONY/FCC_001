#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import app, db, Client, Operateur, Incident
from datetime import datetime

def create_test_data():
    """Crée des données de test pour l'application"""
    
    with app.app_context():
        # Supprimer toutes les données existantes
        db.drop_all()
        db.create_all()
        
        print("🗑️  Suppression des données existantes...")
        
        # Créer des opérateurs
        print("👥 Création des opérateurs...")
        operateur1 = Operateur(nom="Jean Dupont", telephone="0123456789")
        operateur2 = Operateur(nom="Marie Martin", telephone="0987654321")
        operateur3 = Operateur(nom="Pierre Durand", telephone="0147258369")
        
        db.session.add_all([operateur1, operateur2, operateur3])
        db.session.commit()
        
        # Créer des clients avec les nouveaux champs
        print("🏢 Création des clients...")
        client1 = Client(
            nom="Entreprise ABC",
            telephone="0123456789",
            adresse="123 Rue de la Paix",
            ville="Paris",
            ip_router="192.168.1.1",
            ip_antea="192.168.1.100"
        )
        
        client2 = Client(
            nom="Société XYZ",
            telephone="0987654321",
            adresse="456 Avenue des Champs",
            ville="Lyon",
            ip_router="192.168.2.1",
            ip_antea="192.168.2.100"
        )
        
        client3 = Client(
            nom="SARL Tech Solutions",
            telephone="0147258369",
            adresse="789 Boulevard du Commerce",
            ville="Marseille",
            ip_router="10.0.0.1",
            ip_antea="10.0.0.50"
        )
        
        client4 = Client(
            nom="Cabinet Conseil",
            telephone="0369258147",
            adresse="321 Place de la République",
            ville="Toulouse",
            ip_router=None,  # Test avec valeur nulle
            ip_antea=None
        )
        
        db.session.add_all([client1, client2, client3, client4])
        db.session.commit()
        
        # Créer des incidents
        print("🚨 Création des incidents...")
        incidents = [
            Incident(
                id_client=client1.id,
                intitule="Problème de connexion internet",
                observations="Connexion instable depuis ce matin",
                status="En attente",
                id_operateur=operateur1.id,
                date_heure=datetime(2024, 1, 15, 9, 30)
            ),
            Incident(
                id_client=client1.id,
                intitule="Panne serveur mail",
                observations="Serveur mail inaccessible",
                status="Résolut",
                id_operateur=operateur2.id,
                date_heure=datetime(2024, 1, 10, 14, 15)
            ),
            Incident(
                id_client=client2.id,
                intitule="Lenteur réseau",
                observations="Débit très faible constaté",
                status="Bitrix",
                id_operateur=operateur1.id,
                date_heure=datetime(2024, 1, 12, 11, 45)
            ),
            Incident(
                id_client=client3.id,
                intitule="Configuration firewall",
                observations="Besoin d'ouvrir des ports spécifiques",
                status="En attente",
                id_operateur=operateur3.id,
                date_heure=datetime(2024, 1, 14, 16, 20)
            ),
            Incident(
                id_client=client2.id,
                intitule="Mise à jour système",
                observations="Mise à jour de sécurité effectuée",
                status="Résolut",
                id_operateur=operateur2.id,
                date_heure=datetime(2024, 1, 8, 10, 0)
            )
        ]
        
        db.session.add_all(incidents)
        db.session.commit()
        
        print("✅ Données de test créées avec succès !")
        print(f"   - {len([operateur1, operateur2, operateur3])} opérateurs")
        print(f"   - {len([client1, client2, client3, client4])} clients")
        print(f"   - {len(incidents)} incidents")
        
        # Afficher un résumé des clients créés
        print("\n📋 Résumé des clients créés :")
        for client in [client1, client2, client3, client4]:
            print(f"   - {client.nom} ({client.telephone}) - IP Router: {client.ip_router or 'Non définie'}")

if __name__ == "__main__":
    create_test_data() 