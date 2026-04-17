import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import crypto from 'crypto';
import axios from 'axios';
import { spawn } from 'child_process';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { default: authRoutes } = await import('./routes/auth.js');
const { default: adminRoutes } = await import('./routes/admin.js');
const { default: userRoutes } = await import('./routes/user.js');
const { default: transcodeRoutes } = await import('./routes/transcode.js');
const { default: catalogRoutes } = await import('./routes/catalog.js');
const { default: pool } = await import('./db.js');

// Crear carpeta de uploads si no existe
const uploadsDir = join(__dirname, 'uploads', 'avatars');
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch (error) {
  // La carpeta ya existe o no se pudo crear
}

// Configuración de multer para avatares
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `avatar-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
    }
  }
});

const app = express();

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Permitir cualquier origen en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Aceptar tanto mayúsculas como minúsculas para el header personalizado
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Client-BaseURL', 'x-client-baseurl'],
  exposedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser para JWT
app.use(cookieParser());

// Session middleware para OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'netflix-session-secret-default',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// SERVIR ESTÁTICAMENTE LA CARPETA videos
app.use('/videos', express.static(join(__dirname, 'videos')));
// HLS files now served from Cloudflare R2 — local static route removed.
// SERVIR ESTÁTICAMENTE LA CARPETA uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/hls', express.static(join(__dirname, 'hls')));

// SERVIR ADMIN PANEL (debe ir antes de las rutas API)
const adminDir = join(__dirname, 'admin');
try {
  mkdirSync(adminDir, { recursive: true });
  console.log('Admin panel directory ready:', adminDir);
} catch (error) {
  console.log('Admin panel directory already exists or error:', error.message);
}
app.use('/admin', express.static(adminDir));

// Middleware de logging para desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Ensure auxiliary tables exist
// NOTA: Las tablas ahora se crean automáticamente desde bd_netflix_postgres.sql
// No necesitamos crear tablas manualmente con PostgreSQL
/*
async function ensurePasswordResetsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT(11) NOT NULL AUTO_INCREMENT,
        usuario_id INT(11) NOT NULL,
        token VARCHAR(255)NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP(),
        PRIMARY KEY (id),
        KEY idx_password_resets_usuario_id (usuario_id),
        CONSTRAINT fk_password_resets_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('Tabla password_resets verificada/creada');
  } catch (e) {
    console.error('Error creando/verificando tabla password_resets:', e.message);
  }
}
// ensurePasswordResetsTable();  // Deshabilitado - tablas creadas por init.sql
*/

// Tablas de descargas ya se crean desde bd_netflix_postgres.sql

// Health: no depender de la base de datos
// Devuelve 200 siempre que el servidor esté vivo, y reporta estado opcional de la DB
app.get('/health', async (req, res) => {
  const status = {
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: { ok: false },
  };
  try {
    const result = await pool.query('SELECT 1 as ok');
    status.db.ok = true;
  } catch (e) {
    status.db.ok = false;
    status.db.error = e.message;
  }
  res.status(200).json(status);
});

// Health DB: endpoint dedicado que falla si la DB está caída (útil para monitoreo)
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, rows: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========================================
// Admin Panel Routes
// ========================================
app.use('/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/user', userRoutes);
app.use('/transcode', transcodeRoutes);

// CORS Proxy para servicios externos de anime
app.get('/api/cors-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validar que la URL sea de dominios permitidos
  const allowedDomains = [
    'anbuanime.onrender.com',
    'api.consumet.org',
    'api.jikan.moe',
    'graphql.anilist.co',
    'api.animeapiplatform.com',
    'anime-api.canelacho.com',
    'api.animeflix.live',
    'api.animeapi.xyz',
    'api.animeapi.net'
  ];

  try {
    const targetURL = new URL(url);
    const isAllowed = allowedDomains.some(domain => targetURL.hostname.includes(domain));

    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // Forward request
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    // Return with CORS headers
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

app.post('/proxy/translate', async (req, res) => {
  const { q, target, source, format } = req.body || {};
  if (!q || !target) return res.status(400).json({ message: 'q y target requeridos' });
  const provider = (process.env.TRANSLATE_PROVIDER || 'libre').toLowerCase();
  try {
    if (provider === 'libre') {
      const { data } = await axios.post('https://libretranslate.com/translate', {
        q,
        source: source || 'auto',
        target,
        format: format || 'text'
      }, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      return res.json({ translatedText: data?.translatedText || '' });
    }
    if (provider === 'deepl') {
      const key = process.env.DEEPL_API_KEY;
      if (!key) return res.status(500).json({ message: 'DEEPL_API_KEY faltante' });
      const params = new URLSearchParams();
      params.set('auth_key', key);
      params.set('text', q);
      params.set('target_lang', String(target || 'es').toUpperCase());
      if (source) params.set('source_lang', String(source).toUpperCase());
      const { data } = await axios.post('https://api.deepl.com/v2/translate', params);
      const text = data?.translations?.[0]?.text || '';
      return res.json({ translatedText: text });
    }
    return res.status(400).json({ message: 'Proveedor no soportado' });
  } catch (e) {
    return res.status(500).json({ message: 'Error de traducción', error: e.message });
  }
});

// Auth: register
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email y password requeridos' });
  try {
    const existsResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existsResult.rows.length) return res.status(409).json({ message: 'Email ya registrado' });

    const result = await pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, password]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ message: 'Error al registrar', error: e.message });
  }
});

// Auth: login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email y password requeridos' });
  try {
    const result = await pool.query('SELECT id, password_hash FROM usuarios WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ message: 'Credenciales inválidas' });
    const user = result.rows[0];
    const ok = password === user.password_hash;
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
    res.json({ id: user.id, email });
  } catch (e) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: e.message });
  }
});

// Auth: forgot password (dev-friendly - returns token)
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email requerido' });
  try {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const userId = result.rows[0].id;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_resets (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
    res.json({ ok: true, token, expires_in_minutes: 30 });
  } catch (e) {
    res.status(500).json({ message: 'Error al generar token de recuperación', error: e.message });
  }
});

// Auth: reset password using token
app.post('/auth/reset-password', async (req, res) => {
  const { email, token, new_password } = req.body || {};
  if (!email || !token || !new_password) return res.status(400).json({ message: 'email, token y new_password requeridos' });
  try {
    const usersResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (!usersResult.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const userId = usersResult.rows[0].id;
    const tokensResult = await pool.query(
      'SELECT id FROM password_resets WHERE usuario_id = $1 AND token = $2 AND used = false AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [userId, token]
    );
    if (!tokensResult.rows.length) return res.status(400).json({ message: 'Token inválido o expirado' });
    const resetId = tokensResult.rows[0].id;
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [new_password, userId]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [resetId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al restablecer contraseña', error: e.message });
  }
});

// Profiles: list
app.get('/profiles', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ message: 'userId requerido' });
  try {
    const result = await pool.query('SELECT id, usuario_id, name, avatar_url FROM perfiles WHERE usuario_id = $1', [userId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener perfiles', error: e.message });
  }
});

// Profiles: create (and ensure "Mi lista")
app.post('/profiles', async (req, res) => {
  const { usuario_id, name, avatar_url } = req.body || {};
  if (!usuario_id || !name || !avatar_url) return res.status(400).json({ message: 'Datos de perfil incompletos' });
  try {
    const uCheck = await pool.query('SELECT id FROM usuarios WHERE id = $1', [usuario_id]);
    if (!uCheck.rows.length) return res.status(404).json({ message: 'Usuario no encontrado para crear perfil' });

    const perfilResult = await pool.query(
      'INSERT INTO perfiles (usuario_id, name, avatar_url) VALUES ($1, $2, $3) RETURNING id',
      [usuario_id, name, avatar_url]
    );
    const perfilId = perfilResult.rows[0].id;
    await pool.query('INSERT INTO listas (perfil_id, name, type) VALUES ($1, $2, $3)', [perfilId, 'Mi lista', 'MY_LIST']);
    await pool.query('INSERT INTO descargas (perfil_id, name) VALUES ($1, $2)', [perfilId, 'Descargas']);
    res.status(201).json({ id: perfilId });
  } catch (e) {
    console.error('Error al crear perfil:', e.message);
    res.status(500).json({ message: 'Error al crear perfil', error: e.message });
  }
});

// Profiles: update
app.put('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, avatar_url } = req.body || {};
  if (!id) return res.status(400).json({ message: 'id requerido' });

  const updates = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(name);
  }
  if (avatar_url !== undefined) {
    updates.push(`avatar_url = $${idx++}`);
    values.push(avatar_url);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No hay campos para actualizar' });
  }

  values.push(id);

  try {
    await pool.query(
      `UPDATE perfiles SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: e.message });
  }
});

// Profiles: delete
app.delete('/profiles/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'id requerido' });
  try {
    await pool.query('DELETE FROM perfiles WHERE id = $1', [id]);
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
    const listasResult = await pool.query("SELECT id FROM listas WHERE perfil_id = $1 AND type = 'MY_LIST'", [perfilId]);
    if (!listasResult.rows.length) return res.json([]);
    const listaId = listasResult.rows[0].id;
    const itemsResult = await pool.query(
      'SELECT content_id, content_type, added_at FROM lista_items WHERE lista_id = $1 ORDER BY added_at DESC',
      [listaId]
    );
    res.json(itemsResult.rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener Mi lista', error: e.message });
  }
});

// My List: add
app.post('/my-list/:perfilId/items', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const { content_id, content_type } = req.body || {};
  if (!perfilId || !content_id || !content_type) return res.status(400).json({ message: 'Datos incompletos' });
  const allowedTypes = ['movie', 'tv', 'anime'];
  if (!allowedTypes.includes(String(content_type).toLowerCase())) {
    return res.status(400).json({ message: 'Tipo de contenido inválido', allowed: allowedTypes });
  }
  try {
    const listasResult = await pool.query("SELECT id FROM listas WHERE perfil_id = $1 AND type = 'MY_LIST'", [perfilId]);
    if (!listasResult.rows.length) return res.status(404).json({ message: 'Mi lista no encontrada' });
    const listaId = listasResult.rows[0].id;
    await pool.query(
      'INSERT INTO lista_items (lista_id, content_id, content_type) VALUES ($1, $2, $3) ON CONFLICT (lista_id, content_id, content_type) DO UPDATE SET added_at = CURRENT_TIMESTAMP',
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
  const allowedTypes = ['movie', 'tv', 'anime'];
  if (!allowedTypes.includes(String(type).toLowerCase())) {
    return res.status(400).json({ message: 'Tipo de contenido inválido', allowed: allowedTypes });
  }
  try {
    const listasResult = await pool.query("SELECT id FROM listas WHERE perfil_id = $1 AND type = 'MY_LIST'", [perfilId]);
    if (!listasResult.rows.length) return res.status(404).json({ message: 'Mi lista no encontrada' });
    const listaId = listasResult.rows[0].id;
    await pool.query('DELETE FROM lista_items WHERE lista_id = $1 AND content_id = $2 AND content_type = $3', [listaId, contentId, type]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al quitar de Mi lista', error: e.message });
  }
});

// Utilidad: asegura que exista el registro de descargas para un perfil y devuelve su id
async function ensureDescargasForPerfil(perfilId) {
  const perfilResult = await pool.query('SELECT id FROM perfiles WHERE id = $1 LIMIT 1', [perfilId]);
  if (!perfilResult.rows.length) throw new Error('Perfil no encontrado');
  const result = await pool.query('SELECT id FROM descargas WHERE perfil_id = $1 LIMIT 1', [perfilId]);
  if (result.rows.length) return result.rows[0].id;
  const inserted = await pool.query(
    'INSERT INTO descargas (perfil_id, name) VALUES ($1, $2) RETURNING id',
    [perfilId, 'Descargas']
  );
  return inserted.rows[0].id;
}

// Downloads: get (auto-crea registro de descargas si falta)
app.get('/downloads/:perfilId', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  if (!perfilId) return res.status(400).json({ message: 'perfilId requerido' });
  try {
    console.log(`[Downloads][GET] perfilId=${perfilId}`);
    const descargaId = await ensureDescargasForPerfil(perfilId);
    console.log(`[Downloads][GET] ensureDescargasForPerfil -> descargaId=${descargaId}`);
    const itemsResult = await pool.query(
      'SELECT content_id, content_type, status, progress, file_path, added_at, updated_at FROM descarga_items WHERE descarga_id = $1 ORDER BY added_at DESC',
      [descargaId]
    );
    console.log(`[Downloads][GET] returned ${itemsResult.rows.length} items`);
    res.json(itemsResult.rows);
  } catch (e) {
    if (e.message === 'Perfil no encontrado') {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }
    res.status(500).json({ message: 'Error al obtener descargas', error: e.message });
  }
});

// Downloads: add or update (upsert)
app.post('/downloads/:perfilId/items', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const { content_id, content_type, status, progress, file_path } = req.body || {};
  console.log(`[Downloads][POST] perfilId=${perfilId} body=`, { content_id, content_type, status, progress, file_path });
  if (!perfilId || !content_id || !content_type) return res.status(400).json({ message: 'Datos incompletos' });
  const allowedTypes = ['movie', 'tv', 'anime'];
  if (!allowedTypes.includes(String(content_type).toLowerCase())) {
    return res.status(400).json({ message: 'Tipo de contenido inválido', allowed: allowedTypes });
  }
  try {
    const descargaId = await ensureDescargasForPerfil(perfilId);
    console.log(`[Downloads][POST] ensureDescargasForPerfil -> descargaId=${descargaId}`);
    await pool.query(
      `INSERT INTO descarga_items (descarga_id, content_id, content_type, status, progress, file_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (descarga_id, content_id, content_type)
       DO UPDATE SET status = EXCLUDED.status, progress = EXCLUDED.progress, file_path = EXCLUDED.file_path, updated_at = CURRENT_TIMESTAMP`,
      [descargaId, content_id, content_type, status || 'PENDING', progress ?? 0, file_path || null]
    );
    console.log(`[Downloads][POST] upsert OK -> descarga_id=${descargaId}, content_id=${content_id}, type=${content_type}`);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('[Downloads][POST] error', e?.message);
    res.status(500).json({ message: 'Error al añadir/actualizar descarga', error: e.message });
  }
});

// Downloads: update progress/status
app.put('/downloads/:perfilId/items/:contentId/:type', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const contentId = Number(req.params.contentId);
  const type = req.params.type;
  const { status, progress, file_path } = req.body || {};
  if (!perfilId || !contentId || !type) return res.status(400).json({ message: 'Datos incompletos' });
  const allowedTypes = ['movie', 'tv', 'anime'];
  if (!allowedTypes.includes(String(type).toLowerCase())) {
    return res.status(400).json({ message: 'Tipo de contenido inválido', allowed: allowedTypes });
  }
  try {
    const descargaId = await ensureDescargasForPerfil(perfilId);
    await pool.query(
      'UPDATE descarga_items SET status = $1, progress = $2, file_path = $3, updated_at = CURRENT_TIMESTAMP WHERE descarga_id = $4 AND content_id = $5 AND content_type = $6',
      [status || 'PENDING', progress ?? 0, file_path || null, descargaId, contentId, type]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al actualizar descarga', error: e.message });
  }
});

// Downloads: remove
app.delete('/downloads/:perfilId/items/:contentId/:type', async (req, res) => {
  const perfilId = Number(req.params.perfilId);
  const contentId = Number(req.params.contentId);
  const type = req.params.type;
  if (!perfilId || !contentId || !type) return res.status(400).json({ message: 'Datos incompletos' });
  const allowedTypes = ['movie', 'tv', 'anime'];
  if (!allowedTypes.includes(String(type).toLowerCase())) {
    return res.status(400).json({ message: 'Tipo de contenido inválido', allowed: allowedTypes });
  }
  try {
    const descargaId = await ensureDescargasForPerfil(perfilId);
    await pool.query('DELETE FROM descarga_items WHERE descarga_id = $1 AND content_id = $2 AND content_type = $3', [descargaId, contentId, type]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Error al quitar descarga', error: e.message });
  }
});

// Content: get all content
app.get('/content', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contenido ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener contenido', error: e.message });
  }
});

// Content: get content by type
app.get('/content/:type', async (req, res) => {
  const type = req.params.type;
  if (!['movie', 'tv', 'anime'].includes(type)) return res.status(400).json({ message: 'Tipo de contenido inválido' });
  try {
    const result = await pool.query('SELECT * FROM contenido WHERE type = $1 ORDER BY created_at DESC', [type]);
    res.json(result.rows);
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
    const result = await pool.query(
      'INSERT INTO contenido (title, type, overview, poster_url, backdrop_url) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, type, overview, poster_url, backdrop_url]
    );
    res.status(201).json({ id: result.rows[0].id });
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
    const result = await pool.query(
      'INSERT INTO imagenes (filename, original_name, mime_type, size, width, height, url, type, entity_id, entity_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [filename, original_name, mime_type, size, width, height, url, type, entity_id, entity_type]
    );
    res.status(201).json({ id: result.rows[0].id });
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
    const result = await pool.query(
      'SELECT * FROM imagenes WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entity_type, entity_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener imágenes', error: e.message });
  }
});

// Endpoint de prueba para verificar que el servidor está funcionando
app.get('/upload/test', (req, res) => {
  res.json({ message: 'Upload endpoint test OK', timestamp: new Date().toISOString() });
});

// Upload: avatar
app.post('/upload/avatar', upload.single('avatar'), (req, res) => {
  console.log('Request recibido para subir avatar');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Archivo recibido:', req.file ? 'Sí' : 'No');

  try {
    if (!req.file) {
      console.error('No se recibió ningún archivo');
      console.log('Body recibido:', req.body);
      console.log('Headers:', req.headers);
      return res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
    }

    console.log('Archivo recibido:', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Intentar usar el BASE_URL del cliente si está disponible
    const clientBaseURL = req.headers['x-client-baseurl'];
    let imageUrl;

    if (clientBaseURL) {
      // Usar el BASE_URL del cliente para construir la URL correcta
      imageUrl = `${clientBaseURL}/uploads/avatars/${req.file.filename}`;
      console.log('Usando BASE_URL del cliente:', clientBaseURL);
    } else {
      // Fallback: usar el host del request
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`;
      imageUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
      console.log('No se recibió BASE_URL del cliente, usando host del request:', host);
    }

    console.log('Avatar subido exitosamente. URL:', imageUrl);

    res.json({
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json({ message: 'Error al procesar la imagen', error: error.message });
  }
});

// Manejo de errores de multer (debe ir DESPUÉS de las rutas que usan multer)
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Error de Multer:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es demasiado grande. Máximo 5MB' });
    }
    return res.status(400).json({ message: 'Error al subir archivo', error: error.message });
  }
  if (error) {
    console.error('Error en upload:', error);
    return res.status(400).json({ message: error.message });
  }
  next();
});

// ===== Proxy para AniList GraphQL (evita CORS desde web) =====
// Este endpoint reenvía la petición GraphQL a https://graphql.anilist.co
// para que el navegador no haga la solicitud cross-origin directamente.
app.post('/proxy/anilist', async (req, res) => {
  const { query, variables } = req.body || {};
  if (!query) {
    return res.status(400).json({ message: 'Falta el campo "query" para la petición GraphQL' });
  }
  try {
    const { data } = await axios.post('https://graphql.anilist.co', { query, variables }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    if (data?.errors) {
      return res.status(502).json({ message: 'Error de AniList', errors: data.errors });
    }
    return res.json(data?.data ?? data);
  } catch (e) {
    const status = e.response?.status || 500;
    const errMsg = e.response?.data || { message: e.message };
    console.error('Error proxy AniList:', e.message);
    return res.status(status).json({ message: 'Fallo al consultar AniList', error: errMsg });
  }
});

// Videos: serve M3U file (updated filename)
app.get('/videos/animes_madre.m3u', (req, res) => {
  try {
    const m3uPath = join(__dirname, 'videos', 'animes_madre.m3u');
    const content = readFileSync(m3uPath, 'utf-8');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline; filename="animes_madre.m3u"');
    res.send(content);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener archivo M3U', error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Escuchar en todas las interfaces

app.listen(PORT, HOST, () => {
  console.log(`Backend escuchando en http://${HOST}:${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  console.log(`Acceso desde emulador Android: http://10.0.2.2:${PORT}`);
});

// Users: get by id (validate session)
app.get('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'id requerido' });
  try {
    const result = await pool.query('SELECT id, email, created_at FROM usuarios WHERE id = ?', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener usuario', error: e.message });
  }
});

// POST /transcode/hls → movido a server/routes/transcode.js

app.post('/proxy/anilist', async (req, res) => {
  try {
    const { data } = await axios.post('https://graphql.anilist.co', req.body, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Error proxy AniList', error: e.message });
  }
});
