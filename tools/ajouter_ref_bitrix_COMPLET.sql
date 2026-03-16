-- ============================================================
-- AJOUT ref_bitrix - Base utilisee par l'application (.env)
-- ============================================================
-- L'application se connecte a : fcc_001_db (voir .env DB_NAME)
-- Dans HeidiSQL : selectionnez la base fcc_001_db avant d'executer
-- ============================================================

USE fcc_001_db;

-- Etape 1 : Ajouter la colonne (ignorer si erreur "Duplicate column")


-- Etape 2 : Migrer les donnees (ref exacte uniquement)
-- Pour les refs en fin de texte (ex: "...82129"), executer : python tools/apply_ref_bitrix.py
UPDATE incident SET ref_bitrix = TRIM(observations) WHERE status = 'Bitrix' AND observations IS NOT NULL AND TRIM(observations) REGEXP '^[0-9]{5}$' AND LENGTH(TRIM(observations)) = 5;
