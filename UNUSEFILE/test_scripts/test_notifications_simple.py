#!/usr/bin/env python3
"""
Script simple de test pour le système de notifications
Sans dépendances externes - utilise seulement les modules de l'application
"""

import sys
import os
from datetime import datetime, timedelta

# Ajouter le chemin vers le projet
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def test_notifications_logic():
    """Test de la logique des notifications sans serveur"""
    print("🔔 Test du Sistema de Notificaciones")
    print("=" * 60)
    
    try:
        # Importer les modèles de l'application
        from core.app import app, db, Incident, Client, Operateur
        
        with app.app_context():
            print("✅ Connexion à la base de données réussie")
            
            # Vérifier les incidents pendientes
            limite_temps = datetime.now() - timedelta(minutes=30)
            
            incidents_pendientes = db.session.query(Incident, Client, Operateur)\
                .join(Client, Incident.id_client == Client.id)\
                .join(Operateur, Incident.id_operateur == Operateur.id)\
                .filter(Incident.status == 'Pendiente')\
                .filter(Incident.date_heure <= limite_temps)\
                .all()
            
            print(f"📊 Incidents pendientes > 30min: {len(incidents_pendientes)}")
            
            if incidents_pendientes:
                print("\n📋 Détails des incidents qui déclencheraient des notifications:")
                for i, (incident, client, operateur) in enumerate(incidents_pendientes, 1):
                    tiempo_transcurrido = datetime.now() - incident.date_heure
                    horas = int(tiempo_transcurrido.total_seconds() // 3600)
                    minutos = int((tiempo_transcurrido.total_seconds() % 3600) // 60)
                    
                    print(f"\n  {i}. Incident ID: {incident.id}")
                    print(f"     📋 Asunto: {incident.intitule}")
                    print(f"     👤 Cliente: {client.nom}")
                    print(f"     👨‍💼 Operador: {operateur.nom}")
                    print(f"     ⏰ Tiempo: {horas}h {minutos}m")
                    print(f"     📅 Creado: {incident.date_heure.strftime('%d/%m/%Y %H:%M')}")
            else:
                print("ℹ️  No hay incidents pendientes que requieran notificación")
                print("   (Esto es normal si todos los incidents han sido resueltos)")
            
            # Estadísticas generales
            total_incidents = Incident.query.count()
            total_pendientes = Incident.query.filter(Incident.status == 'Pendiente').count()
            total_clientes = Client.query.count()
            total_operadores = Operateur.query.count()
            
            print(f"\n📊 Estadísticas de la base de datos:")
            print(f"   📋 Total incidents: {total_incidents}")
            print(f"   ⏳ Total pendientes: {total_pendientes}")
            print(f"   👥 Total clientes: {total_clientes}")
            print(f"   👨‍💼 Total operadores: {total_operadores}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_test_notification():
    """Crear un incident de test para probar las notifications"""
    print("\n🧪 ¿Quieres crear un incident de test para probar las notificaciones? (s/n)")
    respuesta = input().lower().strip()
    
    if respuesta in ['s', 'si', 'sí', 'y', 'yes']:
        try:
            from core.app import app, db, Incident, Client, Operateur
            
            with app.app_context():
                client = Client.query.first()
                operateur = Operateur.query.first()
                
                if not client or not operateur:
                    print("⚠️  No hay clientes u operadores en la base de datos")
                    return False
                
                # Crear incident pendiente de hace 45 minutos
                fecha_incident = datetime.now() - timedelta(minutes=45)
                
                incident_test = Incident(
                    id_client=client.id,
                    intitule="🔔 PRUEBA - Notificación sistema automático",
                    observations="Incident de prueba para testear el sistema de notificaciones. Tiempo: 45min pendiente.",
                    status="Pendiente",
                    id_operateur=operateur.id,
                    date_heure=fecha_incident
                )
                
                db.session.add(incident_test)
                db.session.commit()
                
                print(f"✅ Incident de test creado:")
                print(f"   🆔 ID: {incident_test.id}")
                print(f"   👤 Cliente: {client.nom}")
                print(f"   👨‍💼 Operador: {operateur.nom}")
                print(f"   📅 Fecha: {fecha_incident.strftime('%d/%m/%Y %H:%M')}")
                print(f"   ⏰ Tiempo transcurrido: ~45 minutos")
                
                return True
                
        except Exception as e:
            print(f"❌ Error al crear incident de test: {e}")
            return False
    
    return False

def main():
    """Función principal"""
    print("🎯 Sistema de Test de Notificaciones FCC_001")
    print("   Test sin servidor - Solo lógica de base de datos")
    print("=" * 60)
    
    # Test principal
    exito = test_notifications_logic()
    
    if exito:
        # Ofrecer crear incident de test
        if create_test_notification():
            print("\n🔄 Verificando nuevamente después de crear el incident de test...")
            test_notifications_logic()
    
    print("\n" + "=" * 60)
    print("✅ Test completado")
    
    if exito:
        print("\n🚀 Para testear las notificaciones completas:")
        print("   1. Iniciar la aplicación: python start_app.py")
        print("   2. Abrir http://localhost:5001")
        print("   3. Abrir DevTools del navegador (F12)")
        print("   4. En la consola JavaScript, ejecutar:")
        print("      debugNotifications.check()")
        print("   5. Si hay incidents pendientes > 30min, verás notificaciones amarillas")
        
        print("\n🛠️  Comandos útiles en la consola del navegador:")
        print("   debugNotifications.test()   // Mostrar notificación de prueba")
        print("   debugNotifications.clear()  // Limpiar notificaciones")
        print("   debugNotifications.toggle() // Pausar/reanudar sistema")
    else:
        print("\n❌ Hubo errores. Verifica la configuración de la base de datos.")

if __name__ == "__main__":
    main()
