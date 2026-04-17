// ============================================
// SmartTicket Bus - Point d'entrée Express.js
// Serveur sécurisé avec JWT + RBAC + Rate Limiting
// ============================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { checkConnection, initDB, saveDB } = require('./config/db');
const { requestLogger, rateLimit, loginRateLimit } = require('./middleware/auth');

require('dotenv').config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// VÉRIFICATION DE SÉCURITÉ AU DÉMARRAGE
// ============================================
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  AVERTISSEMENT: JWT_SECRET n\'est pas défini dans .env');
  console.warn('   Le serveur utilise un secret par défaut (NON SÉCURISÉ en production)');
  console.warn('   Générez une clé forte : node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.warn('');
}

async function startServer() {
  // 1. Initialiser la base de données (sql.js WASM)
  await initDB();
  checkConnection();

  const app = express();

  // ============================================
  // 2. MIDDLEWARE DE SÉCURITÉ
  // ============================================

  // 2a. Helmet — En-têtes de sécurité HTTP
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    } : false, // Désactivé en dev pour faciliter le debug
    hsts: NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 an
      includeSubDomains: true,
      preload: true
    } : false,
  }));

  // 2b. CORS — Origines autorisées
  const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
  app.use(cors({
    origin: allowedOrigins[0] === '*' ? '*' : (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origine non autorisée par CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
    maxAge: 86400, // Preflight cache 24h
    credentials: allowedOrigins[0] !== '*' // Credentials uniquement si origine spécifique
  }));

  // 2c. Parsing JSON avec limite de taille
  app.use(express.json({ limit: '1mb' }));

  // 2d. Rate limiting global (100 req / 15 min par IP)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
    message: 'Trop de requêtes. Réessayez dans quelques minutes.'
  }));

  // 2e. Rate limiting strict pour le LOGIN (5 tentatives / 15 min)
  app.use('/api/v1/auth/login', loginRateLimit);

  // 2f. Logging des requêtes
  app.use(requestLogger);

  // ============================================
  // 3. ROUTES API v1
  // ============================================
  app.use('/api/v1', routes);

  // ============================================
  // 4. ROUTE DE TEST (racine)
  // ============================================
  app.get('/', (req, res) => {
    res.json({
      status: "SmartTicket API is running 🚌",
      version: "1.0.0",
      environment: NODE_ENV,
      security: {
        jwt: !!process.env.JWT_SECRET,
        helmet: true,
        cors: allowedOrigins[0] === '*' ? 'open' : 'restricted',
        rate_limit: '200 req / 15 min',
        login_rate_limit: '5 attempts / 15 min'
      },
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api/v1',
        auth_login: 'POST /api/v1/auth/login',
        auth_refresh: 'POST /api/v1/auth/refresh',
        sell_ticket: 'POST /api/v1/sell',
        scan_ticket: 'POST /api/v1/scan',
        dashboard: 'GET /api/v1/reports/dashboard'
      }
    });
  });

  // ============================================
  // 5. GESTION DES ERREURS
  // ============================================

  // 404 - Route non trouvée
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route non trouvée: ${req.method} ${req.originalUrl}`
    });
  });

  // 500 - Erreur serveur
  app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({
      success: false,
      error: NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur'
    });
  });

  // ============================================
  // 6. SAUVEGARDE DB PÉRIODIQUE
  // ============================================
  setInterval(() => {
    try { saveDB(); } catch (e) { /* ignore */ }
  }, 30000);

  // ============================================
  // 7. DÉMARRAGE DU SERVEUR
  // ============================================
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🚌 SmartTicket Bus - Backend API Server   ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Port:     ${PORT}                            ║`);
    console.log(`║  Environ:  ${NODE_ENV}                         ║`);
    console.log(`║  API:      http://localhost:${PORT}/api/v1       ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  🔐 SÉCURITÉ ACTIVE                          ║');
    console.log(`║  • JWT Auth:     ${!!process.env.JWT_SECRET ? '✅ Configuré' : '⚠️  Défaut'}                   ║`);
    console.log('║  • Helmet:       ✅ En-têtes sécurité          ║');
    console.log(`║  • CORS:         ${allowedOrigins[0] === '*' ? '⚠️  Ouvert (*)' : '✅ Restreint'}                ║`);
    console.log('║  • Rate Limit:   ✅ 200 req/15min global       ║');
    console.log('║  • Login Limit:  ✅ 5 tentatives/15min         ║');
    console.log('║  • RBAC:         ✅ 3 rôles (Super/Ope/Ctrl)   ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
