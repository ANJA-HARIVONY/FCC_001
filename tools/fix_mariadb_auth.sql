-- Corriger l'authentification MariaDB : GSSAPI -> mysql_native_password
-- A executer en tant qu'admin sur le serveur MariaDB (mysql -u root -p)
--
-- Pour voir les utilisateurs : SELECT user, host, plugin FROM mysql.user;

-- Utilisateur heidi (credentials .env)
ALTER USER 'heidi'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('motdepasse123');
ALTER USER 'heidi'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('motdepasse123');

FLUSH PRIVILEGES;
