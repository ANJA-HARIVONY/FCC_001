/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `agencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agencia` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `id_ciudad` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_ciudad` (`id_ciudad`),
  CONSTRAINT `agencia_ibfk_1` FOREIGN KEY (`id_ciudad`) REFERENCES `ciudad` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `apreciacion_dia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `apreciacion_dia` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `texto` varchar(120) NOT NULL,
  `id_operateur` int(11) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `modificado_en` datetime NOT NULL,
  `id_ciudad` int(11) DEFAULT NULL,
  `id_agencia` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_apreciacion_dia_fecha_ciudad_agencia` (`fecha`,`id_ciudad`,`id_agencia`),
  KEY `ix_apreciacion_dia_id_operateur` (`id_operateur`),
  KEY `ix_apreciacion_dia_fecha` (`fecha`),
  KEY `ix_apreciacion_dia_id_ciudad` (`id_ciudad`),
  KEY `ix_apreciacion_dia_id_agencia` (`id_agencia`),
  CONSTRAINT `apreciacion_dia_ibfk_1` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_apreciacion_dia_id_agencia` FOREIGN KEY (`id_agencia`) REFERENCES `agencia` (`id`),
  CONSTRAINT `fk_apreciacion_dia_id_ciudad` FOREIGN KEY (`id_ciudad`) REFERENCES `ciudad` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_operateur` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `detail` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `date_heure` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_operateur` (`id_operateur`),
  CONSTRAINT `fk_audit_operateur` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=41226 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ciudad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ciudad` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `telephone` varchar(100) NOT NULL,
  `adresse` varchar(200) NOT NULL,
  `ville` varchar(100) NOT NULL,
  `ip_router` varchar(50) DEFAULT NULL,
  `ip_antea` varchar(50) DEFAULT NULL,
  `id_ciudad` int(11) DEFAULT NULL,
  `categoria` varchar(20) NOT NULL DEFAULT 'particular',
  `username_radius` varchar(100) DEFAULT NULL,
  `radius_cache_json` text DEFAULT NULL,
  `radius_cache_at` datetime DEFAULT NULL,
  `id_operateur` int(11) DEFAULT NULL,
  `id_operateur_modificacion` int(11) DEFAULT NULL,
  `modifie_le` datetime DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `gps_actualizado_le` datetime DEFAULT NULL,
  `id_operateur_gps` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client_nom` (`nom`),
  KEY `idx_client_ville` (`ville`),
  KEY `fk_client_ciudad` (`id_ciudad`),
  KEY `ix_client_categoria` (`categoria`),
  KEY `ix_client_username_radius` (`username_radius`),
  CONSTRAINT `fk_client_ciudad` FOREIGN KEY (`id_ciudad`) REFERENCES `ciudad` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5984 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `client_sitio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_sitio` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_client` int(11) NOT NULL,
  `adresse` varchar(200) NOT NULL,
  `ville` varchar(100) NOT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `gps_actualizado_le` datetime DEFAULT NULL,
  `id_operateur_gps` int(11) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL,
  `desde` date DEFAULT NULL,
  `hasta` date DEFAULT NULL,
  `creado_le` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_operateur_gps` (`id_operateur_gps`),
  KEY `ix_client_sitio_activo` (`activo`),
  KEY `ix_client_sitio_id_client` (`id_client`),
  CONSTRAINT `client_sitio_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_sitio_ibfk_2` FOREIGN KEY (`id_operateur_gps`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8352 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `etat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `etat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titre` varchar(255) NOT NULL,
  `type_etat` varchar(50) NOT NULL,
  `periode_debut` date DEFAULT NULL,
  `periode_fin` date DEFAULT NULL,
  `contenu_ia` text DEFAULT NULL,
  `graphiques_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`graphiques_data`)),
  `parametres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parametres`)),
  `statut` varchar(20) NOT NULL,
  `utilisateur` varchar(100) DEFAULT NULL,
  `hash_cache` varchar(64) DEFAULT NULL,
  `date_creation` datetime NOT NULL,
  `date_modification` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_etat_periode_fin` (`periode_fin`),
  KEY `ix_etat_statut` (`statut`),
  KEY `ix_etat_type_etat` (`type_etat`),
  KEY `ix_etat_hash_cache` (`hash_cache`),
  KEY `ix_etat_date_creation` (`date_creation`),
  KEY `ix_etat_titre` (`titre`),
  KEY `ix_etat_periode_debut` (`periode_debut`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `incident`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_client` int(11) NOT NULL,
  `intitule` varchar(200) NOT NULL,
  `observations` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Pendiente',
  `id_operateur` int(11) NOT NULL,
  `date_heure` datetime NOT NULL DEFAULT current_timestamp(),
  `ref_bitrix` varchar(10) DEFAULT NULL,
  `bitrix_task_status` varchar(2) DEFAULT NULL,
  `bitrix_status_label` varchar(80) DEFAULT NULL,
  `bitrix_status_emoji` varchar(10) DEFAULT NULL,
  `bitrix_responsible` varchar(120) DEFAULT NULL,
  `bitrix_fetched_at` datetime DEFAULT NULL,
  `bitrix_fetch_locked` tinyint(1) NOT NULL DEFAULT 0,
  `id_operateur_modificacion` int(11) DEFAULT NULL,
  `modifie_le` datetime DEFAULT NULL,
  `bitrix_deadline` datetime DEFAULT NULL,
  `bitrix_created_at` datetime DEFAULT NULL,
  `bitrix_closed_at` datetime DEFAULT NULL,
  `bitrix_changed_at` datetime DEFAULT NULL,
  `bitrix_priority` varchar(2) DEFAULT NULL,
  `bitrix_moved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_incident_client` (`id_client`),
  KEY `idx_incident_operateur` (`id_operateur`),
  KEY `idx_incident_status` (`status`),
  KEY `idx_incident_date` (`date_heure`),
  CONSTRAINT `incident_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incident_ibfk_2` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26848 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `incident_comentario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_comentario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_incident` int(11) NOT NULL,
  `id_operateur` int(11) DEFAULT NULL,
  `contenido` varchar(1000) NOT NULL,
  `creado_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_incident_comentario_incident` (`id_incident`),
  KEY `fk_incident_comentario_operateur` (`id_operateur`),
  CONSTRAINT `fk_incident_comentario_incident` FOREIGN KEY (`id_incident`) REFERENCES `incident` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_incident_comentario_operateur` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=739 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `incident_estado_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_estado_historial` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_incident` int(11) NOT NULL,
  `estado_anterior` varchar(20) DEFAULT NULL,
  `estado_nuevo` varchar(20) NOT NULL,
  `id_operateur` int(11) DEFAULT NULL,
  `cambiado_en` datetime NOT NULL,
  `ref_bitrix` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_incident_estado_historial_id_operateur` (`id_operateur`),
  KEY `ix_incident_estado_historial_cambiado_en` (`cambiado_en`),
  KEY `ix_incident_estado_historial_id_incident` (`id_incident`),
  CONSTRAINT `incident_estado_historial_ibfk_1` FOREIGN KEY (`id_incident`) REFERENCES `incident` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incident_estado_historial_ibfk_2` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10075 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `incident_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_notification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_incident` int(11) NOT NULL,
  `id_destinataire` int(11) NOT NULL,
  `id_auteur` int(11) DEFAULT NULL,
  `message` varchar(255) NOT NULL,
  `lue` tinyint(1) NOT NULL,
  `cree_le` datetime NOT NULL,
  `lue_le` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_incident_notification_lue` (`lue`),
  KEY `ix_incident_notification_cree_le` (`cree_le`),
  KEY `ix_incident_notification_id_destinataire` (`id_destinataire`),
  KEY `ix_incident_notification_id_auteur` (`id_auteur`),
  KEY `ix_incident_notification_id_incident` (`id_incident`),
  CONSTRAINT `incident_notification_ibfk_1` FOREIGN KEY (`id_incident`) REFERENCES `incident` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incident_notification_ibfk_2` FOREIGN KEY (`id_destinataire`) REFERENCES `operateur` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incident_notification_ibfk_3` FOREIGN KEY (`id_auteur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `instalacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `instalacion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_client` int(11) NOT NULL,
  `id_sitio` int(11) DEFAULT NULL,
  `id_sitio_origen` int(11) DEFAULT NULL,
  `tipo` varchar(20) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `fecha` date NOT NULL,
  `id_tecnico` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `id_operateur_registro` int(11) NOT NULL,
  `fecha_registro` datetime NOT NULL,
  `id_operateur_modificacion` int(11) DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `terminada_le` datetime DEFAULT NULL,
  `id_operateur_terminada` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_sitio_origen` (`id_sitio_origen`),
  KEY `id_operateur_registro` (`id_operateur_registro`),
  KEY `id_operateur_modificacion` (`id_operateur_modificacion`),
  KEY `id_operateur_terminada` (`id_operateur_terminada`),
  KEY `ix_instalacion_id_tecnico` (`id_tecnico`),
  KEY `ix_instalacion_id_client` (`id_client`),
  KEY `ix_instalacion_tipo` (`tipo`),
  KEY `ix_instalacion_fecha` (`fecha`),
  KEY `ix_instalacion_id_sitio` (`id_sitio`),
  KEY `ix_instalacion_estado` (`estado`),
  CONSTRAINT `instalacion_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `instalacion_ibfk_2` FOREIGN KEY (`id_sitio`) REFERENCES `client_sitio` (`id`) ON DELETE SET NULL,
  CONSTRAINT `instalacion_ibfk_3` FOREIGN KEY (`id_sitio_origen`) REFERENCES `client_sitio` (`id`) ON DELETE SET NULL,
  CONSTRAINT `instalacion_ibfk_4` FOREIGN KEY (`id_tecnico`) REFERENCES `operateur` (`id`),
  CONSTRAINT `instalacion_ibfk_5` FOREIGN KEY (`id_operateur_registro`) REFERENCES `operateur` (`id`),
  CONSTRAINT `instalacion_ibfk_6` FOREIGN KEY (`id_operateur_modificacion`) REFERENCES `operateur` (`id`),
  CONSTRAINT `instalacion_ibfk_7` FOREIGN KEY (`id_operateur_terminada`) REFERENCES `operateur` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `instalacion_foto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `instalacion_foto` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_client` int(11) DEFAULT NULL,
  `id_salida` int(11) DEFAULT NULL,
  `id_sitio` int(11) DEFAULT NULL,
  `fichier` varchar(255) NOT NULL,
  `id_operateur` int(11) DEFAULT NULL,
  `creado_le` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_operateur` (`id_operateur`),
  KEY `ix_instalacion_foto_id_salida` (`id_salida`),
  KEY `ix_instalacion_foto_id_client` (`id_client`),
  KEY `ix_instalacion_foto_id_sitio` (`id_sitio`),
  CONSTRAINT `instalacion_foto_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `instalacion_foto_ibfk_2` FOREIGN KEY (`id_salida`) REFERENCES `material_salida` (`id`) ON DELETE SET NULL,
  CONSTRAINT `instalacion_foto_ibfk_3` FOREIGN KEY (`id_sitio`) REFERENCES `client_sitio` (`id`) ON DELETE CASCADE,
  CONSTRAINT `instalacion_foto_ibfk_4` FOREIGN KEY (`id_operateur`) REFERENCES `operateur` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `instalacion_traslado_linea`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `instalacion_traslado_linea` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_instalacion` int(11) NOT NULL,
  `id_material` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `accion` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_material` (`id_material`),
  KEY `ix_instalacion_traslado_linea_id_instalacion` (`id_instalacion`),
  CONSTRAINT `instalacion_traslado_linea_ibfk_1` FOREIGN KEY (`id_instalacion`) REFERENCES `instalacion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `instalacion_traslado_linea_ibfk_2` FOREIGN KEY (`id_material`) REFERENCES `material` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `creado_le` datetime NOT NULL,
  `descripcion` text DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `modificado_le` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_material_nombre_tipo` (`nombre`,`tipo`),
  KEY `ix_material_tipo` (`tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_salida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_salida` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `id_tecnico` int(11) NOT NULL,
  `id_client` int(11) DEFAULT NULL,
  `estado` varchar(20) NOT NULL,
  `id_operateur_registro` int(11) NOT NULL,
  `fecha_registro` datetime NOT NULL,
  `id_operateur_modificacion` int(11) DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `tipo_salida` varchar(20) NOT NULL DEFAULT 'uso_interno',
  `id_instalacion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_operateur_registro` (`id_operateur_registro`),
  KEY `id_operateur_modificacion` (`id_operateur_modificacion`),
  KEY `ix_material_salida_fecha` (`fecha`),
  KEY `ix_material_salida_id_tecnico` (`id_tecnico`),
  KEY `ix_material_salida_id_client` (`id_client`),
  KEY `ix_material_salida_tipo_salida` (`tipo_salida`),
  KEY `ix_material_salida_id_instalacion` (`id_instalacion`),
  CONSTRAINT `fk_material_salida_id_instalacion` FOREIGN KEY (`id_instalacion`) REFERENCES `instalacion` (`id`) ON DELETE SET NULL,
  CONSTRAINT `material_salida_ibfk_1` FOREIGN KEY (`id_tecnico`) REFERENCES `operateur` (`id`),
  CONSTRAINT `material_salida_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `client` (`id`),
  CONSTRAINT `material_salida_ibfk_3` FOREIGN KEY (`id_operateur_registro`) REFERENCES `operateur` (`id`),
  CONSTRAINT `material_salida_ibfk_4` FOREIGN KEY (`id_operateur_modificacion`) REFERENCES `operateur` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_salida_linea`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_salida_linea` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_salida` int(11) NOT NULL,
  `id_material` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_material` (`id_material`),
  KEY `ix_material_salida_linea_id_salida` (`id_salida`),
  CONSTRAINT `material_salida_linea_ibfk_1` FOREIGN KEY (`id_salida`) REFERENCES `material_salida` (`id`) ON DELETE CASCADE,
  CONSTRAINT `material_salida_linea_ibfk_2` FOREIGN KEY (`id_material`) REFERENCES `material` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `operateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `operateur` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `mot_de_passe_hash` varchar(255) NOT NULL DEFAULT '',
  `id_ciudad` int(11) NOT NULL,
  `id_agencia` int(11) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'usuario',
  `avatar_url` varchar(500) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `cree_le` datetime NOT NULL DEFAULT current_timestamp(),
  `modifie_le` datetime DEFAULT NULL,
  `categoria` varchar(20) NOT NULL DEFAULT 'atencion_cliente',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operateur_email` (`email`),
  KEY `idx_operateur_nom` (`nom`),
  KEY `fk_operateur_ciudad` (`id_ciudad`),
  KEY `fk_operateur_agencia` (`id_agencia`),
  KEY `ix_operateur_categoria` (`categoria`),
  CONSTRAINT `fk_operateur_agencia` FOREIGN KEY (`id_agencia`) REFERENCES `agencia` (`id`),
  CONSTRAINT `fk_operateur_ciudad` FOREIGN KEY (`id_ciudad`) REFERENCES `ciudad` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

