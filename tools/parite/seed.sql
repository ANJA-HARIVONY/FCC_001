-- Jeu de référence phase 9. Base fcc_001_parite seulement.
-- Mot de passe des trois comptes : parite-9 (hash Werkzeug scrypt).
-- Ciudad 1 Malabo / agencia 1 Centro. Ciudad 2 Bata / agencia 2 Norte.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM material_salida_linea;
DELETE FROM instalacion_traslado_linea;
DELETE FROM instalacion_foto;
DELETE FROM material_salida;
DELETE FROM instalacion;
DELETE FROM incident_notification;
DELETE FROM incident_comentario;
DELETE FROM incident_estado_historial;
DELETE FROM incident;
DELETE FROM client_sitio;
DELETE FROM client;
DELETE FROM apreciacion_dia;
DELETE FROM audit_log;
DELETE FROM etat;
DELETE FROM material;
DELETE FROM operateur;
DELETE FROM agencia;
DELETE FROM ciudad;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO ciudad (id, nombre) VALUES
  (1, 'Malabo'),
  (2, 'Bata');

INSERT INTO agencia (id, nombre, id_ciudad) VALUES
  (1, 'Centro', 1),
  (2, 'Norte', 2);

INSERT INTO operateur (
  id, nom, telephone, email, mot_de_passe_hash, id_ciudad, id_agencia, role, actif, cree_le, categoria
) VALUES
  (1, 'Parite Super', '240900001', 'parite.super@example.test',
   'scrypt:32768:8:1$mbPxZrxH6wTUnnkk$55b33d7c864b4784132d584dc22904590f768bfb8356a97fd9f0e2e0ea3688969801821d0b841892921b207163afa616655d864b222c8f600a9c2e47fd92c118',
   1, 1, 'superadmin', 1, '2026-10-21 07:00:00', 'atencion_cliente'),
  (2, 'Parite Admin', '240900002', 'parite.admin@example.test',
   'scrypt:32768:8:1$mbPxZrxH6wTUnnkk$55b33d7c864b4784132d584dc22904590f768bfb8356a97fd9f0e2e0ea3688969801821d0b841892921b207163afa616655d864b222c8f600a9c2e47fd92c118',
   1, 1, 'admin', 1, '2026-10-21 07:00:00', 'tecnico'),
  (3, 'Parite Usuario', '240900003', 'parite.usuario@example.test',
   'scrypt:32768:8:1$mbPxZrxH6wTUnnkk$55b33d7c864b4784132d584dc22904590f768bfb8356a97fd9f0e2e0ea3688969801821d0b841892921b207163afa616655d864b222c8f600a9c2e47fd92c118',
   1, 1, 'usuario', 1, '2026-10-21 07:00:00', 'atencion_cliente');

INSERT INTO client (
  id, nom, telephone, adresse, ville, id_ciudad, categoria, id_operateur
) VALUES
  (1, 'Ana Particular', '240111001', 'Calle 1', 'Malabo', 1, 'particular', 2),
  (2, 'Beta Corp', '240111002', 'Calle 2', 'Bata', 2, 'corporativo', 2);

INSERT INTO client_sitio (
  id, id_client, adresse, ville, activo, desde, creado_le
) VALUES
  (1, 1, 'Calle 1', 'Malabo', 1, '2026-10-21', '2026-10-21 07:30:00'),
  (2, 2, 'Calle 2', 'Bata', 1, '2026-10-21', '2026-10-21 07:30:00');

INSERT INTO incident (
  id, id_client, intitule, status, id_operateur, date_heure, ref_bitrix, bitrix_fetch_locked
) VALUES
  (1, 1, 'Sin internet', 'Pendiente', 2, '2026-10-21 08:00:00', NULL, 0),
  (2, 1, 'Corte de fibra', 'Solucionadas', 2, '2026-10-21 09:00:00', NULL, 0),
  (3, 2, 'Tarea Bitrix', 'Bitrix', 2, '2026-10-21 10:00:00', '1234567890', 0);

INSERT INTO material (id, nombre, tipo, activo, creado_le, modelo) VALUES
  (1, 'Antena', 'outillage', 1, '2026-10-21 07:40:00', 'A1'),
  (2, 'Cable', 'material_cliente', 1, '2026-10-21 07:40:00', 'M9'),
  (3, 'Router', 'outillage', 1, '2026-10-21 07:40:00', NULL),
  (4, 'Bobina', 'material_cliente', 1, '2026-10-21 07:40:00', 'B2');

INSERT INTO instalacion (
  id, id_client, id_sitio, tipo, estado, fecha, id_tecnico, id_operateur_registro, fecha_registro
) VALUES
  (1, 1, 1, 'nueva', 'en_curso', '2026-10-21', 2, 2, '2026-10-21 11:00:00'),
  (2, 2, 2, 'traslado', 'en_curso', '2026-10-21', 2, 2, '2026-10-21 11:05:00');

INSERT INTO instalacion_traslado_linea (id, id_instalacion, id_material, cantidad, accion) VALUES
  (1, 2, 3, 1, 'reutilizado');

INSERT INTO material_salida (
  id, fecha, id_tecnico, id_client, estado, id_operateur_registro, fecha_registro, tipo_salida, id_instalacion
) VALUES
  (1, '2026-10-21', 2, NULL, 'registrada', 2, '2026-10-21 11:10:00', 'uso_interno', NULL),
  (2, '2026-10-21', 2, 1, 'registrada', 2, '2026-10-21 11:20:00', 'incidencia', NULL),
  (3, '2026-10-21', 2, 1, 'registrada', 2, '2026-10-21 11:30:00', 'instalacion', 1);

INSERT INTO material_salida_linea (id, id_salida, id_material, cantidad) VALUES
  (1, 1, 1, 1),
  (2, 2, 2, 2),
  (3, 3, 4, 1);

INSERT INTO apreciacion_dia (
  id, fecha, texto, id_operateur, creado_en, modificado_en, id_ciudad, id_agencia
) VALUES
  (1, '2026-10-21', 'Día normal', 2, '2026-10-21 12:00:00', '2026-10-21 12:00:00', 1, 1);

INSERT INTO etat (
  id, titre, type_etat, contenu_ia, parametres, statut, utilisateur, date_creation, date_modification
) VALUES
  (1, 'Informe paridad', 'summary', 'Informe local de paridad.',
   '{"agence_id": 1}', 'generated', 'Parite Admin',
   '2026-10-21 12:30:00', '2026-10-21 12:30:00');

-- Flask promeut tous les role='admin' vers superadmin s'il ne trouve pas
-- cette ligne (ensure_legacy_admins_promoted_to_superadmin). Le marqueur
-- doit être là avant le premier démarrage du conteneur de parité.
INSERT INTO audit_log (action, detail, date_heure) VALUES
  ('PROMOTE_LEGACY_ADMIN', 'marqueur de parité', '2026-10-21 07:00:00');

ALTER TABLE ciudad AUTO_INCREMENT = 10;
ALTER TABLE agencia AUTO_INCREMENT = 10;
ALTER TABLE operateur AUTO_INCREMENT = 10;
ALTER TABLE client AUTO_INCREMENT = 10;
ALTER TABLE client_sitio AUTO_INCREMENT = 10;
ALTER TABLE incident AUTO_INCREMENT = 10;
ALTER TABLE material AUTO_INCREMENT = 10;
ALTER TABLE instalacion AUTO_INCREMENT = 10;
ALTER TABLE material_salida AUTO_INCREMENT = 10;
ALTER TABLE material_salida_linea AUTO_INCREMENT = 10;
ALTER TABLE instalacion_traslado_linea AUTO_INCREMENT = 10;
ALTER TABLE apreciacion_dia AUTO_INCREMENT = 10;
ALTER TABLE etat AUTO_INCREMENT = 10;
