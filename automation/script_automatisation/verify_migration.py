#!/usr/bin/env python3
"""
Script de vérification post-migration
Usage: python verify_migration.py
"""

import sys
import os
from collections import Counter
from datetime import datetime

# Ajouter le répertoire actuel au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def verify_migration():
    """Vérifier les données après migration"""
    print("🔍 VÉRIFICATION POST-MIGRATION")
    print("=" * 40)
    
    try:
        from app import app, db, Client, Operateur, Incident
        
        with app.app_context():
            print("📊 Statistiques générales:")
            
            # Compter les enregistrements
            clients_count = Client.query.count()
            operateurs_count = Operateur.query.count() 
            incidents_count = Incident.query.count()
            
            print(f"  👥 Clients: {clients_count}")
            print(f"  🛠️  Opérateurs: {operateurs_count}")
            print(f"  🎫 Incidents: {incidents_count}")
            
            # Vérifier les opérateurs
            print(f"\n👥 Opérateurs dans la base:")
            operateurs = Operateur.query.all()
            for op in operateurs:
                incidents_op = Incident.query.filter_by(id_operateur=op.id).count()
                print(f"  🛠️  {op.nom} (Tel: {op.telephone}) - {incidents_op} incidents")
            
            # Vérifier les statuts
            print(f"\n📊 Répartition des statuts:")
            from sqlalchemy import func
            status_counts = db.session.query(
                Incident.status, func.count(Incident.id)
            ).group_by(Incident.status).all()
            
            for status, count in status_counts:
                percentage = (count / incidents_count) * 100 if incidents_count > 0 else 0
                print(f"  📋 {status}: {count} ({percentage:.1f}%)")
            
            # Vérifier les villes
            print(f"\n🏙️  Répartition par ville:")
            ville_counts = db.session.query(
                Client.ville, func.count(Client.id)
            ).group_by(Client.ville).order_by(func.count(Client.id).desc()).all()
            
            for ville, count in ville_counts[:10]:  # Top 10
                percentage = (count / clients_count) * 100 if clients_count > 0 else 0
                print(f"  🏠 {ville}: {count} clients ({percentage:.1f}%)")
            
            # Vérifier les incidents par mois
            print(f"\n📅 Incidents par mois:")
            monthly_counts = db.session.query(
                func.strftime('%Y-%m', Incident.date_heure),
                func.count(Incident.id)
            ).group_by(func.strftime('%Y-%m', Incident.date_heure)).all()
            
            for month, count in monthly_counts:
                print(f"  📆 {month}: {count} incidents")
            
            # Top 10 des problèmes
            print(f"\n🎫 Top 10 des problèmes:")
            problem_counts = db.session.query(
                Incident.intitule, func.count(Incident.id)
            ).group_by(Incident.intitule).order_by(func.count(Incident.id).desc()).limit(10).all()
            
            for problem, count in problem_counts:
                percentage = (count / incidents_count) * 100 if incidents_count > 0 else 0
                print(f"  🔧 {problem[:50]}...: {count} ({percentage:.1f}%)")
            
            # Vérifier l'intégrité des données
            print(f"\n🔍 Vérification de l'intégrité:")
            
            # Clients sans incidents
            clients_sans_incidents = db.session.query(Client).outerjoin(Incident).filter(Incident.id.is_(None)).count()
            print(f"  👤 Clients sans incidents: {clients_sans_incidents}")
            
            # Incidents orphelins (sans client)
            incidents_orphelins = db.session.query(Incident).outerjoin(Client).filter(Client.id.is_(None)).count()
            print(f"  🎫 Incidents orphelins: {incidents_orphelins}")
            
            # Opérateurs sans incidents
            operateurs_sans_incidents = db.session.query(Operateur).outerjoin(Incident).filter(Incident.id.is_(None)).count()
            print(f"  🛠️  Opérateurs sans incidents: {operateurs_sans_incidents}")
            
            # Clients avec téléphones invalides
            clients_tel_invalides = Client.query.filter(func.length(Client.telephone) < 6).count()
            print(f"  📞 Clients avec téléphone invalide: {clients_tel_invalides}")
            
            # Période couverte
            if incidents_count > 0:
                first_incident = Incident.query.order_by(Incident.date_heure.asc()).first()
                last_incident = Incident.query.order_by(Incident.date_heure.desc()).first()
                
                print(f"\n📅 Période couverte:")
                print(f"  📅 Premier incident: {first_incident.date_heure.strftime('%d/%m/%Y %H:%M')}")
                print(f"  📅 Dernier incident: {last_incident.date_heure.strftime('%d/%m/%Y %H:%M')}")
                
                duration = last_incident.date_heure - first_incident.date_heure
                print(f"  ⏱️  Durée: {duration.days} jours")
            
            # Exemples de données
            print(f"\n📋 Exemples de données migrées:")
            print("=" * 30)
            
            print("👤 Premiers clients:")
            clients_sample = Client.query.limit(3).all()
            for client in clients_sample:
                incidents_client = Incident.query.filter_by(id_client=client.id).count()
                print(f"  - {client.nom[:40]}... (Ville: {client.ville}, {incidents_client} incidents)")
            
            print("\n🎫 Derniers incidents:")
            incidents_sample = Incident.query.order_by(Incident.date_heure.desc()).limit(3).all()
            for incident in incidents_sample:
                print(f"  - {incident.intitule[:40]}... ({incident.status})")
            
            # Validation finale
            print(f"\n✅ VALIDATION FINALE:")
            print("=" * 25)
            
            issues = []
            
            if clients_count == 0:
                issues.append("❌ Aucun client migré")
            if operateurs_count == 0:
                issues.append("❌ Aucun opérateur migré")
            if incidents_count == 0:
                issues.append("❌ Aucun incident migré")
            if incidents_orphelins > 0:
                issues.append(f"⚠️  {incidents_orphelins} incidents orphelins")
            if clients_tel_invalides > (clients_count * 0.1):  # Plus de 10%
                issues.append(f"⚠️  Beaucoup de téléphones invalides ({clients_tel_invalides})")
            
            if not issues:
                print("🎉 MIGRATION VALIDÉE - Toutes les données semblent correctes !")
                print(f"✅ {clients_count} clients, {operateurs_count} opérateurs, {incidents_count} incidents")
                return True
            else:
                print("⚠️  Problèmes détectés:")
                for issue in issues:
                    print(f"  {issue}")
                return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = verify_migration()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Vérification interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1) 