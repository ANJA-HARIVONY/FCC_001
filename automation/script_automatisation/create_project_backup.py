#!/usr/bin/env python3
"""
Script pour créer une copie sécurisée du projet
Usage: python create_project_backup.py
"""

import os
import sys
import shutil
from datetime import datetime

def create_backup():
    """Créer une copie sécurisée du projet"""
    # Timestamp pour le nom du dossier
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f'FCC_001_backup_{timestamp}'
    
    print(f"📦 Création de la copie du projet: {backup_dir}")
    print("=" * 50)
    
    # Dossiers et fichiers à copier
    to_copy = [
        'app.py',
        'app_production.py',
        'production_config.py',
        'start_production.py',
        'deploy_production.py',
        'requirements.txt',
        'requirements_production.txt',
        'templates',
        'static',
        'migrations',
        'translations',
        'utils'
    ]
    
    # Dossiers à exclure
    exclude = [
        '__pycache__',
        '.git',
        '.venv',
        'logs',
        'backups',
        'instance'
    ]
    
    try:
        # Créer le dossier de backup
        os.makedirs(backup_dir, exist_ok=True)
        print(f"✅ Dossier créé: {backup_dir}")
        
        # Copier les fichiers et dossiers
        for item in to_copy:
            if os.path.exists(item):
                if os.path.isfile(item):
                    shutil.copy2(item, os.path.join(backup_dir, item))
                    print(f"✅ Fichier copié: {item}")
                else:
                    shutil.copytree(
                        item,
                        os.path.join(backup_dir, item),
                        ignore=shutil.ignore_patterns(*exclude)
                    )
                    print(f"✅ Dossier copié: {item}")
            else:
                print(f"⚠️  Non trouvé: {item}")
        
        # Créer un fichier README dans le backup
        readme_content = f"""# Copie du projet FCC_001
Date de création: {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}

## Contenu
- Application principale
- Configuration de production
- Templates et assets
- Migrations de base de données
- Utilitaires

## Fichiers importants
- app.py : Application principale
- app_production.py : Version production
- production_config.py : Configuration production
- start_production.py : Script de démarrage
- deploy_production.py : Script de déploiement

## Base de données
La base de données n'est pas incluse dans cette copie.
Utilisez le script deploy_production.py pour sauvegarder la base de données.

## Démarrage
1. Créer un environnement virtuel
2. Installer les dépendances: pip install -r requirements.txt
3. Configurer la base de données
4. Lancer: python start_production.py
"""
        
        with open(os.path.join(backup_dir, 'README.md'), 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print("\n📋 RÉSUMÉ")
        print("=" * 50)
        print(f"✅ Copie créée dans: {backup_dir}")
        print(f"📁 Taille: {get_dir_size(backup_dir) / 1024 / 1024:.1f} MB")
        print("\n⚠️  IMPORTANT")
        print("- La base de données n'est pas incluse")
        print("- Utilisez deploy_production.py pour sauvegarder la base de données")
        print("- Vérifiez le README.md dans le dossier de backup")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def get_dir_size(path):
    """Calculer la taille d'un dossier"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    return total_size

if __name__ == "__main__":
    print("🎯 CRÉATION D'UNE COPIE SÉCURISÉE DU PROJET")
    print("=" * 50)
    
    if create_backup():
        print("\n🎉 COPIE CRÉÉE AVEC SUCCÈS!")
    else:
        print("\n❌ ÉCHEC DE LA COPIE")
        sys.exit(1) 