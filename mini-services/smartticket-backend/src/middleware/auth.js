// ============================================
// SmartTicket Bus - Middleware de Sécurité
// Authentification JWT + RBAC + Rate Limiting
// ============================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// ============================================
// RATE LIMITING (In-memory, anti brute-force)
// Stocke les tentatives par IP+endpoint avec fenêtre glissante
// ============================================
const rateLimitStore = new Map();

/**
 * Middleware de rate limiting personnalisé (pas de dépendance externe)
 * @param {Object} options - { windowMs, maxRequests, message }
 */
function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,     // 15 minutes par défaut
    maxRequests = 100,               // max requêtes par fenêtre
    message = 'Trop de requêtes. Réessayez plus tard.',
    keyGenerator = (req) => req.ip   // clé par défaut = IP
  } = options;

  return (req, res, next) => {
    const key = `${keyGenerator(req)}:${req.originalUrl}`;
    const now = Date.now();

    // Nettoyer les entrées expirées périodiquement
    if (rateLimitStore.size > 10000) {
      const cutoff = now - windowMs;
      for (const [k, entry] of rateLimitStore) {
        if (entry.resetTime < cutoff) rateLimitStore.delete(k);
      }
    }

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Nouvelle fenêtre
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: message,
        retry_after: retryAfter
      });
    }

    next();
  };
}

/**
 * Rate limiting spécifique pour le LOGIN
 * 5 tentatives échouées par IP → blocage 15 min
 */
const loginAttempts = new Map();

// Fonction pour réinitialiser le rate limiter (utile en dev/test)
function resetLoginRateLimit(ip) {
  if (ip) loginAttempts.delete(ip);
}

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = parseInt(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000; // 15 min
  const maxAttempts = parseInt(process.env.LOGIN_RATE_MAX) || 5;

  // Nettoyage périodique
  if (loginAttempts.size > 5000) {
    const cutoff = now - windowMs;
    for (const [k, entry] of loginAttempts) {
      if (entry.resetTime < cutoff) loginAttempts.delete(k);
    }
  }

  const record = loginAttempts.get(ip);

  if (record && now <= record.resetTime && record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: `Trop de tentatives de connexion. Réessayez dans ${retryAfter} secondes.`,
      retry_after: retryAfter
    });
  }

  // Intercepter la réponse pour compter les échecs
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // Restaurer pour éviter double override
    res.json = originalJson;

    // Si login échoué (401), incrémenter le compteur
    if (res.statusCode === 401 && req.originalUrl.includes('/auth/login')) {
      if (!loginAttempts.has(ip) || now > (loginAttempts.get(ip)?.resetTime || 0)) {
        loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      } else {
        loginAttempts.get(ip).count++;
      }
    }

    // Si login réussi, réinitialiser le compteur
    if (req.originalUrl.includes('/auth/login') && data && data.success === true) {
      loginAttempts.delete(ip);
    }

    return originalJson(data);
  };

  next();
}

/**
 * Middleware d'authentification JWT
 * Vérifie le token dans le header Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: "Accès refusé : token manquant"
    });
  }

  const token = authHeader.split(' ')[1];

  if (!JWT_SECRET) {
    console.error('❌ CRITIQUE: JWT_SECRET n\'est pas défini dans .env');
    return res.status(500).json({
      success: false,
      error: "Erreur de configuration serveur"
    });
  }

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
    return res.status(403).json({
      success: false,
      error: "Token invalide ou expiré"
    });
  }
}

/**
 * Middleware RBAC - Vérifie le rôle de l'utilisateur
 * @param {...string} allowedRoles - Rôles autorisés (SUPERADMIN, OPERATOR, CONTROLLER)
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
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}`
      });
    }

    next();
  };
}

/**
 * Middleware optionnel - Auth si token présent, sinon continue
 * Utilisé pour les endpoints publics qui enrichissent la réponse si l'utilisateur est connecté
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  req.user = null;

  if (authHeader && authHeader.startsWith('Bearer ') && JWT_SECRET) {
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
    const user = req.user ? `[${req.user.role}]` : '[PUBLIC]';
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} ${user} [${duration}ms]`
    );
  });
  next();
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requestLogger,
  rateLimit,
  loginRateLimit
};
