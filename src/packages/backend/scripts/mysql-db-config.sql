CREATE USER 'golobe'@'localhost' IDENTIFIED BY '***';
CREATE DATABASE golobe DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;
grant all privileges on golobe.* to golobe@localhost ;
SET GLOBAL time_zone = '+0:00';
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;

