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
// ENVIRONMENT VALIDATION (Production)
// ============================================
function validateEnvironment() {
 const errors = [];
 if (NODE_ENV === 'production') {
   if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
     errors.push('JWT_SECRET doit avoir au moins 32 caractères en production');
   }
   if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
     errors.push('JWT_REFRESH_SECRET doit avoir au moins 32 caractères en production');
   }
   if (!process.env.QR_SECRET || process.env.QR_SECRET.length < 32) {
     errors.push('QR_SECRET doit avoir au moins 32 caractères en production');
   }
   if (process.env.CORS_ORIGINS === '*' || !process.env.CORS_ORIGINS) {
     errors.push('CORS_ORIGINS doit être configuré (pas *) en production');
   }
   if (errors.length > 0) {
     console.error('╔══════════════════════════════════════════════╗');
     console.error('║  ❌ ERREURS DE CONFIGURATION PRODUCTION     ║');
     console.error('╠══════════════════════════════════════════════╣');
     errors.forEach(e => console.error(`║  • ${e}`));
     console.error('╚══════════════════════════════════════════════╝');
     process.exit(1);
   }
 } else {
   // Development warnings
   if (!process.env.JWT_SECRET) {
     console.warn('⚠️  AVERTISSEMENT: JWT_SECRET n\'est pas défini dans .env');
     console.warn('   Générez une clé forte : node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
   }
   if (!process.env.QR_SECRET) {
     console.warn('⚠️  AVERTISSEMENT: QR_SECRET n\'est pas défini dans .env');
   }
 }
}
validateEnvironment();

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

  // 2e2. Rate limiting pour TICKET SCAN (30 scans / min par IP)
  app.use('/api/v1/scan', rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Trop de scans. Réessayez dans une minute.'
  }));

  // 2e3. Rate limiting pour TICKET SELL (20 ventes / min par IP)
  app.use('/api/v1/sell', rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Trop de ventes. Réessayez dans une minute.'
  }));

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
        login_rate_limit: '5 attempts / 15 min',
        scan_rate_limit: '30 scans / min',
        sell_rate_limit: '20 sells / min',
        input_validation: 'Zod',
        cors: allowedOrigins[0] === '*' ? 'open' : 'restricted'
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

  // 500 - Erreur serveur (jamais exposer les détails en production)
  app.use((err, req, res, next) => {
    // Handle Zod validation errors that escape middleware
    if (err.name === 'ZodError') {
      const errorList = Array.isArray(err.errors) ? err.errors : [{ path: ['body'], message: err.message }];
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errorList.map(e => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path), message: e.message || 'Erreur' }))
      });
    }
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({
      success: false,
      error: NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur'
    });
  });

  // ============================================
  // 5b. PROCESS SIGNAL HANDLERS (graceful shutdown)
  // ============================================
  const gracefulShutdown = (signal) => {
    console.log(`\n🔄 ${signal} reçu, sauvegarde DB et arrêt...`);
    try { saveDB(); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('❌ Exception non interceptée:', err.message || err);
    if (err.stack) console.error(err.stack);
    // Don't exit in development - keep server alive
    if (NODE_ENV === 'production') {
      try { saveDB(); } catch {}
      process.exit(1);
    }
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  Rejection non gérée:', reason?.message || reason);
    // Don't exit in development - keep server alive
  });

  // ============================================
  // 6. SAUVEGARDE DB PÉRIODIQUE
  // Note: saveDB only on graceful shutdown to avoid sql.js db.export() lock contention
  // ============================================
  // Save periodically using defered execution to avoid blocking the event loop
  setInterval(() => {
    setImmediate(() => { try { saveDB(); } catch (e) { /* ignore */ } });
  }, 120000); // Every 2 minutes instead of 30 seconds

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
    console.log('║  • Scan Limit:    ✅ 30 scans/min               ║');
    console.log('║  • Sell Limit:    ✅ 20 ventes/min             ║');
    console.log('║  • Validation:    ✅ Zod (toutes les routes)    ║');
    console.log('║  • RBAC:          ✅ 3 rôles (Super/Ope/Ctrl)   ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
