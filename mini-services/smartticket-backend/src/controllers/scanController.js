// ============================================
// SmartTicket Bus - Contrôleur de Scan (Validation)
// Cœur du système : valide ou refuse un ticket
// Rapide, sécurisé, avec diagnostic clair
// ============================================
const { db } = require('../config/db');
const { verifySecureQRCode } = require('../utils/qrGenerator');
const { v4: uuidv4 } = require('uuid');

// ============================================
// VALIDATION DE TICKET (Le scanner du contrôleur)
// Route: POST /api/v1/scan/verify
// ============================================
const verifyTicket = async (req, res) => {
  // Accepte qr_token (spec) ou qr_string (backward compat)
  const qr_token = req.body.qr_token || req.body.qr_string;

  // Accepte location_lat/location_lng (spec) ou latitude/longitude (existant)
  const location_lat = req.body.location_lat ?? req.body.latitude ?? null;
  const location_lng = req.body.location_lng ?? req.body.longitude ?? null;

  // controller_id vient du JWT (plus sûr), pas du body
  const controller_id = req.user.userId;

  if (!qr_token) {
    return res.status(400).json({
      valid: false,
      reason: 'missing_qr_token',
      message: "Token QR manquant. Scannez le ticket du passager."
    });
  }

  try {
    // ═══════════════════════════════════════════
    // ÉTAPE 1 : Vérification Cryptographique (HORS DB)
    // On vérifie la signature JWT AVANT de toucher la DB
    // C'est rapide et rejette immédiatement les faux tickets
    // ═══════════════════════════════════════════
    const cryptoCheck = verifySecureQRCode(qr_token);

    if (!cryptoCheck.valid) {
      // Enregistrer la tentative de fraude/erreur
      logControl(null, controller_id, cryptoCheck.error, cryptoCheck.message, qr_token, location_lat, location_lng);

      return res.json({
        valid: false,
        reason: cryptoCheck.error,  // 'expired', 'falsified', 'invalid'
        message: getMessageForReason(cryptoCheck.error)
      });
    }

    const ticketData = cryptoCheck.payload; // { tid, typ, zf, zt, exp, iat }

    // ═══════════════════════════════════════════
    // ÉTAPE 2 : Vérification en Base de Données
    // Le JWT est valide, mais le ticket a-t-il été annulé ?
    // ═══════════════════════════════════════════
    const ticket = db.prepare(`
      SELECT t.*,
             z1.name as from_zone_name, z1.code as from_zone_code,
             z2.name as to_zone_name, z2.code as to_zone_code,
             u.name as seller_name
      FROM tickets t
      LEFT JOIN zones z1 ON t.from_zone_id = z1.id
      LEFT JOIN zones z2 ON t.to_zone_id = z2.id
      LEFT JOIN users u ON t.seller_id = u.id
      WHERE t.id = ? AND t.qr_token = ?
    `).get(ticketData.tid, qr_token);

    if (!ticket) {
      // Ticket introuvable en DB (annulé/supprimé après génération du QR)
      logControl(null, controller_id, 'NOT_FOUND', 'Ticket non trouvé dans la base', qr_token, location_lat, location_lng);

      return res.json({
        valid: false,
        reason: 'not_found_db',
        message: "Ticket inconnu dans le système. Le ticket a peut-être été annulé."
      });
    }

    // ═══════════════════════════════════════════
    // ÉTAPE 3 : Vérification du statut du ticket
    // ═══════════════════════════════════════════

    // 3a. Ticket annulé ?
    if (ticket.status === 'CANCELLED') {
      logControl(ticket.id, controller_id, 'CANCELLED', 'Ticket annulé', qr_token, location_lat, location_lng);

      return res.json({
        valid: false,
        reason: 'cancelled',
        message: "Ce ticket a été annulé par l'administration.",
        details: {
          ticket_number: ticket.ticket_number,
          passenger_name: ticket.passenger_name || "Anonyme"
        }
      });
    }

    // 3b. Ticket déjà utilisé ?
    if (ticket.status === 'USED') {
      // Chercher la dernière validation pour donner l'info au contrôleur
      const lastControl = db.prepare(`
        SELECT c.scanned_at, u.name as controller_name
        FROM controls c
        JOIN users u ON c.controller_id = u.id
        WHERE c.ticket_id = ? AND c.result = 'VALID'
        ORDER BY c.scanned_at DESC LIMIT 1
      `).get(ticket.id);

      logControl(ticket.id, controller_id, 'ALREADY_USED', 'Ticket déjà utilisé', qr_token, location_lat, location_lng);

      return res.json({
        valid: false,
        reason: 'already_used',
        message: "Ticket déjà utilisé ! Ce passager a déjà été contrôlé.",
        details: {
          ticket_number: ticket.ticket_number,
          passenger_name: ticket.passenger_name || "Anonyme",
          first_validated_at: lastControl ? lastControl.scanned_at : null,
          validated_by: lastControl ? lastControl.controller_name : null
        }
      });
    }

    // 3c. Ticket expiré ?
    const now = new Date();
    const expiresAt = new Date(ticket.valid_until);
    if (now > expiresAt) {
      // Marquer comme expiré en DB
      db.prepare(`UPDATE tickets SET status = 'EXPIRED', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);

      logControl(ticket.id, controller_id, 'EXPIRED', 'Ticket expiré', qr_token, location_lat, location_lng);

      return res.json({
        valid: false,
        reason: 'expired',
        message: "Ce ticket a expiré.",
        details: {
          ticket_number: ticket.ticket_number,
          valid_until: ticket.valid_until
        }
      });
    }

    // ═══════════════════════════════════════════
    // ÉTAPE 4 : Logique métier par type de ticket
    // ═══════════════════════════════════════════

    if (ticket.type === 'single') {
      // Ticket unitaire : marquer comme utilisé IMMÉDIATEMENT
      // pour éviter le double usage simultané (race condition)
      db.prepare(`
        UPDATE tickets SET status = 'USED', updated_at = datetime('now') WHERE id = ? AND status = 'VALID'
      `).run(ticket.id);

      // Vérifier qu'on l'a bien marqué (pas un double scan)
      const updated = db.prepare('SELECT status FROM tickets WHERE id = ?').get(ticket.id);
      if (updated && updated.status !== 'USED') {
        // Quelqu'un d'autre a validé ce ticket entre-temps
        logControl(ticket.id, controller_id, 'ALREADY_USED', 'Double scan simultané', qr_token, location_lat, location_lng);

        return res.json({
          valid: false,
          reason: 'already_used',
          message: "Ticket déjà utilisé ! (contrôle simultané détecté)"
        });
      }
    }
    // Note: Les tickets 'subscription' ne sont pas marqués USED
    // (valides pendant toute la durée de l'abonnement)

    // ═══════════════════════════════════════════
    // ÉTAPE 5 : SUCCÈS ! Enregistrer et répondre
    // ═══════════════════════════════════════════

    const control_id = logControl(ticket.id, controller_id, 'VALID', null, qr_token, location_lat, location_lng);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'VALIDATE', 'Ticket', ?, ?)
    `).run(controller_id, ticket.id, JSON.stringify({
      result: 'VALID',
      ticket_number: ticket.ticket_number,
      type: ticket.type
    }));

    // Construire l'affichage des zones
    const zoneDisplay = ticket.from_zone_code && ticket.to_zone_code
      ? `Zone ${ticket.from_zone_code} → Zone ${ticket.to_zone_code}`
      : `${ticket.from_zone_name || '?'} → ${ticket.to_zone_name || '?'}`;

    res.json({
      valid: true,
      message: "TICKET VALIDE ✅",
      details: {
        ticket_number: ticket.ticket_number,
        type: ticket.type,
        passenger_name: ticket.passenger_name || "Anonyme",
        passenger_photo_url: ticket.passenger_photo_url || null,
        zones: zoneDisplay,
        from_zone: ticket.from_zone_name || ticket.from_zone_id,
        to_zone: ticket.to_zone_name || ticket.to_zone_id,
        price: ticket.price,
        sold_at: ticket.sold_at,
        seller: ticket.seller_name,
        valid_until: ticket.valid_until,
        control_id: control_id
      }
    });

  } catch (error) {
    console.error('Erreur scan ticket:', error);
    res.status(500).json({
      valid: false,
      reason: 'server_error',
      message: "Erreur serveur lors de la validation. Réessayez."
    });
  }
};

// ============================================
// FONCTION UTILITAIRE : Enregistrer un contrôle
// Insère dans la table controls et retourne l'ID
// ============================================
function logControl(ticketId, controllerId, result, reason, qrData, lat, lng) {
  try {
    const controlId = uuidv4();
    db.prepare(`
      INSERT INTO controls (id, ticket_id, qr_data, result, reason, controller_id, latitude, longitude, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(controlId, ticketId, qrData, result, reason, controllerId, lat, lng);
    return controlId;
  } catch (e) {
    console.error('Échec log control:', e);
    return null;
  }
}

// ============================================
// MESSAGES HUMAINS pour les raisons d'invalidité
// ============================================
function getMessageForReason(reason) {
  const messages = {
    'expired':          "⏰ Ticket expiré. La durée de validité est dépassée.",
    'falsified':        "🚫 Ticket falsifié ou invalide. La signature ne correspond pas.",
    'invalid':          "❌ Ticket invalide. Format non reconnu.",
    'already_used':     "🔁 Ticket déjà utilisé ! Ce billet a déjà été validé.",
    'cancelled':        "⛔ Ticket annulé. Ce billet a été révoqué par l'administration.",
    'not_found_db':     "❓ Ticket non reconnu. Le ticket a peut-être été annulé après émission.",
    'missing_qr_token': "📷 Aucun QR code détecté. Scannez à nouveau le ticket.",
    'server_error':     "⚠️ Erreur serveur. Réessayez dans un instant."
  };
  return messages[reason] || "Ticket invalide.";
}

module.exports = { verifyTicket, logControl, getMessageForReason };
