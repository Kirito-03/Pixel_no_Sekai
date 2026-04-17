import express from 'express';
import axios from 'axios';
import pool from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { basename, dirname, join } from 'path';
import { spawn } from 'child_process';
import { uploadHlsFolderToR2, deleteLocalHlsFolder } from '../services/r2Service.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const episodeUploadsDir = join(__dirname, '..', 'uploads', 'episodes');
try {
    mkdirSync(episodeUploadsDir, { recursive: true });
} catch (e) {
}

const episodeVideoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, episodeUploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = String(file.originalname || '').split('.').pop() || 'mp4';
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `episode-${req.params.id}-${unique}.${safeExt}`);
    }
});

const episodeVideoUpload = multer({
    storage: episodeVideoStorage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = new Set(['mp4', 'mkv', 'webm', 'mov', 'avi']);
        const ext = String(file.originalname || '').split('.').pop()?.toLowerCase();
        const mime = String(file.mimetype || '').toLowerCase();
        const ok =
            ((mime.startsWith('video/') || mime === 'application/octet-stream') && !!ext && allowedExt.has(ext));
        if (!ok) {
            return cb(new Error('Tipo de archivo no permitido. Usa mp4, mkv, webm, mov o avi.'));
        }
        return cb(null, true);
    }
});

// ========================================
// TMDB Integration
// ========================================

/**
 * GET /api/admin/tmdb/search
 * Buscar anime en TMDB
 */
router.get('/tmdb/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ message: 'Query parameter "q" requerido' });
    }

    try {
        const response = await axios.get('https://api.themoviedb.org/3/search/tv', {
            params: {
                api_key: process.env.TMDB_API_KEY,
                query: q,
                language: 'es-ES'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error buscando en TMDB:', error.message);
        res.status(500).json({
            message: 'Error al buscar en TMDB',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/tmdb/details/:tmdbId
 * Obtener detalles completos de un anime desde TMDB
 */
router.get('/tmdb/details/:tmdbId', async (req, res) => {
    const { tmdbId } = req.params;

    try {
        const response = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
            params: {
                api_key: process.env.TMDB_API_KEY,
                language: 'es-ES',
                append_to_response: 'credits,images'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error obteniendo detalles de TMDB:', error.message);
        res.status(500).json({
            message: 'Error al obtener detalles de TMDB',
            error: error.message
        });
    }
});

// ========================================
// Anime Management
// ========================================

/**
 * GET /api/admin/anime
 * Listar todos los anime (con paginación y filtros)
 */
router.get('/anime', async (req, res) => {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT
                ac.*,
                COALESCE(ep.episode_count, 0) AS episode_count
            FROM anime_content ac
            LEFT JOIN (
                SELECT anime_id, COUNT(*)::int AS episode_count
                FROM anime_episodes
                WHERE is_active = true
                GROUP BY anime_id
            ) ep ON ep.anime_id = ac.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filtro de búsqueda
        if (search) {
            query += ` AND (ac.title ILIKE $${paramIndex} OR ac.title_english ILIKE $${paramIndex} OR ac.title_japanese ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filtro de estado
        if (status) {
            query += ` AND ac.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Solo mostrar activos por defecto
        query += ' AND ac.is_active = true';

        // Ordenar por fecha de creación (más recientes primero)
        query += ' ORDER BY ac.created_at DESC';

        // Paginación
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación
        let countQuery = 'SELECT COUNT(*) FROM anime_content WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (search) {
            countQuery += ` AND (title ILIKE $${countParamIndex} OR title_english ILIKE $${countParamIndex} OR title_japanese ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }

        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
        }

        countQuery += ' AND is_active = true';

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error listando anime:', error);
        res.status(500).json({
            message: 'Error al listar anime',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/anime/:id
 * Obtener un anime específico
 */
router.get('/anime/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM anime_content WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Anime no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo anime:', error);
        res.status(500).json({
            message: 'Error al obtener anime',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/anime
 * Crear nuevo anime
 */
router.post('/anime', async (req, res) => {
    const {
        tmdb_id,
        title,
        franchise_key,
        title_english,
        title_japanese,
        description,
        poster_url,
        banner_url,
        genres,
        status,
        total_episodes,
        rating,
        release_date
    } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'El título es requerido' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO anime_content (
        tmdb_id, title, franchise_key, title_english, title_japanese, description,
        poster_url, banner_url, genres, status, total_episodes,
        rating, release_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
            [
                tmdb_id || null,
                title,
                franchise_key || null,
                title_english || null,
                title_japanese || null,
                description || null,
                poster_url || null,
                banner_url || null,
                genres || [],
                status || 'Unknown',
                total_episodes || 0,
                rating || 0.0,
                release_date || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando anime:', error);
        res.status(500).json({
            message: 'Error al crear anime',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/anime/:id
 * Actualizar anime existente
 */
router.put('/anime/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Campos permitidos para actualizar
    const allowedFields = [
        'tmdb_id', 'title', 'franchise_key', 'title_english', 'title_japanese', 'description',
        'poster_url', 'banner_url', 'genres', 'status', 'total_episodes',
        'rating', 'release_date', 'is_active'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(updates[key]);
            paramIndex++;
        }
    });

    if (setClause.length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
    }

    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE anime_content SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Anime no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando anime:', error);
        res.status(500).json({
            message: 'Error al actualizar anime',
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/anime/:id
 * Eliminar anime (soft delete)
 */
router.delete('/anime/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'UPDATE anime_content SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Anime no encontrado' });
        }

        res.json({ ok: true, message: 'Anime eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando anime:', error);
        res.status(500).json({
            message: 'Error al eliminar anime',
            error: error.message
        });
    }
});

// ========================================
// Episode Management
// ========================================

/**
 * GET /api/admin/episodes/:animeId
 * Listar episodios de un anime
 */
router.get('/episodes/:animeId', async (req, res) => {
    const { animeId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM anime_episodes 
       WHERE anime_id = $1 AND is_active = true 
       ORDER BY season ASC, episode_number ASC`,
            [animeId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error listando episodios:', error);
        res.status(500).json({
            message: 'Error al listar episodios',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/episodes
 * Agregar nuevo episodio
 */
router.post('/episodes', async (req, res) => {
    const {
        anime_id,
        season,
        episode_number,
        title,
        video_url,
        status,
        storage_type,
        duration,
        thumbnail_url,
        file_size,
        quality
    } = req.body;

    if (!anime_id || !episode_number) {
        return res.status(400).json({
            message: 'anime_id y episode_number son requeridos'
        });
    }

    try {
        const allowedStatuses = ['missing', 'queued', 'processing', 'ready', 'error'];
        const computedStatus = status
            ? status
            : (video_url ? 'queued' : 'missing');

        if (!allowedStatuses.includes(computedStatus)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const result = await pool.query(
            `INSERT INTO anime_episodes (
        anime_id, season, episode_number, title, video_url,
        status, storage_type, duration, thumbnail_url, file_size, quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                anime_id,
                season || 1,
                episode_number,
                title || null,
                video_url || null,
                computedStatus,
                storage_type || 'gdrive',
                duration || null,
                thumbnail_url || null,
                file_size || null,
                quality || '1080p'
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({
                message: 'Ya existe un episodio con ese número para esta temporada'
            });
        }

        console.error('Error creando episodio:', error);
        res.status(500).json({
            message: 'Error al crear episodio',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/episodes/:id
 * Actualizar episodio
 */
router.put('/episodes/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
        'season', 'episode_number', 'title', 'video_url', 'status', 'storage_type',
        'duration', 'thumbnail_url', 'file_size', 'quality', 'is_active'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    const allowedStatuses = ['missing', 'queued', 'processing', 'ready', 'error'];

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            if (key === 'status' && updates[key] && !allowedStatuses.includes(updates[key])) {
                return;
            }
            setClause.push(`${key} = $${paramIndex}`);
            values.push(updates[key]);
            paramIndex++;
        }
    });

    if (setClause.length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
    }

    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE anime_episodes SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Episodio no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando episodio:', error);
        res.status(500).json({
            message: 'Error al actualizar episodio',
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/episodes/:id
 * Eliminar episodio (soft delete)
 */
router.delete('/episodes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'UPDATE anime_episodes SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Episodio no encontrado' });
        }

        res.json({ ok: true, message: 'Episodio eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando episodio:', error);
        res.status(500).json({
            message: 'Error al eliminar episodio',
            error: error.message
        });
    }
});

router.post('/episodes/:id/upload-video', episodeVideoUpload.single('video'), async (req, res) => {
    const { id } = req.params;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se proporcionó ningún archivo de video' });
        }

        const episodeResult = await pool.query(
            'SELECT id FROM anime_episodes WHERE id = $1 AND is_active = true',
            [id]
        );
        if (!episodeResult.rows.length) {
            return res.status(404).json({ message: 'Episodio no encontrado' });
        }

        const clientBaseURL = req.headers['x-client-baseurl'];
        const base =
            typeof clientBaseURL === 'string' && clientBaseURL.trim()
                ? clientBaseURL.trim()
                : `${req.protocol}://${req.get('host')}`;
        const videoUrl = `${base}/uploads/episodes/${req.file.filename}`;

        const updated = await pool.query(
            `UPDATE anime_episodes
             SET video_url = $1, status = 'queued', storage_type = 'local'
             WHERE id = $2
             RETURNING *`,
            [videoUrl, id]
        );

        res.json({
            ok: true,
            message: 'Video subido. Episodio en cola.',
            video_url: videoUrl,
            episode: updated.rows[0],
        });
    } catch (error) {
        console.error('Error subiendo video de episodio:', error);
        res.status(500).json({ message: 'Error al subir video', error: error.message });
    }
});

router.post('/episodes/:id/process-video', async (req, res) => {
    const { id } = req.params;

    try {
        const episodeResult = await pool.query(
            'SELECT id, video_url, status FROM anime_episodes WHERE id = $1 AND is_active = true',
            [id]
        );
        if (!episodeResult.rows.length) {
            return res.status(404).json({ message: 'Episodio no encontrado' });
        }

        const episode = episodeResult.rows[0];
        const videoUrl = String(episode.video_url || '').trim();
        if (!videoUrl) {
            return res.status(400).json({ message: 'El episodio no tiene video_url. Sube un video primero.' });
        }
        if (String(episode.status) === 'processing') {
            return res.status(409).json({ message: 'El episodio ya está en procesamiento.' });
        }

        let filename = '';
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
            try {
                const u = new URL(videoUrl);
                filename = basename(u.pathname);
            } catch (e) {
                filename = basename(videoUrl);
            }
        } else {
            filename = basename(videoUrl);
        }

        if (!filename) {
            return res.status(400).json({ message: 'No se pudo resolver el archivo desde video_url.' });
        }

        const inputPath = join(__dirname, '..', 'uploads', 'episodes', filename);
        if (!existsSync(inputPath)) {
            return res.status(404).json({ message: 'Archivo de video no encontrado en /uploads/episodes', filename });
        }

        const outputDir = join(__dirname, '..', 'hls', String(id));
        try {
            mkdirSync(outputDir, { recursive: true });
        } catch (e) {
        }

        const outputPlaylist = join(outputDir, 'index.m3u8');
        const segmentPattern = join(outputDir, 'segment_%03d.ts');

        await pool.query(`UPDATE anime_episodes SET status = 'processing' WHERE id = $1`, [id]);

        const ffmpegArgs = [
            '-y',
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '20',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
            '-ar', '48000',
            '-f', 'hls',
            '-hls_time', '6',
            '-hls_list_size', '0',
            '-hls_segment_filename', segmentPattern,
            outputPlaylist,
        ];

        console.log(`[HLS] episode=${id} input=${inputPath}`);
        console.log(`[HLS] output=${outputPlaylist}`);
        console.log(`[HLS] ffmpeg ffmpeg ${ffmpegArgs.map(a => (String(a).includes(' ') ? `"${a}"` : a)).join(' ')}`);

        await new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', ffmpegArgs, { windowsHide: true });

            proc.stdout?.on('data', (chunk) => {
                const msg = String(chunk);
                if (msg.trim()) console.log(`[ffmpeg][${id}] ${msg.trim()}`);
            });
            proc.stderr?.on('data', (chunk) => {
                const msg = String(chunk);
                if (msg.trim()) console.log(`[ffmpeg][${id}] ${msg.trim()}`);
            });

            proc.on('error', (err) => reject(err));
            proc.on('close', (code) => {
                if (code === 0) return resolve();
                reject(new Error(`ffmpeg exit code ${code}`));
            });
        });

        const streamUrl = await uploadHlsFolderToR2({ localDir: outputDir, hlsId: String(id) });

        const updated = await pool.query(
            `UPDATE anime_episodes
             SET stream_url = $1, storage_type = 'r2', status = 'ready'
             WHERE id = $2
             RETURNING *`,
            [streamUrl, id]
        );

        await deleteLocalHlsFolder(outputDir);
        const cleanupRaw = String(req.query?.cleanup || '').toLowerCase();
        const shouldCleanup = cleanupRaw === '1' || cleanupRaw === 'true' || cleanupRaw === 'yes';
        if (shouldCleanup) {
            try {
                await unlink(inputPath);
                console.log(`[HLS] deleted input video: ${inputPath}`);
            } catch (e) {
                console.log(`[HLS] could not delete input video: ${inputPath}`);
            }
        }

        return res.json({
            ok: true,
            message: 'Transcodificación HLS completada y subida a R2.',
            episode_id: Number(id),
            input: { filename, path: inputPath, video_url: videoUrl },
            output: { dir: outputDir, index: outputPlaylist, stream_url: streamUrl },
            episode: updated.rows[0],
            ffmpeg: { command: 'ffmpeg', args: ffmpegArgs },
        });
    } catch (error) {
        try {
            await pool.query(`UPDATE anime_episodes SET status = 'error' WHERE id = $1`, [id]);
        } catch (e) {
        }
        console.error('Error procesando/subiendo HLS:', error);
        return res.status(500).json({ message: 'Error al procesar/subir HLS', error: error.message });
    }
});

// ========================================
// Dashboard Stats
// ========================================

/**
 * GET /api/admin/stats
 * Obtener estadísticas del dashboard
 */
router.get('/stats', async (req, res) => {
    try {
        const animeCount = await pool.query(
            'SELECT COUNT(*) FROM anime_content WHERE is_active = true'
        );

        const episodeCount = await pool.query(
            'SELECT COUNT(*) FROM anime_episodes WHERE is_active = true'
        );

        const recentAnime = await pool.query(
            'SELECT * FROM anime_content WHERE is_active = true ORDER BY created_at DESC LIMIT 5'
        );

        const storageStats = await pool.query(
            `SELECT 
        storage_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
       FROM anime_episodes 
       WHERE is_active = true
       GROUP BY storage_type`
        );

        res.json({
            totalAnime: parseInt(animeCount.rows[0].count),
            totalEpisodes: parseInt(episodeCount.rows[0].count),
            recentAnime: recentAnime.rows,
            storageStats: storageStats.rows
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

export default router;
