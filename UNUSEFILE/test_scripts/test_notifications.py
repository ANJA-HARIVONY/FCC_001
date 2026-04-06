#!/usr/bin/env python3
"""
Script de test pour le système de notifications d'incidents pendientes
Teste l'API et crée des incidents de test si nécessaire
"""

import sys
import os
import requests
import json
from datetime import datetime, timedelta

# Ajouter le chemin vers le projet
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def test_api_notifications():
    """Test de l'API des notifications"""
    print("🔔 Test du système de notifications")
    print("=" * 50)
    
    try:
        # Tester l'API
        url = "http://localhost:5001/api/incidents-pendientes"
        print(f"📡 Testando API: {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response: Status {response.status_code}")
            print(f"📊 Incidents pendientes: {data.get('count', 0)}")
            
            if data.get('notifications'):
                print("\n📋 Détails des incidents pendientes:")
                for i, incident in enumerate(data['notifications'], 1):
                    print(f"  {i}. ID: {incident['id']}")
                    print(f"     Cliente: {incident['client_nom']}")
                    print(f"     Operador: {incident['operateur_nom']}")
                    print(f"     Asunto: {incident['intitule']}")
                    print(f"     Tiempo: {incident['tiempo_transcurrido']}")
                    print(f"     Fecha: {incident['fecha_creacion']}")
                    print()
            else:
                print("ℹ️  No hay incidents pendientes que requieran notificación")
            
            return True
            
        else:
            print(f"❌ Error API: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se puede conectar al servidor")
        print("   Asegúrate de que la aplicación esté ejecutándose en http://localhost:5001")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def create_test_incident():
    """Crear un incident de test pendiente"""
    print("\n🧪 Creando incident de test para notificaciones...")
    
    try:
        # Importar modelos de la aplicación
        from core.app import app, db, Incident, Client, Operateur
        
        with app.app_context():
            # Buscar un cliente y operador existente
            client = Client.query.first()
            operateur = Operateur.query.first()
            
            if not client or not operateur:
                print("⚠️  No hay clientes u operadores en la base de datos")
                return False
            
            # Crear incident pendiente de hace 45 minutos
            fecha_incident = datetime.now() - timedelta(minutes=45)
            
            incident_test = Incident(
                id_client=client.id,
                intitule="PRUEBA - Notificación incident pendiente",
                observations="Este es un incident de prueba creado para testear el sistema de notificaciones. Se puede eliminar sin problemas.",
                status="Pendiente",
                id_operateur=operateur.id,
                date_heure=fecha_incident
            )
            
            db.session.add(incident_test)
            db.session.commit()
            
            print(f"✅ Incident de test creado:")
            print(f"   ID: {incident_test.id}")
            print(f"   Cliente: {client.nom}")
            print(f"   Operador: {operateur.nom}")
            print(f"   Fecha: {fecha_incident.strftime('%d/%m/%Y %H:%M')}")
            print(f"   Tiempo transcurrido: ~45 minutos")
            
            return True
            
    except Exception as e:
        print(f"❌ Error al crear incident de test: {e}")
        return False

def main():
    """Función principal"""
    print("🎯 Sistema de Test de Notificaciones FCC_001")
    print("=" * 60)
    
    # Test 1: API
    print("\n1️⃣ Test de API")
    api_ok = test_api_notifications()
    
    if not api_ok:
        print("\n⚠️  La API no está funcionando. Verifica que la aplicación esté ejecutándose.")
        return
    
    # Test 2: Crear incident de test si no hay notificaciones
    response = requests.get("http://localhost:5001/api/incidents-pendientes")
    if response.status_code == 200:
        data = response.json()
        if data.get('count', 0) == 0:
            print("\n2️⃣ No hay incidents pendientes. Creando incident de test...")
            create_test_incident()
            
            # Verificar nuevamente
            print("\n3️⃣ Verificación después de crear incident de test:")
            test_api_notifications()
    
    print("\n" + "=" * 60)
    print("✅ Test completado")
    print("\n📝 Para testear las notificaciones en el navegador:")
    print("   1. Abre http://localhost:5001")
    print("   2. Abre las herramientas de desarrollador (F12)")
    print("   3. En la consola, ejecuta: debugNotifications.check()")
    print("   4. Deberías ver una notificación amarilla en la esquina superior derecha")
    print("\n🛠️  Comandos útiles en la consola del navegador:")
    print("   - debugNotifications.check()  // Verificar inmediatamente")
    print("   - debugNotifications.test()   // Mostrar notificación de prueba")
    print("   - debugNotifications.clear()  // Limpiar todas las notificaciones")
    print("   - debugNotifications.toggle() // Pausar/reanudar sistema")

if __name__ == "__main__":
    main()
