/**
 * transcode.js  →  server/routes/transcode.js
 * 
 * Endpoint POST /transcode/hls
 * Pipeline completo:
 *   1. Recibe `src` (URL de video) y `episodeId` (opcional)
 *   2. Genera HLS localmente con ffmpeg
 *   3. Sube la carpeta HLS a Cloudflare R2
 *   4. Guarda stream_url en PostgreSQL si se proporcionó episodeId
 *   5. Elimina la carpeta temporal local
 *   6. Devuelve { ok, stream_url }
 */

import express from 'express';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import {
  uploadHlsFolderToR2,
  deleteLocalHlsFolder,
} from '../services/r2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Espera hasta que exista un archivo (polling), o agota el tiempo */
async function waitForFile(filePath, maxMs = 30_000, intervalMs = 300) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Lanza ffmpeg y devuelve una Promise que resuelve cuando el proceso termina.
 * Rechaza si el exit code es distinto de 0.
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let errBuf = '';
    ff.stderr.on('data', (d) => {
      try { errBuf += d.toString(); } catch { /* noop */ }
    });

    ff.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg salió con código ${code}.\n${errBuf.slice(-3000)}`));
      }
    });

    ff.on('error', (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// POST /transcode/hls
// ---------------------------------------------------------------------------
/**
 * Body JSON:
 *   src        {string}  URL del video a transcodificar [requerido]
 *   episodeId  {number}  ID del episodio en anime_episodes [opcional]
 *
 * Respuesta exitosa:
 *   { ok: true, id, stream_url }
 *
 * Respuesta de error:
 *   { ok: false, error }
 */
router.post('/hls', async (req, res) => {
  const src = req.body?.src || req.query?.src || '';
  const episodeId = req.body?.episodeId ?? null;

  if (!src) {
    return res.status(400).json({ ok: false, error: 'El campo "src" es requerido' });
  }

  // ID único basado en el src para idempotencia
  const id = crypto.createHash('md5').update(src).digest('hex');
  const outDir = join(__dirname, '..', 'hls', id);
  const playlistPath = join(outDir, 'index.m3u8');

  try {
    // ------------------------------------------------------------------
    // 1. Si ya existe en R2 (stream_url guardada en DB), devolver directo
    // ------------------------------------------------------------------
    if (episodeId) {
      const existing = await pool.query(
        'SELECT stream_url FROM anime_episodes WHERE id = $1',
        [episodeId]
      );
      if (existing.rows[0]?.stream_url) {
        return res.json({
          ok: true,
          id,
          stream_url: existing.rows[0].stream_url,
          cached: true,
        });
      }
    }

    // ------------------------------------------------------------------
    // 2. Si aún no existe localmente, transcodificar con ffmpeg
    // ------------------------------------------------------------------
    if (!existsSync(playlistPath)) {
      mkdirSync(outDir, { recursive: true });

      const segmentPattern = join(outDir, 'segment%03d.ts');
      const isMp4 = /\.mp4(\?|$)/i.test(src);

      const ffArgs = [
        '-loglevel', 'error',
        '-y',
        '-i', src,
        ...(isMp4
          ? ['-c:v', 'copy', '-c:a', 'copy']
          : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
             '-c:a', 'aac', '-b:a', '128k']),
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        playlistPath,
      ];

      console.log(`[transcode] 🎬 Iniciando ffmpeg para id=${id}`);
      await runFfmpeg(ffArgs);

      // Verificación extra: por si ffmpeg terminó OK pero aún no está en disco
      const found = await waitForFile(playlistPath, 5_000);
      if (!found) {
        throw new Error('ffmpeg terminó pero index.m3u8 no se creó en disco');
      }
    } else {
      console.log(`[transcode] ♻️  HLS local ya existe para id=${id}, saltando ffmpeg`);
    }

    // ------------------------------------------------------------------
    // 3. Subir carpeta HLS completa a Cloudflare R2
    // ------------------------------------------------------------------
    console.log(`[transcode] ☁️  Subiendo HLS a R2 para id=${id}...`);
    const streamUrl = await uploadHlsFolderToR2({ localDir: outDir, hlsId: id });

    // ------------------------------------------------------------------
    // 4. Guardar stream_url en PostgreSQL (si se proporcionó episodeId)
    // ------------------------------------------------------------------
    if (episodeId) {
      await pool.query(
        `UPDATE anime_episodes
         SET stream_url    = $1,
             storage_type  = 'r2',
             updated_at    = NOW()
         WHERE id = $2`,
        [streamUrl, episodeId]
      );
      console.log(`[transcode] 💾 stream_url guardada para episodeId=${episodeId}`);
    }

    // ------------------------------------------------------------------
    // 5. Limpiar archivos temporales locales
    // ------------------------------------------------------------------
    await deleteLocalHlsFolder(outDir);

    // ------------------------------------------------------------------
    // 6. Responder con éxito
    // ------------------------------------------------------------------
    return res.json({ ok: true, id, stream_url: streamUrl });

  } catch (err) {
    console.error(`[transcode] ❌ Error para id=${id}:`, err.message);

    // NO borrar los archivos locales si hubo un error de subida
    // para poder reintentar o diagnosticar
    return res.status(500).json({
      ok: false,
      id,
      error: err.message,
    });
  }
});

export default router;
