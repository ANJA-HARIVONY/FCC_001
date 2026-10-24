-- Compte initial, même règle que ensure_default_admin_operateur :
-- identifiant admin, mot de passe admin, rôle superadmin.
-- Villes et agences : ensure_ciudad_agencia_seed. Rien n'est inséré si un opérateur existe déjà.

INSERT INTO ciudad (nombre)
SELECT 'Malabo' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudad WHERE nombre = 'Malabo');
INSERT INTO ciudad (nombre)
SELECT 'Bata' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudad WHERE nombre = 'Bata');
INSERT INTO ciudad (nombre)
SELECT 'Mongomo' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudad WHERE nombre = 'Mongomo');

INSERT INTO agencia (nombre, id_ciudad)
SELECT 'Malabo II Cede', c.id FROM ciudad c
WHERE c.nombre = 'Malabo' AND NOT EXISTS (SELECT 1 FROM agencia WHERE nombre = 'Malabo II Cede');
INSERT INTO agencia (nombre, id_ciudad)
SELECT 'Afrimal', c.id FROM ciudad c
WHERE c.nombre = 'Malabo' AND NOT EXISTS (SELECT 1 FROM agencia WHERE nombre = 'Afrimal');
INSERT INTO agencia (nombre, id_ciudad)
SELECT 'Buena Esperanza 1', c.id FROM ciudad c
WHERE c.nombre = 'Malabo' AND NOT EXISTS (SELECT 1 FROM agencia WHERE nombre = 'Buena Esperanza 1');
INSERT INTO agencia (nombre, id_ciudad)
SELECT 'Cocoteros', c.id FROM ciudad c
WHERE c.nombre = 'Bata' AND NOT EXISTS (SELECT 1 FROM agencia WHERE nombre = 'Cocoteros');
INSERT INTO agencia (nombre, id_ciudad)
SELECT 'Mongomo', c.id FROM ciudad c
WHERE c.nombre = 'Mongomo' AND NOT EXISTS (SELECT 1 FROM agencia WHERE nombre = 'Mongomo');

INSERT INTO operateur (
  nom, telephone, email, mot_de_passe_hash, id_ciudad, id_agencia, role, actif, cree_le, categoria
)
SELECT
  'admin',
  'admin',
  'admin',
  'scrypt:32768:8:1$mGf1KyB9xjhmgwLl$b43acaccc12409073764002a0dbd155254ae2434c94603592909a8bd3e4d61748dda462eb02382f76113faf600979e6ccdb0b9cfec0597748d081fdd722c6b9a',
  c.id,
  a.id,
  'superadmin',
  1,
  NOW(),
  'atencion_cliente'
FROM ciudad c
JOIN agencia a ON a.id_ciudad = c.id AND a.nombre = 'Malabo II Cede'
WHERE c.nombre = 'Malabo'
  AND NOT EXISTS (SELECT 1 FROM operateur);
