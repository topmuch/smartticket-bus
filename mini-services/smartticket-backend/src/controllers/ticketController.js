// ============================================
// SmartTicket Bus - Contrôleur de Vente de Tickets
// Logique métier: Vendre, Scanner, Valider
// ============================================
const { db } = require('../config/db');
const { generateSecureQRCode, verifySecureQRCode, generateQRImage } = require('../utils/qrGenerator');
const { v4: uuidv4 } = require('uuid');

// ============================================
// VENTE DE TICKET (Le point de vente du guichet)
// ============================================
exports.sellTicket = async (req, res) => {
  const { from_zone_id, to_zone_id, passenger_name, passenger_phone, passenger_photo_url, payment_method, amount_paid } = req.body;

  try {
    // 1. Vérifier le tarif dans la base de données
    const tariff = db.prepare(`
      SELECT price FROM tariffs 
      WHERE from_zone_id = ? AND to_zone_id = ? AND is_active = 1
    `).get(from_zone_id, to_zone_id);

    if (!tariff) {
      return res.status(404).json({
        success: false,
        error: "Tarif non trouvé pour ces zones"
      });
    }

    const price = tariff.price;

    // 2. Trouver la session de caisse ouverte de l'opérateur
    const openSession = db.prepare(`
      SELECT id FROM cash_sessions 
      WHERE operator_id = ? AND status = 'OPEN'
    `).get(req.user.userId);
    const cashSessionId = openSession ? openSession.id : null;

    // 3. Générer un numéro de ticket unique
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = db.prepare(`
      SELECT COUNT(*) as cnt FROM tickets 
      WHERE ticket_number LIKE ?
    `).get(`TK-${today}-%`);
    const ticketNumber = `TK-${today}-${String(countResult.cnt + 1).padStart(4, '0')}`;

    // 4. Calculer la validité (2 heures à partir de maintenant)
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    // 5. Générer le QR Code sécurisé (JWT)
    const ticketId = uuidv4();
    const qrToken = generateSecureQRCode({
      id: ticketId,
      type: 'single',
      from_zone_id,
      to_zone_id,
      valid_until: validUntil
    });

    // 6. Insérer le ticket dans la base de données
    const changeGiven = (amount_paid || price) - price;

    db.prepare(`
      INSERT INTO tickets (
        id, ticket_number, type, status, passenger_name, passenger_phone,
        passenger_photo_url, from_zone_id, to_zone_id, price, qr_token,
        qr_signature, valid_from, valid_until, seller_id, cash_session_id, amount_paid,
        change_given, payment_method
      ) VALUES (?, ?, 'single', 'VALID', ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticketId, ticketNumber, passenger_name || null, passenger_phone || null,
      passenger_photo_url || null, from_zone_id, to_zone_id, price, qrToken,
      validFrom, validUntil, req.user.userId, cashSessionId, amount_paid || price,
      Math.max(0, changeGiven), payment_method || 'cash'
    );

    // 6. Logger l'audit
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'SELL', 'Ticket', ?, ?)
    `).run(req.user.userId, ticketId, JSON.stringify({ ticket_number: ticketNumber, price, from_zone_id, to_zone_id }));

    // 7. Répondre au guichet
    res.status(201).json({
      success: true,
      message: "Ticket vendu avec succès 🚌",
      data: {
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        qr_code: qrToken,
        qr_token: qrToken, // Alias for scan endpoint compatibility
        qrString: qrToken, // Alias for frontend compatibility
        price: price,
        amount_paid: amount_paid || price,
        change: Math.max(0, changeGiven),
        valid_from: validFrom,
        valid_until: validUntil,
        passenger_name: passenger_name || null
      }
    });

  } catch (error) {
    console.error('Erreur vente ticket:', error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la vente"
    });
  }
};

// ============================================
// VALIDATION DE TICKET (Le scanner du contrôleur)
// ============================================
exports.scanTicket = async (req, res) => {
  const { qr_string } = req.body;

  if (!qr_string) {
    return res.status(400).json({
      success: false,
      error: "QR Code requis (qr_string)"
    });
  }

  try {
    // 1. Vérifier le JWT du QR Code
    const qrResult = verifySecureQRCode(qr_string);

    if (!qrResult.valid) {
      // Enregistrer le contrôle (falsifié ou expiré)
      const controlId = uuidv4();
      db.prepare(`
        INSERT INTO controls (id, qr_data, result, reason, controller_id, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        controlId, qr_string, qrResult.error, qrResult.message,
        req.user.userId, req.body.latitude || null, req.body.longitude || null
      );

      return res.status(200).json({
        success: false,
        result: qrResult.error,
        message: qrResult.message,
        control_id: controlId
      });
    }

    // 2. Le JWT est valide, chercher le ticket dans la DB
    const ticket = db.prepare(`
      SELECT t.*, 
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code,
             u.name as seller_name
      FROM tickets t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      LEFT JOIN users u ON t.seller_id = u.id
      WHERE t.qr_token = ?
    `).get(qr_string);

    if (!ticket) {
      const controlId = uuidv4();
      db.prepare(`
        INSERT INTO controls (id, qr_data, result, reason, controller_id)
        VALUES (?, ?, 'NOT_FOUND', 'Ticket non trouvé dans la base', ?)
      `).run(controlId, qr_string, req.user.userId);

      return res.status(200).json({
        success: false,
        result: 'NOT_FOUND',
        message: 'Ticket non trouvé dans la base de données'
      });
    }

    // 3. Vérifier le statut du ticket
    if (ticket.status === 'CANCELLED') {
      const controlId = uuidv4();
      db.prepare(`
        INSERT INTO controls (id, ticket_id, qr_data, result, reason, controller_id)
        VALUES (?, ?, ?, 'INVALID', 'Ticket annulé', ?)
      `).run(controlId, ticket.id, qr_string, req.user.userId);

      return res.status(200).json({
        success: false,
        result: 'CANCELLED',
        message: 'Ce ticket a été annulé'
      });
    }

    if (ticket.status === 'USED') {
      const controlId = uuidv4();
      db.prepare(`
        INSERT INTO controls (id, ticket_id, qr_data, result, reason, controller_id)
        VALUES (?, ?, ?, 'ALREADY_USED', 'Ticket déjà utilisé', ?)
      `).run(controlId, ticket.id, qr_string, req.user.userId);

      // Chercher la dernière validation
      const lastControl = db.prepare(`
        SELECT scanned_at, u.name as controller_name
        FROM controls c
        JOIN users u ON c.controller_id = u.id
        WHERE c.ticket_id = ? AND c.result = 'VALID'
        ORDER BY c.scanned_at DESC LIMIT 1
      `).get(ticket.id);

      return res.status(200).json({
        success: false,
        result: 'ALREADY_USED',
        message: 'Ce ticket a déjà été validé',
        data: {
          ticket_number: ticket.ticket_number,
          first_validated_at: lastControl ? lastControl.scanned_at : null,
          validated_by: lastControl ? lastControl.controller_name : null
        }
      });
    }

    // 4. Vérifier l'expiration
    const now = new Date();
    const expiresAt = new Date(ticket.valid_until);
    if (now > expiresAt) {
      // Marquer comme expiré
      db.prepare(`UPDATE tickets SET status = 'EXPIRED' WHERE id = ?`).run(ticket.id);

      const controlId = uuidv4();
      db.prepare(`
        INSERT INTO controls (id, ticket_id, qr_data, result, reason, controller_id)
        VALUES (?, ?, ?, 'EXPIRED', 'Ticket expiré', ?)
      `).run(controlId, ticket.id, qr_string, req.user.userId);

      return res.status(200).json({
        success: false,
        result: 'EXPIRED',
        message: 'Ce ticket a expiré',
        data: {
          ticket_number: ticket.ticket_number,
          valid_until: ticket.valid_until
        }
      });
    }

    // 5. TICKET VALIDE ✅ — Marquer comme utilisé
    db.prepare(`
      UPDATE tickets SET status = 'USED', updated_at = datetime('now') WHERE id = ?
    `).run(ticket.id);

    const controlId = uuidv4();
    db.prepare(`
      INSERT INTO controls (id, ticket_id, qr_data, result, controller_id, latitude, longitude)
      VALUES (?, ?, ?, 'VALID', ?, ?, ?)
    `).run(
      controlId, ticket.id, qr_string, req.user.userId,
      req.body.latitude || null, req.body.longitude || null
    );

    // Logger l'audit
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'VALIDATE', 'Ticket', ?, ?)
    `).run(req.user.userId, ticket.id, JSON.stringify({ result: 'VALID', ticket_number: ticket.ticket_number }));

    res.status(200).json({
      success: true,
      result: 'VALID',
      message: 'Ticket valide ✅',
      data: {
        ticket_number: ticket.ticket_number,
        type: ticket.type,
        from_zone: ticket.from_zone_name || ticket.from_zone_id,
        to_zone: ticket.to_zone_name || ticket.to_zone_id,
        passenger_name: ticket.passenger_name,
        price: ticket.price,
        sold_at: ticket.sold_at,
        seller: ticket.seller_name,
        valid_until: ticket.valid_until,
        control_id: controlId
      }
    });

  } catch (error) {
    console.error('Erreur scan ticket:', error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors du scan"
    });
  }
};

// ============================================
// HISTORIQUE DES TICKETS
// ============================================
exports.getTickets = (req, res) => {
  try {
    const { page = 1, limit = 20, status, seller_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    // RBAC: Operator ne voit que ses propres tickets
    if (req.user.role === 'OPERATOR') {
      whereClause += ' AND t.seller_id = ?';
      params.push(req.user.userId);
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    if (seller_id && req.user.role === 'SUPERADMIN') {
      whereClause += ' AND t.seller_id = ?';
      params.push(seller_id);
    }

    const totalResult = db.prepare(`SELECT COUNT(*) as total FROM tickets t ${whereClause}`).get(...params);
    const tickets = db.prepare(`
      SELECT t.*, 
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code,
             u.name as seller_name
      FROM tickets t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      LEFT JOIN users u ON t.seller_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur get tickets:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// DÉTAILS D'UN TICKET
// ============================================
exports.getTicketById = (req, res) => {
  try {
    const ticket = db.prepare(`
      SELECT t.*, 
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code,
             u.name as seller_name
      FROM tickets t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      LEFT JOIN users u ON t.seller_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket non trouvé' });
    }

    // Historique des contrôles
    const controls = db.prepare(`
      SELECT c.*, u.name as controller_name
      FROM controls c
      JOIN users u ON c.controller_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.scanned_at DESC
    `).all(req.params.id);

    res.json({
      success: true,
      data: { ...ticket, controls }
    });
  } catch (error) {
    console.error('Erreur get ticket:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// GÉNÉRER L'IMAGE QR CODE
// ============================================
exports.generateQRImage = async (req, res) => {
  try {
    const ticket = db.prepare('SELECT qr_token FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket || !ticket.qr_token) {
      return res.status(404).json({ success: false, error: 'Ticket ou QR non trouvé' });
    }

    const imageUrl = await generateQRImage(ticket.qr_token);

    if (!imageUrl) {
      return res.status(500).json({ success: false, error: 'Erreur de génération de l\'image QR' });
    }

    res.json({
      success: true,
      data: {
        ticket_id: req.params.id,
        qr_image: imageUrl,
        qr_token: ticket.qr_token
      }
    });
  } catch (error) {
    console.error('Erreur QR image:', error);
    res.status(500).json({ success: false, error: 'Erreur génération QR' });
  }
};

// ============================================
// CALCULER LE PRIX
// ============================================
exports.calculatePrice = (req, res) => {
  try {
    const { from_zone_id, to_zone_id } = req.body;

    if (!from_zone_id || !to_zone_id) {
      return res.status(400).json({ success: false, error: 'Zones de départ et d\'arrivée requises' });
    }

    const tariff = db.prepare(`
      SELECT t.price, t.ticket_type,
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code
      FROM tariffs t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      WHERE t.from_zone_id = ? AND t.to_zone_id = ? AND t.is_active = 1
    `).get(from_zone_id, to_zone_id);

    if (!tariff) {
      return res.status(404).json({ success: false, error: 'Tarif non trouvé pour ces zones' });
    }

    res.json({
      success: true,
      data: {
        from_zone_id,
        to_zone_id,
        from_zone_name: tariff.from_zone_name,
        from_zone_code: tariff.from_zone_code,
        to_zone_name: tariff.to_zone_name,
        to_zone_code: tariff.to_zone_code,
        price: tariff.price,
        ticket_type: tariff.ticket_type
      }
    });
  } catch (error) {
    console.error('Erreur calcul prix:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
