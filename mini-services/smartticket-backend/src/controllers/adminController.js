// ============================================
// SmartTicket Bus - Contrôleur Admin
// Statistiques, Gestion, Rapports
// ============================================
const { db } = require('../config/db');
const bcrypt = require('bcryptjs');

// ============================================
// STATISTIQUES DU TABLEAU DE BORD
// ============================================
exports.getDashboard = (req, res) => {
  try {
    // Ventes du jour
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        COALESCE(SUM(price), 0) as total_revenue,
        COUNT(CASE WHEN status = 'VALID' THEN 1 END) as valid_tickets,
        COUNT(CASE WHEN status = 'USED' THEN 1 END) as used_tickets
      FROM tickets
      WHERE date(sold_at) = date('now')
    `).get();

    // Contrôles du jour
    const todayControls = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN result = 'VALID' THEN 1 END) as valid,
        COUNT(CASE WHEN result != 'VALID' THEN 1 END) as infractions
      FROM controls
      WHERE date(scanned_at) = date('now')
    `).get();

    // Revenus par jour (7 derniers jours)
    const revenueByDay = db.prepare(`
      SELECT 
        date(sold_at) as date,
        COUNT(*) as tickets,
        COALESCE(SUM(price), 0) as revenue
      FROM tickets
      WHERE sold_at >= datetime('now', '-7 days')
      GROUP BY date(sold_at)
      ORDER BY date DESC
    `).all();

    // Contrôles par résultat
    const controlResults = db.prepare(`
      SELECT result, COUNT(*) as count
      FROM controls
      WHERE date(scanned_at) = date('now')
      GROUP BY result
      ORDER BY count DESC
    `).all();

    // Top vendeurs du jour
    const topSellers = db.prepare(`
      SELECT u.name, u.email, COUNT(t.id) as tickets_sold, COALESCE(SUM(t.price), 0) as revenue
      FROM users u
      LEFT JOIN tickets t ON t.seller_id = u.id AND date(t.sold_at) = date('now')
      WHERE u.role = 'OPERATOR' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all();

    // Zones les plus empruntées
    const topRoutes = db.prepare(`
      SELECT 
        z1.name as from_zone,
        z2.name as to_zone,
        COUNT(*) as trips,
        COALESCE(SUM(t.price), 0) as revenue
      FROM tickets t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      WHERE date(t.sold_at) = date('now')
      GROUP BY t.from_zone_id, t.to_zone_id
      ORDER BY trips DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        today: {
          tickets_sold: todayStats.total_tickets,
          revenue: todayStats.total_revenue,
          valid_tickets: todayStats.valid_tickets,
          used_tickets: todayStats.used_tickets
        },
        controls: {
          total: todayControls.total,
          valid: todayControls.valid,
          infractions: todayControls.infractions
        },
        revenue_by_day: revenueByDay,
        control_results: controlResults,
        top_sellers: topSellers,
        top_routes: topRoutes
      }
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// RAPPORT DE REVENUS
// ============================================
exports.getRevenueReport = (req, res) => {
  try {
    const { from, to, group_by = 'day' } = req.query;

    let dateFilter = '';
    let groupBy = '';

    if (from && to) {
      dateFilter = `WHERE t.sold_at BETWEEN ? AND ?`;
    } else {
      dateFilter = `WHERE t.sold_at >= datetime('now', '-7 days')`;
    }

    switch (group_by) {
      case 'hour':
        groupBy = `strftime('%Y-%m-%d %H:00', t.sold_at)`;
        break;
      case 'week':
        groupBy = `strftime('%Y-W%W', t.sold_at)`;
        break;
      case 'month':
        groupBy = `strftime('%Y-%m', t.sold_at)`;
        break;
      default:
        groupBy = `date(t.sold_at)`;
    }

    const params = [];
    if (from && to) {
      params.push(from, to);
    }

    const revenue = db.prepare(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as tickets,
        COALESCE(SUM(t.price), 0) as revenue,
        COUNT(CASE WHEN t.payment_method = 'cash' THEN 1 END) as cash_count,
        COUNT(CASE WHEN t.payment_method = 'mobile' THEN 1 END) as mobile_count
      FROM tickets t
      ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 30
    `).all(...params);

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Erreur revenue report:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES ZONES (CRUD)
// ============================================
exports.getZones = (req, res) => {
  try {
    const zones = db.prepare('SELECT * FROM zones WHERE is_active = 1 ORDER BY code').all();
    res.json({ success: true, data: zones });
  } catch (error) {
    console.error('Erreur get zones:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getZoneById = (req, res) => {
  try {
    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
    if (!zone) return res.status(404).json({ success: false, error: 'Zone non trouvée' });

    const stops = db.prepare('SELECT * FROM stops WHERE zone_id = ? AND is_active = 1').all(req.params.id);
    const tariffsFrom = db.prepare(`
      SELECT t.*, z.name as to_zone_name FROM tariffs t
      JOIN zones z ON t.to_zone_id = z.id
      WHERE t.from_zone_id = ? AND t.is_active = 1
    `).all(req.params.id);

    res.json({ success: true, data: { ...zone, stops, tariffs_from: tariffsFrom } });
  } catch (error) {
    console.error('Erreur get zone:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createZone = (req, res) => {
  try {
    const { code, name, description, color } = req.body;
    const id = require('uuid').v4();

    db.prepare(`
      INSERT INTO zones (id, code, name, description, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, code, name, description || null, color || '#3b82f6');

    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'CREATE', 'Zone', ?, ?)
    `).run(req.user.userId, id, JSON.stringify({ code, name }));

    res.status(201).json({ success: true, message: 'Zone créée', data: zone });
  } catch (error) {
    console.error('Erreur create zone:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateZone = (req, res) => {
  try {
    const { name, description, color } = req.body;
    db.prepare(`
      UPDATE zones SET name = ?, description = ?, color = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description || null, color || '#3b82f6', req.params.id);

    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
    if (!zone) return res.status(404).json({ success: false, error: 'Zone non trouvée' });

    res.json({ success: true, message: 'Zone mise à jour', data: zone });
  } catch (error) {
    console.error('Erreur update zone:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.deleteZone = (req, res) => {
  try {
    db.prepare('UPDATE zones SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Zone désactivée' });
  } catch (error) {
    console.error('Erreur delete zone:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES TARIFS (CRUD)
// ============================================
exports.getTariffs = (req, res) => {
  try {
    const tariffs = db.prepare(`
      SELECT t.*, 
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code
      FROM tariffs t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      WHERE t.is_active = 1
      ORDER BY z1.code, z2.code
    `).all();

    res.json({ success: true, data: tariffs });
  } catch (error) {
    console.error('Erreur get tariffs:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createTariff = (req, res) => {
  try {
    const { from_zone_id, to_zone_id, price, ticket_type } = req.body;
    const id = require('uuid').v4();

    // Vérifier que les zones existent
    const fromZone = db.prepare('SELECT id FROM zones WHERE id = ?').get(from_zone_id);
    const toZone = db.prepare('SELECT id FROM zones WHERE id = ?').get(to_zone_id);
    if (!fromZone || !toZone) {
      return res.status(400).json({ success: false, error: 'Zone(s) non trouvée(s)' });
    }

    db.prepare(`
      INSERT INTO tariffs (id, from_zone_id, to_zone_id, price, ticket_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, from_zone_id, to_zone_id, price, ticket_type || 'single');

    const tariff = db.prepare(`
      SELECT t.*, z1.name as from_zone_name, z2.name as to_zone_name
      FROM tariffs t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      WHERE t.id = ?
    `).get(id);

    res.status(201).json({ success: true, message: 'Tarif créé', data: tariff });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ success: false, error: 'Ce tarif existe déjà pour ces zones' });
    }
    console.error('Erreur create tariff:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES UTILISATEURS (CRUD)
// ============================================
exports.getUsers = (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_active = 1';
    const params = [];

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params).count;
    const users = db.prepare(`
      SELECT id, email, name, role, is_active, phone, last_login_at, created_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Erreur get users:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, name, password, role, phone } = req.body;

    // Vérifier si l'email existe déjà
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' });
    }

    const id = require('uuid').v4();
    const passwordHash = await bcrypt.hash(password || 'Password@123', 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email, passwordHash, name, role || 'OPERATOR', phone || null);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'CREATE', 'User', ?, ?)
    `).run(req.user.userId, id, JSON.stringify({ email, name, role }));

    const user = db.prepare('SELECT id, email, name, role, phone, created_at FROM users WHERE id = ?').get(id);

    res.status(201).json({ success: true, message: 'Utilisateur créé', data: user });
  } catch (error) {
    console.error('Erreur create user:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateUser = (req, res) => {
  try {
    const { name, role, phone, is_active } = req.body;
    db.prepare(`
      UPDATE users SET name = ?, role = ?, phone = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, role, phone, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);

    const user = db.prepare('SELECT id, email, name, role, is_active, phone FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });

    res.json({ success: true, message: 'Utilisateur mis à jour', data: user });
  } catch (error) {
    console.error('Erreur update user:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES SESSIONS DE CAISSE
// ============================================
exports.getCashSessions = (req, res) => {
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'OPERATOR') {
      whereClause += ' AND cs.operator_id = ?';
      params.push(req.user.userId);
    }

    const sessions = db.prepare(`
      SELECT cs.*, u.name as operator_name
      FROM cash_sessions cs
      JOIN users u ON cs.operator_id = u.id
      ${whereClause}
      ORDER BY cs.date DESC, cs.opened_at DESC
      LIMIT 50
    `).all(...params);

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Erreur cash sessions:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.openCashSession = (req, res) => {
  try {
    // Vérifier s'il y a une session ouverte
    const openSession = db.prepare(`
      SELECT id FROM cash_sessions 
      WHERE operator_id = ? AND status = 'OPEN'
    `).get(req.user.userId);

    if (openSession) {
      return res.status(409).json({ success: false, error: 'Vous avez déjà une session de caisse ouverte' });
    }

    const id = require('uuid').v4();
    const { opening_balance } = req.body;

    db.prepare(`
      INSERT INTO cash_sessions (id, operator_id, opening_balance)
      VALUES (?, ?, ?)
    `).run(id, req.user.userId, opening_balance || 0);

    const session = db.prepare(`
      SELECT cs.*, u.name as operator_name
      FROM cash_sessions cs
      JOIN users u ON cs.operator_id = u.id
      WHERE cs.id = ?
    `).get(id);

    res.status(201).json({ success: true, message: 'Session de caisse ouverte', data: session });
  } catch (error) {
    console.error('Erreur open session:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.closeCashSession = (req, res) => {
  try {
    const session = db.prepare(`
      SELECT * FROM cash_sessions WHERE id = ? AND operator_id = ?
    `).get(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session non trouvée' });
    }
    if (session.status === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'Cette session est déjà fermée' });
    }

    // Calculer les totaux
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(price), 0) as total_revenue,
        COALESCE(SUM(amount_paid), 0) as total_cash
      FROM tickets
      WHERE seller_id = ? AND cash_session_id = ?
    `).get(req.user.userId, req.params.id);

    const { actual_cash } = req.body;
    const difference = actual_cash ? (actual_cash - totals.total_cash - (session.opening_balance || 0)) : null;

    db.prepare(`
      UPDATE cash_sessions SET 
        status = 'CLOSED',
        total_sales = ?,
        total_revenue = ?,
        expected_cash = ?,
        actual_cash = ?,
        difference = ?,
        closed_at = datetime('now')
      WHERE id = ?
    `).run(
      totals.total_sales,
      totals.total_revenue,
      totals.total_cash + (session.opening_balance || 0),
      actual_cash || null,
      difference,
      req.params.id
    );

    const updatedSession = db.prepare(`
      SELECT cs.*, u.name as operator_name
      FROM cash_sessions cs
      JOIN users u ON cs.operator_id = u.id
      WHERE cs.id = ?
    `).get(req.params.id);

    res.json({ success: true, message: 'Session de caisse fermée', data: updatedSession });
  } catch (error) {
    console.error('Erreur close session:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// HISTORIQUE DES CONTRÔLES
// ============================================
exports.getControls = (req, res) => {
  try {
    const { page = 1, limit = 20, result, controller_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'CONTROLLER') {
      whereClause += ' AND c.controller_id = ?';
      params.push(req.user.userId);
    }
    if (result) {
      whereClause += ' AND c.result = ?';
      params.push(result);
    }
    if (controller_id && req.user.role === 'SUPERADMIN') {
      whereClause += ' AND c.controller_id = ?';
      params.push(controller_id);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM controls c ${whereClause}`).get(...params).count;
    const controls = db.prepare(`
      SELECT c.*, u.name as controller_name,
             t.ticket_number, t.passenger_name
      FROM controls c
      JOIN users u ON c.controller_id = u.id
      LEFT JOIN tickets t ON c.ticket_id = t.id
      ${whereClause}
      ORDER BY c.scanned_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: controls,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Erreur get controls:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// SYNCHRONISATION HORS-LIGNE
// ============================================
exports.syncControls = (req, res) => {
  try {
    const { controls } = req.body; // Array of control objects

    if (!Array.isArray(controls) || controls.length === 0) {
      return res.status(400).json({ success: false, error: 'Liste de contrôles requise' });
    }

    if (controls.length > 500) {
      return res.status(400).json({ success: false, error: 'Maximum 500 contrôles par envoi' });
    }

    const batchId = require('uuid').v4();
    let synced = 0;

    const insertStmt = db.prepare(`
      INSERT INTO controls (id, ticket_id, qr_data, result, reason, controller_id, latitude, longitude, synced, synced_from_offline, batch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `);

    const updateTicketStmt = db.prepare(`
      UPDATE tickets SET status = 'USED', updated_at = datetime('now')
      WHERE qr_token = ? AND status = 'VALID'
    `);

    // Exécuter les insertions en boucle (pas de transaction sql.js)
    for (const ctrl of controls) {
      const controlId = require('uuid').v4();
      insertStmt.run(
        controlId,
        ctrl.ticket_id || null,
        ctrl.qr_data,
        ctrl.result,
        ctrl.reason || null,
        req.user.userId,
        ctrl.latitude || null,
        ctrl.longitude || null,
        batchId
      );

      // Si le ticket est valide, le marquer comme utilisé
      if (ctrl.result === 'VALID' && ctrl.qr_data) {
        updateTicketStmt.run(ctrl.qr_data);
      }
      synced++;
    }

    res.json({
      success: true,
      message: `${synced} contrôle(s) synchronisé(s)`,
      data: { batch_id: batchId, synced }
    });
  } catch (error) {
    console.error('Erreur sync controls:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la synchronisation' });
  }
};

// ============================================
// DONNÉES HORS-LIGNE (pour les contrôleurs)
// ============================================
exports.getOfflineData = (req, res) => {
  try {
    // Blacklist: tickets annulés/invalidés
    const blacklist = db.prepare(`
      SELECT id as ticket_id, status, updated_at as cancelled_at
      FROM tickets
      WHERE status IN ('CANCELLED', 'INVALID')
      ORDER BY updated_at DESC
    `).all();

    // Whitelist: abonnements actifs
    const whitelist = db.prepare(`
      SELECT s.ticket_id, s.passenger_name, s.end_date, s.zone_id,
             z.name as zone_name
      FROM subscriptions s
      LEFT JOIN zones z ON s.zone_id = z.id
      WHERE s.is_active = 1 AND s.end_date >= datetime('now')
    `).all();

    res.json({
      success: true,
      data: {
        blacklist,
        whitelist,
        downloaded_at: new Date().toISOString(),
        downloaded_by: req.user.userId
      }
    });
  } catch (error) {
    console.error('Erreur offline data:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// JOURNAL D'AUDIT
// ============================================
exports.getAuditLogs = (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user_id) { whereClause += ' AND a.user_id = ?'; params.push(user_id); }
    if (action) { whereClause += ' AND a.action = ?'; params.push(action); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM audit_logs a ${whereClause}`).get(...params).count;
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Erreur audit logs:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
