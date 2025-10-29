#!/usr/bin/env node

/**
 * Script de prueba para verificar la integración de la base de datos
 * Ejecutar con: node server/test-database.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bd_netflix',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testDatabase() {
  console.log('🧪 Iniciando pruebas de base de datos...\n');

  try {
    // 1. Verificar conexión
    console.log('1. Verificando conexión a la base de datos...');
    const [rows] = await pool.query('SELECT 1 as ok');
    console.log('✅ Conexión exitosa:', rows[0]);

    // 2. Verificar estructura de tablas
    console.log('\n2. Verificando estructura de tablas...');
    const tables = ['usuarios', 'perfiles', 'listas', 'lista_items', 'contenido', 'imagenes'];
    
    for (const table of tables) {
      const [tableInfo] = await pool.query(`DESCRIBE ${table}`);
      console.log(`✅ Tabla ${table}: ${tableInfo.length} columnas`);
    }

    // 3. Verificar índices
    console.log('\n3. Verificando índices...');
    const [indexes] = await pool.query('SHOW INDEX FROM usuarios');
    console.log(`✅ Índices en usuarios: ${indexes.length} índices encontrados`);

    // 4. Probar inserción de datos de ejemplo
    console.log('\n4. Probando inserción de datos...');
    
    // Insertar usuario de prueba
    const [userResult] = await pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES (?, ?)',
      ['test@example.com', 'password123']
    );
    const userId = userResult.insertId;
    console.log(`✅ Usuario creado con ID: ${userId}`);

    // Insertar perfil de prueba
    const [profileResult] = await pool.query(
      'INSERT INTO perfiles (usuario_id, name, avatar_url, is_kids) VALUES (?, ?, ?, ?)',
      [userId, 'Perfil de Prueba', 'https://example.com/avatar.jpg', 0]
    );
    const profileId = profileResult.insertId;
    console.log(`✅ Perfil creado con ID: ${profileId}`);

    // Verificar que se creó automáticamente la lista
    const [listResult] = await pool.query(
      'SELECT id FROM listas WHERE perfil_id = ? AND type = "MY_LIST"',
      [profileId]
    );
    console.log(`✅ Lista automática creada con ID: ${listResult[0].id}`);

    // Insertar contenido de prueba
    const [contentResult] = await pool.query(
      'INSERT INTO contenido (title, type, overview, poster_url, backdrop_url) VALUES (?, ?, ?, ?, ?)',
      ['Película de Prueba', 'movie', 'Una película de prueba', 'https://example.com/poster.jpg', 'https://example.com/backdrop.jpg']
    );
    const contentId = contentResult.insertId;
    console.log(`✅ Contenido creado con ID: ${contentId}`);

    // Agregar contenido a la lista
    const [listItemResult] = await pool.query(
      'INSERT INTO lista_items (lista_id, content_id, content_type) VALUES (?, ?, ?)',
      [listResult[0].id, contentId, 'movie']
    );
    console.log(`✅ Contenido agregado a la lista con ID: ${listItemResult.insertId}`);

    // 5. Probar consultas
    console.log('\n5. Probando consultas...');
    
    // Obtener usuario con perfiles
    const [userWithProfiles] = await pool.query(`
      SELECT u.*, p.id as profile_id, p.name as profile_name 
      FROM usuarios u 
      LEFT JOIN perfiles p ON u.id = p.usuario_id 
      WHERE u.id = ?
    `, [userId]);
    console.log(`✅ Usuario con perfiles: ${userWithProfiles.length} registros`);

    // Obtener lista con contenido
    const [listWithContent] = await pool.query(`
      SELECT li.*, c.title, c.type as content_type 
      FROM lista_items li 
      JOIN contenido c ON li.content_id = c.id 
      WHERE li.lista_id = ?
    `, [listResult[0].id]);
    console.log(`✅ Lista con contenido: ${listWithContent.length} items`);

    // 6. Limpiar datos de prueba
    console.log('\n6. Limpiando datos de prueba...');
    await pool.query('DELETE FROM usuarios WHERE id = ?', [userId]);
    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\nLa base de datos está correctamente configurada y lista para usar.');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Ejecutar las pruebas
testDatabase().catch(console.error);
