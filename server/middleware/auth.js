import jwt from 'jsonwebtoken';

/**
 * Middleware para autenticar administradores
 * Verifica JWT y valida que el email esté en la whitelist
 */
export const authenticateAdmin = (req, res, next) => {
    // Obtener token de cookies o header Authorization
    const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'No autorizado - Token no proporcionado',
            code: 'NO_TOKEN'
        });
    }

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que el email esté en la whitelist de administradores
        const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());

        if (!allowedEmails.includes(decoded.email)) {
            return res.status(403).json({
                message: 'Acceso denegado - Email no autorizado',
                code: 'FORBIDDEN'
            });
        }

        // Adjuntar información del admin al request
        req.admin = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        return res.status(500).json({
            message: 'Error al verificar autenticación',
            error: error.message
        });
    }
};

/**
 * Middleware opcional para verificar admin sin bloquear
 * Útil para endpoints que pueden funcionar con o sin autenticación
 */
export const optionalAdmin = (req, res, next) => {
    const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        req.admin = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());

        if (allowedEmails.includes(decoded.email)) {
            req.admin = {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture
            };
        } else {
            req.admin = null;
        }
    } catch (error) {
        req.admin = null;
    }

    next();
};
