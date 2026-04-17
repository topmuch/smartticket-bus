// ============================================
// SmartTicket Bus - Point d'entrée Express.js
// Le programme qui tourne sur le serveur
// ============================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { checkConnection, initDB, saveDB } = require('./config/db');
const { requestLogger } = require('./middleware/auth');

require('dotenv').config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  // 1. Initialiser la base de données (sql.js WASM)
  await initDB();
  checkConnection();

  const app = express();

  // 2. Middleware (Sécurité & Parsing)
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  // 3. Charger les routes API v1
  app.use('/api/v1', routes);

  // 4. Route de test (racine)
  app.get('/', (req, res) => {
    res.json({
      status: "SmartTicket API is running 🚌",
      version: "1.0.0",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api/v1',
        auth_login: 'POST /api/v1/auth/login',
        sell_ticket: 'POST /api/v1/sell',
        scan_ticket: 'POST /api/v1/scan',
        dashboard: 'GET /api/v1/reports/dashboard'
      }
    });
  });

  // 5. Gestion des erreurs 404
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route non trouvée: ${req.method} ${req.originalUrl}`
    });
  });

  // 6. Gestion des erreurs globales
  app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur'
    });
  });

  // 7. Sauvegarder la DB périodiquement
  setInterval(() => {
    try { saveDB(); } catch (e) { /* ignore */ }
  }, 30000);

  // 8. Lancement
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🚌 SmartTicket Bus - Backend API Server   ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Port:     ${PORT}                            ║`);
    console.log(`║  Environ:  ${process.env.NODE_ENV || 'development'}                         ║`);
    console.log(`║  API:      http://localhost:${PORT}/api/v1       ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
