-- ============================================================
-- Migration ref_bitrix - Script SQL complet
-- ============================================================
-- Base : fcc_001_db
-- 1. Ref exacte (observations = "58313")
-- 2. Ref en fin de texte (observations = "...82129")
-- ============================================================

USE fcc_001_db;

-- Etape 1 : Colonne (ignorer si "Duplicate column")


-- Etape 2 : Ref exacte (observations = 5 chiffres uniquement)
UPDATE incident 
SET ref_bitrix = TRIM(observations) 
WHERE status = 'Bitrix' 
  AND observations IS NOT NULL 
  AND TRIM(observations) REGEXP '^[0-9]{5}$' 
  AND LENGTH(TRIM(observations)) = 5;

-- Etape 3 : Ref en fin de texte (derniere sequence de 5 chiffres)
-- Ex: "EL ROUTER...CONTRASEÑA\n82129" -> 82129
UPDATE incident 
SET ref_bitrix = REVERSE(REGEXP_SUBSTR(REVERSE(TRIM(observations)), '[0-9]{5}'))
WHERE status = 'Bitrix' 
  AND observations IS NOT NULL 
  AND TRIM(observations) REGEXP '[0-9]{5}'
  AND (ref_bitrix IS NULL OR ref_bitrix = '');
