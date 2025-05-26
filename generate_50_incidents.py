#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour générer 50 incidents de test
Système de gestion de clients CONNEXIA
"""

import sys
import os
sys.path.insert(0, '.')

from app import app, db, Client, Operateur, Incident
from datetime import datetime, timedelta
import random

def generate_50_incidents():
    """Générer 50 incidents de test avec des données variées"""
    
    with app.app_context():
        print("📊 Génération de 50 incidents de test...")
        
        # Récupérer les clients et opérateurs existants
        clients = Client.query.all()
        operateurs = Operateur.query.all()
        
        print(f"   👥 Clients disponibles: {len(clients)}")
        print(f"   👤 Opérateurs disponibles: {len(operateurs)}")
        
        if len(clients) < 2 or len(operateurs) < 1:
            print("❌ Pas assez de clients ou d'opérateurs. Exécutez d'abord fix_incidents_status.py")
            return
        
        # Supprimer les incidents existants
        print("🗑️ Suppression des anciens incidents...")
        Incident.query.delete()
        db.session.commit()
        
        # Listes de données pour générer des incidents variés
        problemes_conectividad = [
            "Sin conexión a internet",
            "Velocidad lenta de navegación",
            "Cortes intermitentes de conexión",
            "No puede acceder a sitios web",
            "Problemas con WiFi",
            "Router no responde",
            "Pérdida de paquetes",
            "Latencia alta en conexión",
            "DNS no resuelve dominios",
            "IP duplicada en red"
        ]
        
        problemes_tecnicos = [
            "Actualización de firmware",
            "Configuración de puerto",
            "Cambio de contraseña WiFi",
            "Instalación de nuevo equipo",
            "Mantenimiento preventivo",
            "Revisión de cables",
            "Optimización de señal",
            "Configuración de VPN",
            "Backup de configuración",
            "Monitoreo de red"
        ]
        
        consultas_comerciales = [
            "Consulta sobre facturación",
            "Solicitud de cambio de plan",
            "Información sobre servicios",
            "Reclamo por cobro",
            "Solicitud de descuento",
            "Consulta sobre promociones",
            "Cambio de datos personales",
            "Solicitud de suspensión temporal",
            "Consulta sobre contrato",
            "Solicitud de nueva línea"
        ]
        
        observaciones_solucionadas = [
            "Problema resuelto reiniciando el router",
            "Se actualizó la configuración del equipo",
            "Cable ethernet reemplazado exitosamente",
            "Configuración WiFi corregida",
            "Firmware actualizado sin problemas",
            "Señal optimizada correctamente",
            "Puerto configurado según especificaciones",
            "Problema de DNS solucionado",
            "Velocidad restaurada a valores normales",
            "Conexión estabilizada completamente"
        ]
        
        observaciones_pendientes = [
            "Esperando respuesta del cliente",
            "Técnico programado para mañana",
            "Pendiente aprobación de gerencia",
            "Esperando llegada de repuestos",
            "Cliente no disponible para visita",
            "Requiere coordinación con proveedor",
            "Pendiente autorización de cambio",
            "Esperando ventana de mantenimiento",
            "Cliente solicitó reagendar",
            "Pendiente confirmación de horario"
        ]
        
        observaciones_bitrix = [
            "Escalado a departamento comercial",
            "Derivado a facturación",
            "Requiere aprobación gerencial",
            "Enviado a departamento técnico especializado",
            "Transferido a soporte nivel 2",
            "Escalado a supervisor",
            "Derivado a área legal",
            "Enviado a departamento de ventas",
            "Transferido a atención al cliente",
            "Escalado a gerencia técnica"
        ]
        
        statuts = ['Solucionadas', 'Pendiente', 'Bitrix']
        
        print("🚨 Creando 50 incidents variados...")
        
        incidents_creados = []
        
        for i in range(50):
            # Seleccionar un statut aléatoire avec distribution réaliste
            if i < 25:  # 50% solucionadas
                status = 'Solucionadas'
                if i < 10:
                    intitule = random.choice(problemes_conectividad)
                else:
                    intitule = random.choice(problemes_tecnicos)
                observations = random.choice(observaciones_solucionadas)
            elif i < 40:  # 30% pendiente
                status = 'Pendiente'
                intitule = random.choice(problemes_conectividad + problemes_tecnicos)
                observations = random.choice(observaciones_pendientes)
            else:  # 20% bitrix
                status = 'Bitrix'
                intitule = random.choice(consultas_comerciales)
                observations = random.choice(observaciones_bitrix)
            
            # Date aléatoire dans les 30 derniers jours
            jours_arriere = random.randint(0, 30)
            heures_arriere = random.randint(0, 23)
            minutes_arriere = random.randint(0, 59)
            
            date_incident = datetime.now() - timedelta(
                days=jours_arriere, 
                hours=heures_arriere, 
                minutes=minutes_arriere
            )
            
            # Client et opérateur aléatoires
            client_aleatoire = random.choice(clients)
            operateur_aleatoire = random.choice(operateurs)
            
            incident = Incident(
                id_client=client_aleatoire.id,
                intitule=f"{intitule} #{i+1:03d}",
                observations=observations,
                status=status,
                id_operateur=operateur_aleatoire.id,
                date_heure=date_incident
            )
            
            incidents_creados.append(incident)
            db.session.add(incident)
        
        db.session.commit()
        print(f"✅ {len(incidents_creados)} incidents créés avec succès")
        
        # Statistiques finales
        print("\n📈 Répartition des incidents par statut:")
        for statut in statuts:
            count = Incident.query.filter_by(status=statut).count()
            pourcentage = (count / 50) * 100
            print(f"   - {statut}: {count} incidents ({pourcentage:.0f}%)")
        
        print(f"\n📅 Période couverte: {min([i.date_heure for i in incidents_creados]).strftime('%d/%m/%Y')} - {max([i.date_heure for i in incidents_creados]).strftime('%d/%m/%Y')}")
        
        print("\n✅ Génération terminée avec succès!")
        print("🌐 Vous pouvez maintenant tester la pagination sur la page incidents")

if __name__ == "__main__":
    generate_50_incidents() 