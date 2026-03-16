# Scripts d'initialisation MariaDB

Ce dossier contient les scripts SQL exécutés au **premier démarrage** du conteneur MariaDB.

## Fonctionnement

- Les fichiers `.sql` sont exécutés par **ordre alphabétique**
- Les fichiers `.sh` sont exécutés s'ils sont exécutables
- L'image MariaDB exécute ces scripts après la création de la base `MYSQL_DATABASE`
- Les **tables** sont créées par l'application via `docker-entrypoint.sh` (Flask/SQLAlchemy)

## Fichiers présents

| Fichier | Rôle |
|---------|------|
| `01-schema-settings.sql` | Configure utf8mb4 pour les sessions |
| `.gitkeep` | Maintient le dossier dans Git |

## Ajouter des scripts personnalisés

Pour des données de référence (états, opérateurs par défaut, etc.) :

1. Créez un fichier `02-donnees-reference.sql` (ou autre nom avec préfixe numérique)
2. Utilisez `USE \`fcc_001_db\`;` en première ligne si nécessaire
3. Les scripts s'exécutent uniquement au **premier** démarrage (volume vide)
