#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour corriger les statuts des incidents et ajouter des données manquantes
Système de gestion de clients CONNEXIA
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client, Operateur, Incident
from datetime import datetime, timedelta

def fix_incidents_status():
    """Corriger les statuts des incidents et ajouter des données manquantes"""
    
    with app.app_context():
        print("🔧 Correction des statuts d'incidents...")
        
        # Vérifier les données existantes
        clients = Client.query.all()
        operateurs = Operateur.query.all()
        
        print(f"📊 État actuel:")
        print(f"   👥 Clients: {len(clients)}")
        print(f"   👤 Opérateurs: {len(operateurs)}")
        print(f"   🚨 Incidents: {Incident.query.count()}")
        
        # Créer des clients manquants si nécessaire
        if len(clients) < 4:
            print("📝 Ajout de clients manquants...")
            clients_manquants = [
                Client(nom="SERVICIOS INTEGRALES", telephone="555-0103", adresse="Plaza Central 67", ville="Valencia", ip_router="192.168.1.3", ip_antea="10.0.0.3"),
                Client(nom="INDUSTRIAS DEL SUR", telephone="555-0104", adresse="Polígono Industrial 89", ville="Sevilla", ip_router="192.168.1.4", ip_antea="10.0.0.4"),
                Client(nom="CONSULTORA NORTE", telephone="555-0105", adresse="Edificio Empresarial 12", ville="Bilbao", ip_router="192.168.1.5", ip_antea="10.0.0.5"),
            ]
            
            for client in clients_manquants:
                if len(clients) < 4:
                    db.session.add(client)
                    clients.append(client)
            
            db.session.commit()
            print(f"✅ Clients ajoutés. Total: {Client.query.count()}")
        
        # Créer des opérateurs manquants si nécessaire
        if len(operateurs) < 3:
            print("👤 Ajout d'opérateurs manquants...")
            operateurs_manquants = [
                Operateur(nom="María González", telephone="600-111-002"),
                Operateur(nom="José Martínez", telephone="600-111-003"),
            ]
            
            for operateur in operateurs_manquants:
                if len(operateurs) < 3:
                    db.session.add(operateur)
                    operateurs.append(operateur)
            
            db.session.commit()
            print(f"✅ Opérateurs ajoutés. Total: {Operateur.query.count()}")
        
        # Récupérer les données mises à jour
        clients = Client.query.all()
        operateurs = Operateur.query.all()
        
        # Supprimer tous les incidents existants pour recréer avec bons statuts
        print("🗑️ Suppression des anciens incidents...")
        Incident.query.delete()
        db.session.commit()
        
        # Créer de nouveaux incidents avec tous les statuts
        print("🚨 Création d'incidents avec statuts corrects...")
        
        incidents_nouveaux = [
            # Incidents Solucionadas
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
                id_operateur=operateurs[0].id,
                date_heure=datetime.now() - timedelta(days=1)
            ),
            Incident(
                id_client=clients[0].id,
                intitule="Actualización de firmware exitosa",
                observations="Firmware actualizado sin problemas",
                status="Solucionadas",
                id_operateur=operateurs[0].id,
                date_heure=datetime.now() - timedelta(hours=12)
            ),
            
            # Incidents Pendiente
            Incident(
                id_client=clients[1].id,
                intitule="Lentitud en la conexión",
                observations="Cliente reporta velocidad reducida desde ayer",
                status="Pendiente",
                id_operateur=operateurs[0].id,
                date_heure=datetime.now() - timedelta(hours=6)
            ),
            Incident(
                id_client=clients[0].id,
                intitule="Cortes intermitentes de internet",
                observations="Se pierden paquetes cada 30 minutos aproximadamente",
                status="Pendiente",
                id_operateur=operateurs[0].id,
                date_heure=datetime.now() - timedelta(hours=3)
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
        ]
        
        for incident in incidents_nouveaux:
            db.session.add(incident)
        
        db.session.commit()
        print(f"✅ {len(incidents_nouveaux)} incidents créés")
        
        # Vérifier les statuts créés
        print("\n📈 Répartition des incidents par statut:")
        statuts = ['Solucionadas', 'Pendiente', 'Bitrix']
        for statut in statuts:
            count = Incident.query.filter_by(status=statut).count()
            print(f"   - {statut}: {count} incidents")
        
        print("\n✅ Correction terminée avec succès!")
        print("🌐 Les statuts devraient maintenant s'afficher correctement")

if __name__ == "__main__":
    fix_incidents_status() 