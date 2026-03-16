-- ==========================================
-- SCRIPT SQL PARA CREAR TABLA ETAT
-- ==========================================
-- Ejecuta este script en tu base de datos MariaDB/MySQL

USE fcc_001_db;

-- Crear tabla etat para Estados IA
CREATE TABLE IF NOT EXISTS etat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    type_etat VARCHAR(50) NOT NULL,
    periode_debut DATE NULL,
    periode_fin DATE NULL,
    contenu_ia TEXT NULL,
    graphiques_data JSON NULL,
    parametres JSON NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'generated',
    utilisateur VARCHAR(100) NULL,
    hash_cache VARCHAR(64) NULL,
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX ix_etat_titre ON etat(titre);
CREATE INDEX ix_etat_type_etat ON etat(type_etat);
CREATE INDEX ix_etat_periode_debut ON etat(periode_debut);
CREATE INDEX ix_etat_periode_fin ON etat(periode_fin);
CREATE INDEX ix_etat_statut ON etat(statut);
CREATE INDEX ix_etat_hash_cache ON etat(hash_cache);
CREATE INDEX ix_etat_date_creation ON etat(date_creation);

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla etat creada exitosamente' AS resultado;
DESCRIBE etat;

-- Verificar índices
SHOW INDEX FROM etat;