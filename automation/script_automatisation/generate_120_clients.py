#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour générer 120 clients avec des données réalistes
"""

import sys
import os
import random
from datetime import datetime, timedelta
sys.path.insert(0, '.')

from app import app, db, Client

def generate_120_clients():
    """Générer 120 clients avec des données variées et réalistes"""
    
    print("🏢 GÉNÉRATION DE 120 CLIENTS - CONNEXIA")
    print("=" * 50)
    
    with app.app_context():
        # Vérifier l'état actuel
        existing_clients = Client.query.count()
        print(f"📊 Clients existants: {existing_clients}")
        
        # Données de base pour la génération
        entreprises_types = [
            "SERVICIOS", "MINISTERIO", "EMPRESA", "CORPORACION", "INDUSTRIAS",
            "COMERCIAL", "TECNOLOGIA", "CONSULTORIA", "CONSTRUCCION", "TRANSPORTE",
            "EDUCACION", "SALUD", "FINANZAS", "ENERGIA", "TELECOMUNICACIONES",
            "AGRICULTURA", "TURISMO", "INMOBILIARIA", "LOGISTICA", "MANUFACTURA"
        ]
        
        secteurs = [
            "INTEGRALES", "AVANZADOS", "PROFESIONALES", "ESPECIALIZADOS", "GLOBALES",
            "MODERNOS", "INNOVADORES", "ESTRATEGICOS", "DINAMICOS", "EFICIENTES",
            "SOSTENIBLES", "DIGITALES", "PREMIUM", "EXCELLENCE", "SOLUTIONS",
            "NETWORKS", "SYSTEMS", "TECHNOLOGIES", "DEVELOPMENT", "MANAGEMENT"
        ]
        
        villes_guinea = [
            "Malabo", "Bata", "Ebebiyin", "Aconibe", "Añisoc", "Luba", "Evinayong",
            "Mongomo", "Micomeseng", "Acurenam", "Cogo", "Mbini", "Kogo", "Nsok",
            "Niefang", "Nsork", "Ayene", "Bicurga", "Corisco", "Rebola"
        ]
        
        villes_espagne = [
            "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga",
            "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba",
            "Valladolid", "Vigo", "Gijón", "Hospitalet", "Vitoria", "Granada",
            "Elche", "Oviedo", "Badalona", "Cartagena", "Terrassa", "Jerez"
        ]
        
        toutes_villes = villes_guinea + villes_espagne
        
        # Préfixes téléphoniques
        prefixes_guinea = ["222", "333", "555", "666"]
        prefixes_espagne = ["91", "93", "96", "95", "976", "952", "968", "971"]
        
        # Types d'adresses
        types_rues = ["Calle", "Avenida", "Plaza", "Paseo", "Carretera", "Urbanización"]
        noms_rues = [
            "Principal", "Central", "Real", "Mayor", "Nueva", "San José", "La Paz",
            "Libertad", "Independencia", "Constitución", "España", "América",
            "Europa", "África", "Comercio", "Industrial", "Residencial", "Norte",
            "Sur", "Este", "Oeste", "Primera", "Segunda", "Tercera", "Cuarta"
        ]
        
        # Plages IP
        plages_ip = [
            "192.168.1", "192.168.2", "192.168.10", "192.168.20", "192.168.100",
            "10.0.0", "10.0.1", "10.1.0", "10.1.1", "172.16.0", "172.16.1",
            "172.20.0", "172.20.1", "192.168.50", "192.168.99"
        ]
        
        clients_generes = []
        
        print(f"\n🔄 Génération de 120 clients...")
        
        for i in range(1, 121):
            # Générer le nom de l'entreprise
            if random.random() < 0.3:  # 30% d'entreprises avec codes
                code = f"{random.randint(100000, 999999):06d}"
                type_entreprise = random.choice(entreprises_types)
                secteur = random.choice(secteurs)
                nom = f"{code} {type_entreprise} {secteur}"
            else:  # 70% d'entreprises normales
                type_entreprise = random.choice(entreprises_types)
                secteur = random.choice(secteurs)
                nom = f"{type_entreprise} {secteur}"
            
            # Choisir la ville (60% Guinée Équatoriale, 40% Espagne)
            if random.random() < 0.6:
                ville = random.choice(villes_guinea)
                prefix = random.choice(prefixes_guinea)
                numero = f"{random.randint(100000, 999999)}"
                if random.random() < 0.3:  # 30% avec double numéro
                    numero2 = f"{random.randint(100000, 999999)}"
                    telephone = f"{prefix}{numero}/{prefix}{numero2}"
                else:
                    telephone = f"{prefix}{numero}"
            else:
                ville = random.choice(villes_espagne)
                prefix = random.choice(prefixes_espagne)
                numero = f"{random.randint(1000000, 9999999)}"
                telephone = f"{prefix}-{numero}"
            
            # Générer l'adresse
            type_rue = random.choice(types_rues)
            nom_rue = random.choice(noms_rues)
            numero_rue = random.randint(1, 200)
            if random.random() < 0.4:  # 40% avec complément d'adresse
                complement = random.choice(["Bajo", "1º", "2º", "3º", "Oficina A", "Oficina B", "Local"])
                adresse = f"{type_rue} {nom_rue} {numero_rue}, {complement}"
            else:
                adresse = f"{type_rue} {nom_rue} {numero_rue}"
            
            # Générer les IPs (70% des clients ont des IPs)
            if random.random() < 0.7:
                plage = random.choice(plages_ip)
                ip_router = f"{plage}.{random.randint(1, 254)}"
                
                if random.random() < 0.6:  # 60% ont aussi IP Antea
                    ip_antea = f"{plage}.{random.randint(1, 254)}"
                    # S'assurer que les IPs sont différentes
                    while ip_antea == ip_router:
                        ip_antea = f"{plage}.{random.randint(1, 254)}"
                else:
                    ip_antea = None
            else:
                ip_router = None
                ip_antea = None
            
            # Créer le client
            client = Client(
                nom=nom,
                telephone=telephone,
                adresse=adresse,
                ville=ville,
                ip_router=ip_router,
                ip_antea=ip_antea
            )
            
            clients_generes.append(client)
            
            # Afficher le progrès tous les 20 clients
            if i % 20 == 0:
                print(f"   ✅ {i}/120 clients générés...")
        
        # Ajouter tous les clients à la base
        print(f"\n💾 Ajout des clients à la base de données...")
        
        try:
            db.session.add_all(clients_generes)
            db.session.commit()
            
            print(f"✅ 120 clients ajoutés avec succès!")
            
            # Statistiques finales
            total_clients = Client.query.count()
            print(f"\n📊 STATISTIQUES FINALES:")
            print(f"   - Total clients: {total_clients}")
            print(f"   - Nouveaux clients: 120")
            print(f"   - Clients existants: {existing_clients}")
            
            # Statistiques par ville
            print(f"\n🏙️ RÉPARTITION PAR VILLE (Top 10):")
            villes_stats = db.session.query(
                Client.ville, 
                db.func.count(Client.id)
            ).group_by(Client.ville).order_by(
                db.func.count(Client.id).desc()
            ).limit(10).all()
            
            for ville, count in villes_stats:
                print(f"   - {ville}: {count} clients")
            
            # Statistiques par pays
            clients_guinea = Client.query.filter(Client.ville.in_(villes_guinea)).count()
            clients_espagne = Client.query.filter(Client.ville.in_(villes_espagne)).count()
            
            print(f"\n🌍 RÉPARTITION PAR PAYS:")
            print(f"   - Guinée Équatoriale: {clients_guinea} clients ({clients_guinea/total_clients*100:.1f}%)")
            print(f"   - Espagne: {clients_espagne} clients ({clients_espagne/total_clients*100:.1f}%)")
            
            # Statistiques IP
            clients_avec_ip = Client.query.filter(Client.ip_router.isnot(None)).count()
            clients_avec_antea = Client.query.filter(Client.ip_antea.isnot(None)).count()
            
            print(f"\n🌐 CONFIGURATION RÉSEAU:")
            print(f"   - Clients avec IP Router: {clients_avec_ip} ({clients_avec_ip/total_clients*100:.1f}%)")
            print(f"   - Clients avec IP Antea: {clients_avec_antea} ({clients_avec_antea/total_clients*100:.1f}%)")
            
            print(f"\n🎉 GÉNÉRATION TERMINÉE AVEC SUCCÈS!")
            print(f"   Vous pouvez maintenant tester la pagination avec {total_clients} clients")
            print(f"   URL: http://localhost:5001/clients")
            
        except Exception as e:
            print(f"❌ Erreur lors de l'ajout: {str(e)}")
            db.session.rollback()
            return False
        
        return True

if __name__ == "__main__":
    generate_120_clients() 