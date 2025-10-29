import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const app = express();

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Permitir cualquier origen en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Middleware de logging para desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// DB pool
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

// Health
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Auth: register
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email y password requeridos' });
  try {
    const [exists] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Email ya registrado' });

    const [result] = await pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES (?, ?)',
      [email, password]
    );

    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ message: 'Error al registrar', error: e.message });
  }
});

// Auth: login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email y password requeridos' });
  try {
    const [rows] = await pool.query('SELECT id, password_hash FROM usuarios WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Credenciales inválidas' });
    const user = rows[0];
    const ok = password === user.password_hash;
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
    res.json({ id: user.id, email });
  } catch (e) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: e.message });
  }
});

// Profiles: list
app.get('/profiles', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  try {
    const [rows] = await pool.query('SELECT id, usuario_id, name, avatar_url, is_kids FROM perfiles WHERE usuario_id = ?', [userId]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener perfiles', error: e.message });
  }
});

// Profiles: create (and ensure "Mi lista")
app.post('/profiles', async (req, res) => {
  const { usuario_id, name, avatar_url, is_kids } = req.body || {};
  if (!usuario_id || !name || !avatar_url) return res.status(400).json({ message: 'Datos de perfil incompletos' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO perfiles (usuario_id, name, avatar_url, is_kids) VALUES (?, ?, ?, ?)',
      [usuario_id, name, avatar_url, is_kids ? 1 : 0]
    );
    const perfilId = result.insertId;
    await conn.query('INSERT INTO listas (perfil_id, name, type) VALUES (?, ?, ?)', [perfilId, 'Mi lista', 'MY_LIST']);
    await conn.commit();
    res.status(201).json({ id: perfilId });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Error al crear perfil', error: e.message });
  } finally {
    conn.release();
  }
});

// Profiles: delete
app.delete('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'id requerido' });
  try {
    await pool.query('DELETE FROM perfiles WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al eliminar perfil', error: e.message });
  }
});

// My List: get
app.get('/my-list/:perfilId', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  if (!perfilId) return res.status(400).json({ message: 'perfilId requerido' });
  try {
    const [listas] = await pool.query('SELECT id FROM listas WHERE perfil_id = ? AND type = "MY_LIST"', [perfilId]);
    if (!listas.length) return res.json([]);
    const listaId = listas[0].id;
    const [items] = await pool.query(
      'SELECT content_id, content_type, added_at FROM lista_items WHERE lista_id = ? ORDER BY added_at DESC',
      [listaId]
    );
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener Mi lista', error: e.message });
  }
});

// My List: add
app.post('/my-list/:perfilId/items', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const { content_id, content_type } = req.body || {};
  if (!perfilId || !content_id || !content_type) return res.status(400).json({ message: 'Datos incompletos' });
  try {
    const [listas] = await pool.query('SELECT id FROM listas WHERE perfil_id = ? AND type = "MY_LIST"', [perfilId]);
    if (!listas.length) return res.status(404).json({ message: 'Mi lista no encontrada' });
    const listaId = listas[0].id;
    await pool.query(
      'INSERT INTO lista_items (lista_id, content_id, content_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE added_at = CURRENT_TIMESTAMP',
      [listaId, content_id, content_type]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al añadir a Mi lista', error: e.message });
  }
});

// My List: remove
app.delete('/my-list/:perfilId/items/:contentId/:type', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const contentId = Number(req.params.contentId);
  const type = req.params.type;
  if (!perfilId || !contentId || !type) return res.status(400).json({ message: 'Datos incompletos' });
  try {
    const [listas] = await pool.query('SELECT id FROM listas WHERE perfil_id = ? AND type = "MY_LIST"', [perfilId]);
    if (!listas.length) return res.status(404).json({ message: 'Mi lista no encontrada' });
    const listaId = listas[0].id;
    await pool.query('DELETE FROM lista_items WHERE lista_id = ? AND content_id = ? AND content_type = ?', [listaId, contentId, type]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al quitar de Mi lista', error: e.message });
  }
});

// Content: get all content
app.get('/content', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contenido ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener contenido', error: e.message });
  }
});

// Content: get content by type
app.get('/content/:type', async (req, res) => {
  const type = req.params.type;
  if (!['movie', 'tv', 'anime'].includes(type)) return res.status(400).json({ message: 'Tipo de contenido inválido' });
  try {
    const [rows] = await pool.query('SELECT * FROM contenido WHERE type = ? ORDER BY created_at DESC', [type]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener contenido', error: e.message });
  }
});

// Content: add new content
app.post('/content', async (req, res) => {
  const { title, type, overview, poster_url, backdrop_url } = req.body || {};
  if (!title || !type || !['movie', 'tv', 'anime'].includes(type)) {
    return res.status(400).json({ message: 'Datos de contenido incompletos o inválidos' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO contenido (title, type, overview, poster_url, backdrop_url) VALUES (?, ?, ?, ?, ?)',
      [title, type, overview, poster_url, backdrop_url]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ message: 'Error al crear contenido', error: e.message });
  }
});

// Images: upload image metadata
app.post('/images', async (req, res) => {
  const { filename, original_name, mime_type, size, width, height, url, type, entity_id, entity_type } = req.body || {};
  if (!filename || !url || !type || !['poster', 'backdrop', 'avatar', 'thumbnail'].includes(type)) {
    return res.status(400).json({ message: 'Datos de imagen incompletos o inválidos' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO imagenes (filename, original_name, mime_type, size, width, height, url, type, entity_id, entity_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [filename, original_name, mime_type, size, width, height, url, type, entity_id, entity_type]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ message: 'Error al guardar imagen', error: e.message });
  }
});

// Images: get images by entity
app.get('/images/:entity_type/:entity_id', async (req, res) => {
  const { entity_type, entity_id } = req.params;
  if (!['contenido', 'perfil'].includes(entity_type)) {
    return res.status(400).json({ message: 'Tipo de entidad inválido' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM imagenes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      [entity_type, entity_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener imágenes', error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Escuchar en todas las interfaces

app.listen(PORT, HOST, () => {
  console.log(`Backend escuchando en http://${HOST}:${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  console.log(`Acceso desde emulador Android: http://10.0.2.2:${PORT}`);
});