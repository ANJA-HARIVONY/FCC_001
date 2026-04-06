#!/usr/bin/env python3
"""
Script de migration complète SQLite vers MariaDB
Lance automatiquement tous les scripts nécessaires dans le bon ordre
Usage: python migrate_all.py
"""

import sys
import subprocess
import os
from datetime import datetime

def run_script(script_name, description):
    """Exécute un script Python et retourne le résultat"""
    print(f"\n🚀 {description}")
    print("=" * 60)
    
    try:
        # Lancer le script
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=False,  # Afficher la sortie en temps réel
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - Terminé avec succès")
            return True
        else:
            print(f"❌ {description} - Échec (code: {result.returncode})")
            return False
            
    except FileNotFoundError:
        print(f"❌ Script non trouvé: {script_name}")
        return False
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution de {script_name}: {e}")
        return False

def check_prerequisites():
    """Vérification des prérequis"""
    print("🔍 Vérification des prérequis...")
    
    # Vérifier que les scripts existent
    required_scripts = [
        'install_mariadb_dependencies.py',
        'test_mariadb_connection.py',
        'migrate_to_mariadb.py'
    ]
    
    missing_scripts = []
    for script in required_scripts:
        if not os.path.exists(script):
            missing_scripts.append(script)
    
    if missing_scripts:
        print("❌ Scripts manquants:")
        for script in missing_scripts:
            print(f"   - {script}")
        return False
    
    # Vérifier que SQLite existe
    if not os.path.exists('gestion_client.db'):
        print("❌ Base de données SQLite non trouvée: gestion_client.db")
        return False
    
    print("✅ Tous les prérequis sont satisfaits")
    return True

def create_migration_log():
    """Créer un fichier de log pour la migration"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = f"migration_log_{timestamp}.txt"
    
    with open(log_file, 'w', encoding='utf-8') as f:
        f.write(f"Migration SQLite vers MariaDB - {datetime.now()}\n")
        f.write("=" * 50 + "\n")
        f.write("Configuration:\n")
        f.write("- Host: localhost\n")
        f.write("- User: root\n")
        f.write("- Database: fcc_001_db\n")
        f.write("- Charset: utf8mb4\n")
        f.write("=" * 50 + "\n\n")
    
    return log_file

def main():
    """Fonction principale de migration complète"""
    print("🌟 Migration Complète SQLite vers MariaDB")
    print("=" * 60)
    print("Configuration:")
    print("  📍 Host: localhost")
    print("  👤 User: root")
    print("  🔑 Password: toor") 
    print("  💾 Database: fcc_001_db")
    print("=" * 60)
    
    # Créer un log de migration
    log_file = create_migration_log()
    print(f"📝 Log de migration: {log_file}")
    
    # Vérifier les prérequis
    if not check_prerequisites():
        print("\n❌ Les prérequis ne sont pas satisfaits")
        print("💡 Consultez le guide GUIDE_MIGRATION_MARIADB.md")
        return False
    
    # Demander confirmation
    print(f"\n⚠️  ATTENTION: Cette opération va:")
    print("1. Installer PyMySQL si nécessaire")
    print("2. Tester la connexion MariaDB")
    print("3. Migrer toutes les données de SQLite vers MariaDB")
    print("4. Modifier la configuration Flask")
    print("5. Créer des sauvegardes automatiques")
    
    response = input("\n❓ Voulez-vous continuer ? (oui/non): ").lower().strip()
    if response not in ['oui', 'yes', 'y', 'o']:
        print("⚠️  Migration annulée par l'utilisateur")
        return False
    
    # Liste des étapes
    steps = [
        ('install_mariadb_dependencies.py', 'Installation des dépendances MariaDB'),
        ('test_mariadb_connection.py', 'Test de connexion MariaDB'),
        ('migrate_to_mariadb.py', 'Migration des données')
    ]
    
    # Exécuter chaque étape
    for i, (script, description) in enumerate(steps, 1):
        print(f"\n📍 Étape {i}/{len(steps)}: {description}")
        
        if not run_script(script, description):
            print(f"\n❌ Échec à l'étape {i}: {description}")
            print("💡 Consultez les erreurs ci-dessus pour résoudre le problème")
            print(f"📝 Détails dans le log: {log_file}")
            return False
        
        # Petite pause entre les étapes
        if i < len(steps):
            print("\n⏸️  Pause de 2 secondes avant l'étape suivante...")
            import time
            time.sleep(2)
    
    # Migration terminée avec succès
    print("\n" + "🎉" * 20)
    print("🎉 MIGRATION TERMINÉE AVEC SUCCÈS ! 🎉")
    print("🎉" * 20)
    
    print(f"\n📋 Résumé:")
    print("✅ Dépendances installées")
    print("✅ Connexion MariaDB testée")
    print("✅ Données migrées avec succès")
    print("✅ Configuration Flask mise à jour")
    print("✅ Sauvegardes créées")
    
    print(f"\n📂 Fichiers créés:")
    print(f"  📝 Log: {log_file}")
    print(f"  💾 Sauvegarde config: config_backup_*.py")
    print(f"  💾 Sauvegarde données: sqlite_backup_*.json")
    
    print(f"\n🚀 Prochaines étapes:")
    print("1. Testez votre application: python app.py")
    print("2. Vérifiez que toutes les fonctionnalités marchent")
    print("3. Configurez les sauvegardes régulières MariaDB")
    print("4. Consultez GUIDE_MIGRATION_MARIADB.md pour les optimisations")
    
    print(f"\n💡 En cas de problème:")
    print("1. Consultez les logs de migration")
    print("2. Utilisez les sauvegardes pour revenir en arrière")
    print("3. Vérifiez la documentation MariaDB")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Migration interrompue par l'utilisateur")
        print("💡 Vous pouvez relancer le script pour reprendre")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        print("💡 Consultez GUIDE_MIGRATION_MARIADB.md pour le dépannage")
        sys.exit(1) 