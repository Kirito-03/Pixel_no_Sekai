-- Base de datos
CREATE DATABASE IF NOT EXISTS `bd_netflix` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `bd_netflix`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: perfiles
CREATE TABLE IF NOT EXISTS `perfiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `avatar_url` varchar(500) NOT NULL,
  `is_kids` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_perfiles_usuario_id` (`usuario_id`),
  CONSTRAINT `fk_perfiles_usuario_id` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: listas (ej.: MY_LIST)
CREATE TABLE IF NOT EXISTS `listas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `perfil_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('MY_LIST') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listas_perfil_id` (`perfil_id`),
  CONSTRAINT `fk_listas_perfil_id` FOREIGN KEY (`perfil_id`) REFERENCES `perfiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: lista_items (integrado con 'anime')
CREATE TABLE IF NOT EXISTS `lista_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lista_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `content_type` enum('movie','tv','anime') NOT NULL,
  `added_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_lista_items_lista_id` (`lista_id`),
  KEY `idx_lista_items_content_id` (`content_id`),
  UNIQUE KEY `uniq_lista_item` (`lista_id`,`content_id`,`content_type`),
  CONSTRAINT `fk_lista_items_lista_id` FOREIGN KEY (`lista_id`) REFERENCES `listas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: contenido (incluye tipo 'anime')
CREATE TABLE IF NOT EXISTS `contenido` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `type` enum('movie','tv','anime') NOT NULL,
  `overview` text,
  `poster_url` varchar(500),
  `backdrop_url` varchar(500),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_contenido_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: imagenes (entity_type incluye 'anime')
CREATE TABLE IF NOT EXISTS `imagenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` int(11) NOT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `url` varchar(500) NOT NULL,
  `type` enum('poster','backdrop','avatar','thumbnail') NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `entity_type` enum('contenido','perfil','anime') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_imagenes_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: password_resets (soporte para reset de contraseña)
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_resets_token` (`token`),
  KEY `idx_password_resets_usuario_id` (`usuario_id`),
  CONSTRAINT `fk_password_resets_usuario_id` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Notas:
-- 1) El backend crea automáticamente la lista 'Mi lista' (type='MY_LIST') al crear un perfil.
--    No necesitas ejecutar un INSERT manual para la lista por defecto.
-- 2) El backend valida content_type en POST/DELETE (/my-list) para que sólo sea 'movie','tv','anime'.
-- 3) Si migras una BD existente, asegúrate de:
--    ALTER TABLE lista_items MODIFY COLUMN content_type ENUM('movie','tv','anime') NOT NULL;
--    ALTER TABLE imagenes MODIFY COLUMN entity_type ENUM('contenido','perfil','anime') DEFAULT NULL;
--    ALTER TABLE listas ADD COLUMN name VARCHAR(100) NOT NULL;
--    ALTER TABLE listas MODIFY COLUMN type ENUM('MY_LIST') NOT NULL;

-- Migración idempotente (para bases ya existentes):
-- Estas sentencias ajustan el esquema si fue creado con una versión anterior.
-- Puedes ejecutar todo el archivo sin riesgo; si ya coincide, no cambiará nada.
ALTER TABLE `listas`
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `type` ENUM('MY_LIST') NOT NULL;

ALTER TABLE `lista_items`
  MODIFY COLUMN `content_type` ENUM('movie','tv','anime') NOT NULL;

ALTER TABLE `imagenes`
  MODIFY COLUMN `entity_type` ENUM('contenido','perfil','anime') DEFAULT NULL;

-- =============================
-- Tablas de DESCARGAS
-- =============================

-- Tabla: descargas (un contenedor por perfil)
CREATE TABLE IF NOT EXISTS `descargas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `perfil_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT 'Descargas',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_descargas_perfil` (`perfil_id`),
  KEY `idx_descargas_perfil_id` (`perfil_id`),
  CONSTRAINT `fk_descargas_perfil_id` FOREIGN KEY (`perfil_id`) REFERENCES `perfiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla: descarga_items (items dentro del contenedor de descargas)
CREATE TABLE IF NOT EXISTS `descarga_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descarga_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `content_type` enum('movie','tv','anime') NOT NULL,
  `status` enum('PENDING','DOWNLOADING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  `progress` tinyint unsigned NOT NULL DEFAULT 0,
  `file_path` varchar(255) DEFAULT NULL,
  `added_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_descarga_item` (`descarga_id`,`content_id`,`content_type`),
  KEY `idx_descarga_items_descarga_id` (`descarga_id`),
  CONSTRAINT `fk_descarga_items_descarga_id` FOREIGN KEY (`descarga_id`) REFERENCES `descargas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migración idempotente para bases existentes
ALTER TABLE `descargas`
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) NOT NULL DEFAULT 'Descargas',
  ADD UNIQUE KEY `uniq_descargas_perfil` (`perfil_id`),
  ADD KEY `idx_descargas_perfil_id` (`perfil_id`);

ALTER TABLE `descarga_items`
  MODIFY COLUMN `content_type` ENUM('movie','tv','anime') NOT NULL,
  ADD UNIQUE KEY `uniq_descarga_item` (`descarga_id`,`content_id`,`content_type`),
  ADD KEY `idx_descarga_items_descarga_id` (`descarga_id`);