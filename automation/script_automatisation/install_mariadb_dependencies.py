#!/usr/bin/env python3
"""
Installation des dépendances MariaDB pour Flask
Usage: python install_mariadb_dependencies.py
"""

import sys
import subprocess
import os

def install_package(package_name):
    """Installation d'un package Python via pip"""
    try:
        print(f"📦 Installation de {package_name}...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", package_name],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ {package_name} installé avec succès")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'installation de {package_name}:")
        print(f"   {e.stderr}")
        return False

def check_package(package_name):
    """Vérification si un package est installé"""
    try:
        __import__(package_name)
        print(f"✅ {package_name} déjà installé")
        return True
    except ImportError:
        print(f"⚠️  {package_name} non trouvé")
        return False

def update_requirements():
    """Mise à jour du fichier requirements.txt"""
    try:
        print("📝 Mise à jour de requirements.txt...")
        
        # Lire le fichier existant
        requirements = []
        if os.path.exists('requirements.txt'):
            with open('requirements.txt', 'r') as f:
                requirements = [line.strip() for line in f.readlines()]
        
        # Ajouter PyMySQL si pas présent
        pymysql_found = any('pymysql' in req.lower() for req in requirements)
        
        if not pymysql_found:
            requirements.append('PyMySQL>=1.0.2')
            print("➕ PyMySQL ajouté aux requirements")
        
        # Écrire le fichier mis à jour
        with open('requirements.txt', 'w') as f:
            for req in requirements:
                if req.strip():  # Éviter les lignes vides
                    f.write(req + '\n')
        
        print("✅ requirements.txt mis à jour")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour de requirements.txt: {e}")
        return False

def test_installation():
    """Test des installations"""
    try:
        print("🧪 Test des installations...")
        
        # Test PyMySQL
        import pymysql
        print("✅ PyMySQL importé avec succès")
        
        # Test création d'une connexion (sans se connecter réellement)
        try:
            # Cela va juste vérifier que la classe Connection existe
            conn_class = pymysql.Connection
            print("✅ Classes PyMySQL disponibles")
        except Exception as e:
            print(f"⚠️  Problème avec les classes PyMySQL: {e}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur d'importation: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

def main():
    """Fonction principale"""
    print("🚀 Installation des dépendances MariaDB")
    print("=" * 50)
    
    # Vérifier Python et pip
    print(f"🐍 Python version: {sys.version}")
    
    try:
        result = subprocess.run([sys.executable, "-m", "pip", "--version"], 
                              capture_output=True, text=True, check=True)
        print(f"📦 Pip disponible: {result.stdout.strip()}")
    except subprocess.CalledProcessError:
        print("❌ Pip n'est pas disponible")
        return False
    
    # Liste des packages à installer
    packages = [
        ('pymysql', 'PyMySQL>=1.0.2'),
    ]
    
    all_success = True
    
    for package_import, package_install in packages:
        print(f"\n📋 Vérification de {package_import}...")
        
        if not check_package(package_import):
            if not install_package(package_install):
                all_success = False
    
    # Mise à jour des requirements
    if not update_requirements():
        all_success = False
    
    # Test final
    print(f"\n🧪 Test final des installations...")
    if not test_installation():
        all_success = False
    
    # Résumé
    print("\n" + "=" * 50)
    if all_success:
        print("🎉 Installation terminée avec succès !")
        print("\n📋 Prochaines étapes:")
        print("1. Tester la connexion: python test_mariadb_connection.py")
        print("2. Lancer la migration: python migrate_to_mariadb.py")
    else:
        print("⚠️  Certaines installations ont échoué")
        print("💡 Vérifiez les erreurs ci-dessus et réessayez")
    
    return all_success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Installation interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        sys.exit(1) 