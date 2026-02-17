import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const router = express.Router();
const { Pool } = pg;

// Configurar Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Verificar que el email esté en la whitelist
            const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
            const email = profile.emails[0].value;

            if (!allowedEmails.includes(email)) {
                return done(null, false, { message: 'Email no autorizado' });
            }

            // Guardar/actualizar admin en la base de datos
            const pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: Number(process.env.DB_PORT || 5432),
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'bd_netflix',
            });

            const result = await pool.query(
                `INSERT INTO admin_users (google_id, email, name, picture, last_login)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (google_id) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           picture = EXCLUDED.picture,
           last_login = CURRENT_TIMESTAMP
         RETURNING id, email, name, picture`,
                [profile.id, email, profile.displayName, profile.photos[0]?.value]
            );

            await pool.end();

            return done(null, result.rows[0]);
        } catch (error) {
            return done(error, null);
        }
    }
));

// Serialización para sesiones (opcional, usamos JWT principalmente)
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// ========================================
// Rutas de autenticación
// ========================================

/**
 * GET /auth/google
 * Inicia el flujo de autenticación con Google
 */
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account' // Forzar selección de cuenta
    })
);

/**
 * GET /auth/google/callback
 * Callback de Google OAuth
 */
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/admin?error=auth_failed',
        session: false
    }),
    (req, res) => {
        try {
            // Generar JWT
            const token = jwt.sign(
                {
                    id: req.user.id,
                    email: req.user.email,
                    name: req.user.name,
                    picture: req.user.picture
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Detectar si es mobile (React Native)
            const platform = req.query.platform;
            const redirectUri = req.query.redirect_uri;

            if (platform === 'mobile' && redirectUri) {
                // Deep link para React Native con token en URL
                const separator = redirectUri.includes('?') ? '&' : '?';
                res.redirect(`${redirectUri}${separator}token=${token}`);
            } else {
                // Cookie para web
                res.cookie('admin_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 24 * 60 * 60 * 1000, // 24 horas
                    sameSite: 'lax'
                });

                // Redirigir al dashboard web
                res.redirect('/admin/dashboard.html');
            }
        } catch (error) {
            console.error('Error generando JWT:', error);

            const platform = req.query.platform;
            const redirectUri = req.query.redirect_uri;

            if (platform === 'mobile' && redirectUri) {
                const separator = redirectUri.includes('?') ? '&' : '?';
                res.redirect(`${redirectUri}${separator}error=token_generation_failed`);
            } else {
                res.redirect('/admin?error=token_generation_failed');
            }
        }
    }
);

import axios from 'axios';

/**
 * POST /auth/admin/firebase-login
 * Inicia sesión admin usando un token de Firebase (Client SDK)
 */
router.post('/admin/firebase-login', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'Token requerido' });
        }

        // Validar token contra Google
        // Esto verifica firma y expiración sin necesitar service-account (para simplicidad)
        const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
        const response = await axios.get(verifyUrl);
        const payload = response.data;

        // Verificar email en whitelist
        const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        const email = payload.email;

        if (!allowedEmails.includes(email)) {
            return res.status(403).json({ message: 'Email no autorizado' });
        }

        // Guardar/Actualizar en BD
        const pool = new (require('pg').Pool)({
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT || 5432),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bd_netflix',
        });

        // Usamos el 'sub' de firebase como google_id o similar
        const googleId = payload.sub;
        const name = payload.name || email.split('@')[0];
        const picture = payload.picture || '';

        const result = await pool.query(
            `INSERT INTO admin_users (google_id, email, name, picture, last_login)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (google_id) 
             DO UPDATE SET 
               name = EXCLUDED.name,
               picture = EXCLUDED.picture,
               last_login = CURRENT_TIMESTAMP
             RETURNING id, email, name, picture`,
            [googleId, email, name, picture]
        );
        await pool.end();

        const user = result.rows[0];

        // Generar JWT de Admin (el que usa el backend)
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Si es web, establecer cookie también para consistencia
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none'
        });

        return res.json({ token, user });

    } catch (error) {
        console.error('Firebase Admin Login Error:', error.response?.data || error.message);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
});

/**
 * GET /auth/admin/me
 * Obtiene información del administrador autenticado
 */
router.get('/admin/me', (req, res) => {
    const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        });
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
});

/**
 * POST /auth/admin/logout
 * Cierra sesión del administrador
 */
router.post('/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ ok: true, message: 'Sesión cerrada exitosamente' });
});

/**
 * GET /auth/admin/check
 * Verifica si el usuario está autenticado (para frontend)
 */
router.get('/admin/check', (req, res) => {
    const token = req.cookies?.admin_token;

    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        res.json({ authenticated: true });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

export default router;
