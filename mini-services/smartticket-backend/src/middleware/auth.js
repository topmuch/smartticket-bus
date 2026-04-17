// ============================================
// SmartTicket Bus - Middleware d'authentification
// Vérification JWT + Contrôle RBAC (Rôle-Based Access Control)
// ============================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'smartticket-bus-jwt-secret-key-2024';

/**
 * Middleware d'authentification JWT
 * Vérifie le token dans le header Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: "Token d'authentification requis"
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role, name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token expiré, veuillez vous reconnecter"
      });
    }
    return res.status(401).json({
      success: false,
      error: "Token invalide"
    });
  }
}

/**
 * Middleware RBAC - Vérifie le rôle de l'utilisateur
 * @param {...string} allowedRoles - Rôles autorisés
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Accès refusé. Rôle requis: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Middleware optionnel - Auth si token présent, sinon continue
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  req.user = null; // Toujours défini, null par défaut

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Token invalide, req.user reste null
    }
  }

  next();
}

/**
 * Middleware de logging des requêtes
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
  });
  next();
}

module.exports = { authenticate, authorize, optionalAuth, requestLogger };
