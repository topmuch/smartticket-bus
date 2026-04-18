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
const { validate } = require('../utils/validators');
const {
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
  createZoneSchema,
  updateZoneSchema,
  createTariffSchema,
  calculatePriceSchema,
  sellTicketSchema,
  scanVerifySchema,
  createCashSessionSchema,
  closeCashSessionSchema,
  syncControlsSchema,
  createUserSchema,
  updateUserSchema,
  createLineSchema,
  createStopSchema
} = require('../utils/validators');

// ============================================
// ROUTES PUBLIQUES (sans authentification)
// ============================================

// Test
router.get('/', (req, res) => {
  res.json({ status: "SmartTicket API v1 is running 🚌", timestamp: new Date().toISOString() });
});

// Authentification
router.post('/auth/login', validate(loginSchema), authCtrl.login);
router.post('/auth/refresh', validate(refreshTokenSchema), authCtrl.refresh);

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

// Horaires publics — Format passager (prochains départs avec arrêts)
// GET /api/v1/public/passages?line_id=l-01&day_of_week=1
router.get('/public/passages', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const { line_id, day_of_week } = req.query;

  if (!line_id) {
    return res.status(400).json({ success: false, error: "ID de ligne requis" });
  }

  // 1. Déterminer le jour de la semaine (0=Dim, 1=Lun...)
  const currentDay = day_of_week !== undefined ? parseInt(day_of_week) : new Date().getDay();

  if (isNaN(currentDay) || currentDay < 0 || currentDay > 6) {
    return res.status(400).json({ success: false, error: "day_of_week doit être entre 0 et 6" });
  }

  try {
    // 2. Récupérer les infos de la ligne et ses horaires pour ce jour
    const scheduleRows = db.prepare(`
      SELECT 
        l.id as line_id,
        l.number as line_number, 
        l.name as line_name, 
        l.color as color_hex,
        s.start_time, 
        s.end_time,
        s.frequency
      FROM lines l
      JOIN schedules s ON l.id = s.line_id
      WHERE l.id = ? AND s.day_of_week = ? AND s.is_active = 1 AND l.is_active = 1
      ORDER BY s.start_time ASC
    `).all(line_id, currentDay);

    if (scheduleRows.length === 0) {
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return res.json({ 
        success: true,
        message: `Aucun service prévu pour cette ligne le ${dayNames[currentDay]}.`, 
        data: {
          line: null,
          passages: []
        }
      });
    }

    const lineInfo = {
      id: scheduleRows[0].line_id,
      number: scheduleRows[0].line_number,
      name: scheduleRows[0].line_name,
      color: scheduleRows[0].color_hex,
    };

    // 3. Récupérer les arrêts de la ligne (ordonnés)
    const stopRows = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN ls.from_stop_id IS NOT NULL THEN ls.from_stop_id ELSE ls.to_stop_id END as stop_id,
        s.name as stop_name,
        s.code as stop_code,
        z.name as zone_name,
        z.color as zone_color
      FROM line_stops ls
      JOIN stops s ON (
        CASE WHEN ls.from_stop_id IS NOT NULL THEN ls.from_stop_id ELSE ls.to_stop_id END
      ) = s.id
      LEFT JOIN zones z ON s.zone_id = z.id
      WHERE ls.line_id = ?
      ORDER BY ls.stop_order ASC
    `).all(line_id);

    // Fallback: if no stops, try getting first stop from line_stops
    let stops = stopRows;
    if (stops.length === 0) {
      stops = db.prepare(`
        SELECT 
          ls.from_stop_id as stop_id,
          s.name as stop_name,
          s.code as stop_code,
          z.name as zone_name,
          z.color as zone_color
        FROM line_stops ls
        JOIN stops s ON ls.from_stop_id = s.id
        LEFT JOIN zones z ON s.zone_id = z.id
        WHERE ls.line_id = ?
        ORDER BY ls.stop_order ASC
      `).all(line_id);
    }

    // 4. Calculer les prochains départs à partir de la fréquence
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const passages = [];
    const maxPassages = 20; // Limiter le nombre de passages

    for (const sched of scheduleRows) {
      const [startH, startM] = sched.start_time.split(':').map(Number);
      const [endH, endM] = sched.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const freq = sched.frequency || 15;

      // Generate next departure times
      let time = Math.max(startMinutes, nowMinutes);
      // Round up to next frequency boundary
      if (time > startMinutes && (time - startMinutes) % freq !== 0) {
        time = time + (freq - ((time - startMinutes) % freq));
      }

      let count = 0;
      while (time <= endMinutes && count < maxPassages) {
        const h = Math.floor(time / 60);
        const m = time % 60;
        const departureTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        passages.push({
          departure_time: departureTime,
          start_time: sched.start_time,
          end_time: sched.end_time,
          frequency: freq,
          stops: stops.map(s => ({
            stop_id: s.stop_id,
            stop_name: s.stop_name,
            stop_code: s.stop_code,
            zone_name: s.zone_name || '',
            zone_color: s.zone_color || '#6b7280',
          })),
        });

        time += freq;
        count++;
      }
    }

    // 5. Trier par heure de départ
    passages.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

    // 6. Si tous les bus sont passés, afficher un message
    const isServiceEnded = passages.length === 0 && scheduleRows.length > 0;
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    res.json({
      success: true,
      data: {
        line: lineInfo,
        day_of_week: currentDay,
        day_name: dayNames[currentDay],
        current_time: currentTimeStr,
        is_service_ended: isServiceEnded,
        passages: passages,
        stops: stops.map(s => ({
          stop_id: s.stop_id,
          stop_name: s.stop_name,
          stop_code: s.stop_code,
          zone_name: s.zone_name || '',
          zone_color: s.zone_color || '#6b7280',
        })),
      },
    });

  } catch (error) {
    console.error('Public passages error:', error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});

// Tarifs publics (lecture seule)
router.get('/public/fares', optionalAuth, adminCtrl.getTariffs);

// Calcul du prix (public - accessible depuis le portail passagers)
router.post('/pricing/calculate', validate(calculatePriceSchema), optionalAuth, ticketCtrl.calculatePrice);

// Recherche publique
router.get('/public/search', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, error: 'Requête trop courte (min 2 caractères)' });
  }
  const lines = db.prepare(`
    SELECT l.id, l.number, l.name, l.color
    FROM lines l
    WHERE l.is_active = 1 AND (l.name LIKE ? OR l.number LIKE ?)
    ORDER BY l.number LIMIT 20
  `).all(`%${q}%`, `%${q}%`);
  const stops = db.prepare(`
    SELECT s.id, s.name, s.code, s.zone_id, z.name as zone_name, z.color as zone_color
    FROM stops s JOIN zones z ON s.zone_id = z.id
    WHERE s.is_active = 1 AND (s.name LIKE ? OR s.code LIKE ?)
    ORDER BY s.code LIMIT 20
  `).all(`%${q}%`, `%${q}%`);
  res.json({ success: true, data: { lines, stops } });
});

// Line Stops (public)
router.get('/line-stops', optionalAuth, (req, res) => {
  const { db } = require('../config/db');
  const { line_id } = req.query;
  let rows;
  if (line_id) {
    rows = db.prepare(`
      SELECT ls.*, s.name as stop_name, s.code as stop_code, s.latitude, s.longitude,
             s.zone_id, z.name as zone_name, z.code as zone_code, z.color as zone_color
      FROM line_stops ls
      LEFT JOIN stops s ON ls.to_stop_id = s.id
      LEFT JOIN zones z ON s.zone_id = z.id
      WHERE ls.line_id = ?
      ORDER BY ls.stop_order
    `).all(line_id);
  } else {
    rows = db.prepare(`
      SELECT ls.*, s.name as stop_name, s.code as stop_code,
             l.name as line_name, l.number as line_number
      FROM line_stops ls
      LEFT JOIN stops s ON ls.to_stop_id = s.id
      LEFT JOIN lines l ON ls.line_id = l.id
      ORDER BY l.number, ls.stop_order
      LIMIT 100
    `).all();
  }
  res.json({ success: true, data: rows });
});

// Cash Sessions - Open (convenience route)
router.post('/cash-sessions/open', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(createCashSessionSchema), adminCtrl.openCashSession);

// Cash Sessions - Close (finds open session for current operator)
router.put('/cash-sessions/close', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(closeCashSessionSchema), (req, res) => {
  const { db } = require('../config/db');
  try {
    const isSuperAdmin = req.user.role === 'SUPERADMIN';
    const sessionQuery = isSuperAdmin
      ? 'SELECT * FROM cash_sessions WHERE status = \'OPEN\' ORDER BY opened_at DESC LIMIT 1'
      : 'SELECT * FROM cash_sessions WHERE operator_id = ? AND status = \'OPEN\' ORDER BY opened_at DESC LIMIT 1';
    const sessionParams = isSuperAdmin ? [] : [req.user.userId];
    const session = db.prepare(sessionQuery).get(...sessionParams);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Aucune session ouverte trouvée' });
    }
    req.params.id = session.id;
    adminCtrl.closeCashSession(req, res);
  } catch (error) {
    console.error('Erreur close session:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES AUTHENTIFIÉES
// ============================================

// Profil
router.get('/auth/me', authenticate, authCtrl.getMe);
router.put('/auth/change-password', authenticate, validate(changePasswordSchema), authCtrl.changePassword);

// --- TICKETS ---

// Calcul du prix (alias pour compatibilité frontend)
router.post('/tickets/calculate-price', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(calculatePriceSchema), ticketCtrl.calculatePrice);

// Vendre un ticket (OPERATOR + SUPERADMIN)
router.post('/sell', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(sellTicketSchema), ticketCtrl.sellTicket);

// Scanner/Valider un ticket (CONTROLLER + SUPERADMIN)
// /scan/verify est la route principale (format réponse: { valid, reason, message, details })
// /scan est gardée pour backward compat (anciens tests)
router.post('/scan/verify', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), validate(scanVerifySchema), scanCtrl.verifyTicket);
router.post('/scan', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), validate(scanVerifySchema), scanCtrl.verifyTicket);

// Liste des tickets
router.get('/tickets', authenticate, authorize('OPERATOR', 'SUPERADMIN'), ticketCtrl.getTickets);

// Détail d'un ticket
router.get('/tickets/:id', authenticate, ticketCtrl.getTicketById);

// Image QR code
router.get('/tickets/:id/qr', authenticate, ticketCtrl.generateQRImage);

// --- TARIFS CRUD ---
router.get('/tariffs', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.getTariffs);
router.post('/tariffs', authenticate, authorize('SUPERADMIN'), validate(createTariffSchema), adminCtrl.createTariff);
router.put('/tariffs/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateTariff);
router.delete('/tariffs/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteTariff);

// --- LIGNES CRUD ---
router.post('/lines', authenticate, authorize('SUPERADMIN'), validate(createLineSchema), adminCtrl.createLine);
router.put('/lines/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateLine);
router.delete('/lines/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteLine);

// --- ARRÊTS CRUD ---
router.post('/stops', authenticate, authorize('SUPERADMIN'), validate(createStopSchema), adminCtrl.createStop);
router.put('/stops/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateStop);
router.delete('/stops/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteStop);

// --- ZONES (CRUD protégé) ---
router.post('/zones', authenticate, authorize('SUPERADMIN'), validate(createZoneSchema), adminCtrl.createZone);
router.put('/zones/:id', authenticate, authorize('SUPERADMIN'), validate(updateZoneSchema), adminCtrl.updateZone);
router.delete('/zones/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteZone);

// --- UTILISATEURS ---
router.get('/users', authenticate, authorize('SUPERADMIN'), adminCtrl.getUsers);
router.post('/users', authenticate, authorize('SUPERADMIN'), validate(createUserSchema), adminCtrl.createUser);
router.put('/users/:id', authenticate, authorize('SUPERADMIN'), validate(updateUserSchema), adminCtrl.updateUser);
router.delete('/users/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.deleteUser);

// --- SESSIONS DE CAISSE ---
router.get('/cash-sessions', authenticate, authorize('OPERATOR', 'SUPERADMIN'), adminCtrl.getCashSessions);
router.post('/cash-sessions', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(createCashSessionSchema), adminCtrl.openCashSession);
router.put('/cash-sessions/:id/close', authenticate, authorize('OPERATOR', 'SUPERADMIN'), validate(closeCashSessionSchema), adminCtrl.closeCashSession);

// --- HORAIRES CRUD ---
router.post('/schedules', authenticate, authorize('SUPERADMIN'), adminCtrl.createSchedule);
router.put('/schedules/:id', authenticate, authorize('SUPERADMIN'), adminCtrl.updateSchedule);

// --- CONTRÔLES ---
router.get('/controls', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.getControls);
router.get('/controls/stats', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), adminCtrl.getControlsStats);
router.post('/controls/sync', authenticate, authorize('CONTROLLER', 'SUPERADMIN'), validate(syncControlsSchema), adminCtrl.syncControls);

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
