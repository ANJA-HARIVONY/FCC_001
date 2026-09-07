-- Colonnes RADIUS sur `client` (idempotent — sûr à relancer)
--
-- Dans le conteneur (recommandé) :
--   docker compose exec -T mariadb sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < scripts/add_client_radius_columns.sql
--
-- Ou interactif :
--   docker compose exec mariadb mysql -u fcc_user -p fcc_001_db
--   puis coller le contenu de ce fichier.

SET @db := DATABASE();

-- username_radius
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client' AND COLUMN_NAME = 'username_radius'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE client ADD COLUMN username_radius VARCHAR(100) NULL',
  'SELECT ''username_radius already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- radius_cache_json
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client' AND COLUMN_NAME = 'radius_cache_json'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE client ADD COLUMN radius_cache_json TEXT NULL',
  'SELECT ''radius_cache_json already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- radius_cache_at
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client' AND COLUMN_NAME = 'radius_cache_at'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE client ADD COLUMN radius_cache_at DATETIME NULL',
  'SELECT ''radius_cache_at already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- index
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'client' AND INDEX_NAME = 'ix_client_username_radius'
);
SET @sql := IF(@exists = 0,
  'CREATE INDEX ix_client_username_radius ON client (username_radius)',
  'SELECT ''ix_client_username_radius already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SHOW COLUMNS FROM client LIKE '%radius%';
