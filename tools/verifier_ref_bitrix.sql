-- Verification de la colonne ref_bitrix
-- Executer dans HeidiSQL pour verifier

-- 1. Structure de la table (ref_bitrix doit apparaitre)
DESCRIBE incident;

-- 2. Nombre d'incidents Bitrix avec ref_bitrix renseignee
SELECT COUNT(*) AS nb_avec_ref FROM incident WHERE status = 'Bitrix' AND ref_bitrix IS NOT NULL AND ref_bitrix != '';

-- 3. Exemples
SELECT id, intitule, observations, ref_bitrix, status FROM incident WHERE status = 'Bitrix' AND ref_bitrix IS NOT NULL LIMIT 10;
