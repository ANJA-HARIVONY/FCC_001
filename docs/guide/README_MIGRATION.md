# Migration SQLite vers MariaDB - Guide Rapide

## 🚀 Démarrage Rapide

### Prérequis
1. **MariaDB installé et démarré** avec les credentials :
   - Host: `localhost`
   - User: `root`
   - Password: `toor`
   - Database: `fcc_001_db` (sera créée automatiquement)

2. **PyMySQL installé** (déjà fait ✅)

### Option 1: Migration Automatique (Recommandé)

Lancez simplement :
```bash
python migrate_all.py
```

Ce script lance automatiquement dans l'ordre :
1. Installation des dépendances
2. Test de connexion MariaDB
3. Migration complète des données
4. Mise à jour de la configuration

### Option 2: Migration Étape par Étape

```bash
# 1. Test de connexion (optionnel)
python test_mariadb_connection.py

# 2. Migration complète
python migrate_to_mariadb.py
```

## 📋 Ce qui est migré

- ✅ **Tous les clients** (avec nom, téléphone, adresse, ville, IPs)
- ✅ **Tous les opérateurs** 
- ✅ **Tous les incidents** (avec relations préservées)
- ✅ **Configuration Flask** mise à jour automatiquement
- ✅ **Sauvegardes** créées automatiquement

## 🔧 Structure MariaDB Créée

### Tables avec indexes optimisés :
- `client` (nom, ville indexés)
- `operateur` (nom indexé)  
- `incident` (client, opérateur, status, date indexés)

### Clés étrangères :
- `incident.id_client` → `client.id`
- `incident.id_operateur` → `operateur.id`

## ✅ Vérification Post-Migration

1. **Test de l'application** :
```bash
python app.py
```

2. **Vérification des données** :
Le script affiche automatiquement un rapport de vérification comparant SQLite et MariaDB.

## 🛠️ Dépannage

### Erreur de connexion MariaDB ?
```bash
# Vérifier que MariaDB est démarré
net start mariadb  # Windows
# ou
sudo systemctl start mariadb  # Linux
```

### Problème de credentials ?
Modifiez les paramètres dans les scripts :
- `migrate_to_mariadb.py` ligne 13-18
- `test_mariadb_connection.py` ligne 8-13

### Retour en arrière ?
Les scripts créent automatiquement des sauvegardes :
- `config_backup_YYYYMMDD_HHMMSS.py`
- `sqlite_backup_YYYYMMDD_HHMMSS.json`

## 📈 Avantages Post-Migration

- **Performance** : Meilleure gestion des requêtes complexes
- **Concurrence** : Accès multi-utilisateurs simultanés
- **Robustesse** : Transactions ACID complètes
- **Scalabilité** : Prêt pour la croissance des données
- **Sauvegardes** : Outils professionnels (mysqldump)

## 📂 Fichiers de Migration

| Fichier | Description |
|---------|-------------|
| `migrate_all.py` | **Script principal** - Lance tout automatiquement |
| `migrate_to_mariadb.py` | Migration complète des données |
| `test_mariadb_connection.py` | Test de connexion |
| `install_mariadb_dependencies.py` | Installation PyMySQL |
| `GUIDE_MIGRATION_MARIADB.md` | Guide détaillé complet |

---

## ⚡ Commande Ultra-Rapide

Pour les utilisateurs expérimentés :
```bash
python migrate_all.py
```

Puis testez :
```bash
python app.py
```

C'est tout ! 🎉 