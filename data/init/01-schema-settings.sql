-- =============================================================================
-- FCC_001 - Script d'initialisation MariaDB
-- Exécuté au premier démarrage du conteneur MariaDB
-- Les tables sont créées par l'application via docker-entrypoint.sh
-- =============================================================================

-- S'assurer que la base utilise utf8mb4 (déjà configuré via MYSQL_CHARSET)
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_results = utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;
