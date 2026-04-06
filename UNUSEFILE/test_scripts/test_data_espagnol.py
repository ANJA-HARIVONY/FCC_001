#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour créer des données de test avec statuts en espagnol
Système de gestion de clients CONNEXIA
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client, Operateur, Incident
from datetime import datetime, timedelta
import random

def create_test_data():
    """Créer des données de test avec statuts en espagnol"""
    
    with app.app_context():
        print("🧪 Création de données de test avec statuts espagnols...")
        
        # Vérifier si des données existent déjà
        if Client.query.count() == 0:
            print("📝 Création des clients...")
            # Créer des clients
            clients = [
                Client(nom="EMPRESA TECNOLÓGICA SA", telephone="555-0101", adresse="Av. Principal 123", ville="Madrid", ip_router="192.168.1.1", ip_antea="10.0.0.1"),
                Client(nom="COMERCIAL HISPANA SL", telephone="555-0102", adresse="Calle Mayor 45", ville="Barcelona", ip_router="192.168.1.2", ip_antea="10.0.0.2"),
                Client(nom="SERVICIOS INTEGRALES", telephone="555-0103", adresse="Plaza Central 67", ville="Valencia", ip_router="192.168.1.3", ip_antea="10.0.0.3"),
                Client(nom="INDUSTRIAS DEL SUR", telephone="555-0104", adresse="Polígono Industrial 89", ville="Sevilla", ip_router="192.168.1.4", ip_antea="10.0.0.4"),
                Client(nom="CONSULTORA NORTE", telephone="555-0105", adresse="Edificio Empresarial 12", ville="Bilbao", ip_router="192.168.1.5", ip_antea="10.0.0.5"),
            ]
            
            for client in clients:
                db.session.add(client)
            
            db.session.commit()
            print(f"✅ {len(clients)} clients créés")
        
        if Operateur.query.count() == 0:
            print("👤 Création des opérateurs...")
            # Créer des opérateurs
            operateurs = [
                Operateur(nom="Carlos Rodríguez", telephone="600-111-001"),
                Operateur(nom="María González", telephone="600-111-002"),
                Operateur(nom="José Martínez", telephone="600-111-003"),
            ]
            
            for operateur in operateurs:
                db.session.add(operateur)
            
            db.session.commit()
            print(f"✅ {len(operateurs)} opérateurs créés")
        
        # Supprimer les anciens incidents pour recréer avec bons statuts
        print("🗑️ Suppression des anciens incidents...")
        Incident.query.delete()
        db.session.commit()
        
        print("🚨 Création des incidents avec statuts espagnols...")
        # Récupérer les clients et opérateurs après création
        clients = Client.query.all()
        operateurs = Operateur.query.all()
        
        print(f"   Clients disponibles: {len(clients)}")
        print(f"   Opérateurs disponibles: {len(operateurs)}")
        
        if len(clients) >= 4 and len(operateurs) >= 3:
            statuts_espagnols = ['Solucionadas', 'Pendiente', 'Bitrix']
            
            incidents = [
                # Incidents solucionadas
                Incident(
                    id_client=clients[0].id,
                    intitule="Problema de conectividad resuelto",
                    observations="Se restableció la conexión después de reiniciar el router",
                    status="Solucionadas",
                    id_operateur=operateurs[0].id,
                    date_heure=datetime.now() - timedelta(days=2)
                ),
                Incident(
                    id_client=clients[1].id,
                    intitule="Configuración de red completada",
                    observations="Se configuró correctamente la nueva red empresarial",
                    status="Solucionadas",
                    id_operateur=operateurs[1].id,
                    date_heure=datetime.now() - timedelta(days=1)
                ),
                Incident(
                    id_client=clients[2].id,
                    intitule="Actualización de firmware exitosa",
                    observations="Firmware actualizado sin problemas",
                    status="Solucionadas",
                    id_operateur=operateurs[2].id,
                    date_heure=datetime.now() - timedelta(hours=12)
                ),
                
                # Incidents pendientes
                Incident(
                    id_client=clients[3].id,
                    intitule="Lentitud en la conexión",
                    observations="Cliente reporta velocidad reducida desde ayer",
                    status="Pendiente",
                    id_operateur=operateurs[0].id,
                    date_heure=datetime.now() - timedelta(hours=6)
                ),
                Incident(
                    id_client=clients[3].id,
                    intitule="Cortes intermitentes de internet",
                    observations="Se pierden paquetes cada 30 minutos aproximadamente",
                    status="Pendiente",
                    id_operateur=operateurs[1].id,
                    date_heure=datetime.now() - timedelta(hours=3)
                ),
                Incident(
                    id_client=clients[0].id,
                    intitule="Solicitud de nueva IP estática",
                    observations="Cliente necesita IP fija para servidor web",
                    status="Pendiente",
                    id_operateur=operateurs[2].id,
                    date_heure=datetime.now() - timedelta(hours=1)
                ),
                
                # Incidents Bitrix
                Incident(
                    id_client=clients[1].id,
                    intitule="Migración a nuevo plan",
                    observations="Escalado a departamento comercial",
                    status="Bitrix",
                    id_operateur=operateurs[0].id,
                    date_heure=datetime.now() - timedelta(days=3)
                ),
                Incident(
                    id_client=clients[2].id,
                    intitule="Consulta sobre facturación",
                    observations="Derivado a contabilidad",
                    status="Bitrix",
                    id_operateur=operateurs[1].id,
                    date_heure=datetime.now() - timedelta(days=1, hours=6)
                ),
            ]
            
            for incident in incidents:
                db.session.add(incident)
            
            db.session.commit()
            print(f"✅ {len(incidents)} incidents créés avec statuts espagnols")
            
            # Statistiques finales
            print("\n📊 Résumé des données créées:")
            print(f"   👥 Clients: {Client.query.count()}")
            print(f"   👤 Opérateurs: {Operateur.query.count()}")
            print(f"   🚨 Incidents: {Incident.query.count()}")
            
            print("\n📈 Répartition des incidents par statut:")
            for statut in statuts_espagnols:
                count = Incident.query.filter_by(status=statut).count()
                print(f"   - {statut}: {count}")
            
            print("\n✅ Données de test créées avec succès!")
            print("🌐 Vous pouvez maintenant démarrer l'application:")
            print("   ./start_app_sans_pdf.sh")
        else:
            print("❌ Pas assez de clients ou d'opérateurs pour créer les incidents")

if __name__ == "__main__":
    create_test_data() 