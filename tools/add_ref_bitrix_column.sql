-- Ajout de la colonne ref_bitrix a la table incident
-- A executer sur MariaDB si la migration Flask n'a pas ete appliquee

ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL;
