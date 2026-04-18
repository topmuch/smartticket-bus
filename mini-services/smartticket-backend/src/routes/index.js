// ============================================
// SmartTicket Bus - Routes API v1
// Organisation: /api/v1/...
// ============================================
const express = require('express');
const router = express.Router();

// Contrôleurs
const ticketCtrl = require('../controllers/ticketController');
const scanCtrl = require('../controllers/scanController');
const adminCtrl = require('../controllers/adminController');
const authCtrl = require('../controllers/authController');

// Middleware
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// ============================================
// ROUTES PUBLIQUES (sans authentification)
// ============================================

// Test
router.get('/', (req, res) => {
  res.json({ status: "SmartTicket API v1 is running 🚌", timestamp: new Date().toISOString() });
});

// Authentification
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);

// Info publique
router.get('/public/info', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const zoneCount = db.prepare('SELECT COUNT(*) as cnt FROM zones WHERE is_active = 1').get().cnt;
  const lineCount = db.prepare('SELECT COUNT(*) as cnt FROM lines WHERE is_active = 1').get().cnt;
  const stopCount = db.prepare('SELECT COUNT(*) as cnt FROM stops WHERE is_active = 1').get().cnt;

  res.json({
    success: true,
    data: {
      app_name: "SmartTicket Bus",
      version: "1.0.0",
      zones_count: zoneCount,
      lines_count: lineCount,
      stops_count: stopCount,
      currency: "FCFA",
      cities: ["Dakar", "Almadies", "Plateau", "Médina", "Liberté", "Fann", "Omar Dia"]
    }
  });
});

// Zones publiques
router.get('/zones', optionalAuth, adminCtrl.getZones);
router.get('/zones/:id', optionalAuth, adminCtrl.getZoneById);

// Lignes publiques
router.get('/lines', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const lines = db.prepare(`
    SELECT l.*, 
      (SELECT COUNT(*) FROM line_stops WHERE line_id = l.id) as stops_count,
      (SELECT COUNT(*) FROM schedules WHERE line_id = l.id) as schedule_count
    FROM lines l WHERE l.is_active = 1 ORDER BY l.number
  `).all();
  res.json({ success: true, data: lines });
});

// Détail d'une ligne (public)
router.get('/lines/:id', optionalAuth, adminCtrl.getLineById);

// Arrêts publics
router.get('/stops', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const { zone_id } = req.query;
  let stops;
  if (zone_id) {
    stops = db.prepare(`
      SELECT s.*, z.name as zone_name, z.code as zone_code
      FROM stops s JOIN zones z ON s.zone_id = z.id
      WHERE s.zone_id = ? AND s.is_active = 1
    `).all(zone_id);
  } else {
    stops = db.prepare(`
      SELECT s.*, z.name as zone_name, z.code as zone_code
      FROM stops s JOIN zones z ON s.zone_id = z.id
      WHERE s.is_active = 1 ORDER BY z.code, s.code
    `).all();
  }
  res.json({ success: true, data: stops });
});

// Horaires publics
router.get('/schedules', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const { line_id, day_of_week } = req.query;
  
  let schedules;
  if (line_id) {
    schedules = db.prepare(`
      SELECT s.*, l.name as line_name, l.number as line_number
      FROM schedules s JOIN lines l ON s.line_id = l.id
      WHERE s.line_id = ? AND s.is_active = 1
      ORDER BY s.start_time
    `).all(line_id);
  } else if (day_of_week !== undefined) {
    schedules = db.prepare(`
      SELECT s.*, l.name as line_name, l.number as line_number
      FROM schedules s JOIN lines l ON s.line_id = l.id
      WHERE s.day_of_week = ? AND s.is_active = 1
      ORDER BY l.number, s.start_time
    `).all(parseInt(day_of_week));
  } else {
    schedules = db.prepare(`
      SELECT s.*, l.name as line_name, l.number as line_number
      FROM schedules s JOIN lines l ON s.line_id = l.id
      WHERE s.is_active = 1
      ORDER BY l.number, s.day_of_week, s.start_time
      LIMIT 100
    `).all();
  }
  res.json({ success: true, data: schedules });
});

// Tarifs publics (lecture seule)
router.get('/public/fares', optionalAuth, adminCtrl.getTariffs);

// Calcul du prix (public pour les guichets)
router.post('/pricing/calculate', authenticate, authorize('OPERATOR', 'SUPERADMIN'), ticketCtrl.calculatePrice);

// ============================================
// ROUTES AUTHENTIFIÉES
// ============================================

// Profil
router.get('/auth/me', authenticate, authCtrl.getMe);
router.put('/auth/change-password', authenticate, authCtrl.changePassword);

// --- TICKETS ---

// Vendre un ticket (OPERATOR + SUPERADMIN)
router.post('/sell', authenticate, authorize('OPERATOR', 'SUPERADMIN'), ticketCtrl.sellTicket);

// Scanner/Valider un ticket (CONTROLLER + SUPERADMIN)
// /scan/verify est la route principale (format réponse: { valid, reason, message, details })
// /scan est gardée pour backward compat (anciens tests)
router.post('/scan/verify', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), scanCtrl.verifyTicket);
router.post('/scan', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), scanCtrl.verifyTicket);

// Liste des tickets
router.get('/tickets', authenticate, authorize('OPERATOR', 'SUPERADMIN'), ticketCtrl.getTickets);

// Détail d'un ticket
router.get('/tickets/:id', authenticate, ticketCtrl.getTicketById);

// Image QR code
router.get('/tickets/:id/qr', authenticate, ticketCtrl.generateQRImage);

// --- TARIFS CRUD ---
router.get('/tariffs', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.getTariffs);
router.post('/tariffs', authenticate, authorize('SUPERADMIN'), adminCtrl.createTariff);
router.put('/tariffs/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateTariff);
router.delete('/tariffs/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteTariff);

// --- LIGNES CRUD ---
router.post('/lines', authenticate, authorize('SUPERADMIN'), adminCtrl.createLine);
router.put('/lines/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateLine);
router.delete('/lines/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteLine);

// --- ARRÊTS CRUD ---
router.post('/stops', authenticate, authorize('SUPERADMIN'), adminCtrl.createStop);
router.put('/stops/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateStop);
router.delete('/stops/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteStop);

// --- ZONES (CRUD protégé) ---
router.post('/zones', authenticate, authorize('SUPERADMIN'), adminCtrl.createZone);
router.put('/zones/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateZone);
router.delete('/zones/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteZone);

// --- UTILISATEURS ---
router.get('/users', authenticate, authorize('SUPERADMIN'), adminCtrl.getUsers);
router.post('/users', authenticate, authorize('SUPERADMIN'), adminCtrl.createUser);
router.put('/users/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateUser);
router.delete('/users/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteUser);

// --- SESSIONS DE CAISSE ---
router.get('/cash-sessions', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.getCashSessions);
router.post('/cash-sessions', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.openCashSession);
router.put('/cash-sessions/:id/close', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.closeCashSession);

// --- HORAIRES CRUD ---
router.post('/schedules', authenticate, authorize('SUPERADMIN'), adminCtrl.createSchedule);
router.put('/schedules/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateSchedule);

// --- CONTRÔLES ---
router.get('/controls', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.getControls);
router.get('/controls/stats', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.getControlsStats);
router.post('/controls/sync', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.syncControls);

// --- DONNÉES HORS-LIGNE ---
router.get('/offline/data', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.getOfflineData);

// --- RAPPORTS & STATISTIQUES ---
router.get('/reports/dashboard', authenticate, authorize('SUPERADMIN'), adminCtrl.getDashboard);
router.get('/reports/revenue', authenticate, authorize('SUPERADMIN'), adminCtrl.getRevenueReport);
router.get('/reports/controls', authenticate, authorize('SUPERADMIN'), adminCtrl.getControlsReport);
router.get('/reports/export', authenticate, authorize('SUPERADMIN'), adminCtrl.exportCSV);

// --- AUDIT ---
router.get('/audit-logs', authenticate, authorize('SUPERADMIN'), adminCtrl.getAuditLogs);

module.exports = router;
