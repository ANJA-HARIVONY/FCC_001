# Guide - Modification manuelle de la base de données

## IMPORTANT : Quelle base de donnees ?

L'application utilise la base **fcc_001_db** (voir .env DB_NAME).

Si vous avez plusieurs bases (fcc_001_db, fcc_001_dbV3...), vous DEVEZ modifier **fcc_001_db** - celle a laquelle l'application se connecte.

## Prérequis

- Accès au serveur MariaDB (client `mysql` ou HeidiSQL, phpMyAdmin, etc.)
- Identifiants admin (root) pour l'étape 1 si erreur GSSAPI

---

## Étape 1 : Corriger l'authentification (si erreur GSSAPI)

**À faire uniquement si** vous avez l'erreur : `Authentication plugin 'auth_gssapi_client' not configured`

Connectez-vous en tant qu'**administrateur** (root) :

```bash
mysql -u root -p
```

Puis exécutez :

```sql
-- Voir les utilisateurs heidi existants
SELECT user, host, plugin FROM mysql.user WHERE user = 'heidi';

-- Corriger l'authentification (adapter localhost ou % selon le résultat ci-dessus)
ALTER USER 'heidi'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('motdepasse123');
ALTER USER 'heidi'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('motdepasse123');

FLUSH PRIVILEGES;
EXIT;
```

---

## Étape 2 : Ajouter la colonne ref_bitrix

Connectez-vous avec l'utilisateur **heidi** (ou root) :

```bash
mysql -u heidi -p fcc_001_db
```

Exécutez (copier UNIQUEMENT la ligne ci-dessous, sans les guillemets) :

    ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL;

Vérification :

    DESCRIBE incident;

Vous devez voir la colonne `ref_bitrix` dans la liste.

---

## Étape 3 : Migrer les données (optionnel)

Copier les références Bitrix à 5 chiffres de `observations` vers `ref_bitrix` :

    UPDATE incident SET ref_bitrix = TRIM(observations) WHERE status = 'Bitrix' AND observations IS NOT NULL AND TRIM(observations) REGEXP '^[0-9]{5}$' AND LENGTH(TRIM(observations)) = 5;

Vérification :

    SELECT id, intitule, observations, ref_bitrix, status FROM incident WHERE status = 'Bitrix' AND ref_bitrix IS NOT NULL LIMIT 10;

---

## Résumé des commandes SQL

| Étape | Commande |
|-------|----------|
| 1 - Auth | `ALTER USER 'heidi'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('motdepasse123'); FLUSH PRIVILEGES;` |
| 2 - Colonne | `ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL;` |
| 3 - Données | `UPDATE incident SET ref_bitrix = TRIM(observations) WHERE status = 'Bitrix' AND TRIM(observations) REGEXP '^[0-9]{5}$' AND LENGTH(TRIM(observations)) = 5;` |

---

## Avec HeidiSQL ou phpMyAdmin

1. **HeidiSQL** : Connexion → Onglet "Requête" → Coller le SQL → Exécuter (F9)
2. **phpMyAdmin** : Sélectionner la base `fcc_001_db` → Onglet "SQL" → Coller → Exécuter
