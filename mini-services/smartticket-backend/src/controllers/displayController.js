// ============================================
// SmartTicket Bus - Affichage Gare (Digital Signage)
// Module add-on: Stations, Départs, Messages
// ============================================
const { db } = require('../config/db');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// ============================================
// ADMIN: CRUD STATIONS
// ============================================

exports.getAllStations = (req, res) => {
  try {
    const stations = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM departures d WHERE d.station_id = s.id AND d.is_active = 1) as departures_count,
        (SELECT COUNT(*) FROM display_messages m WHERE m.station_id = s.id AND m.is_active = 1) as messages_count
      FROM stations s
      WHERE s.is_active = 1
      ORDER BY s.name
    `).all();
    res.json({ success: true, data: stations });
  } catch (error) {
    console.error('Erreur get stations:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getStationById = (req, res) => {
  try {
    const station = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM departures d WHERE d.station_id = s.id AND d.is_active = 1) as departures_count
      FROM stations s WHERE s.id = ?
    `).get(req.params.id);
    if (!station) return res.status(404).json({ success: false, error: 'Gare non trouvée' });

    const departures = db.prepare(`
      SELECT d.*, l.number as line_number, l.name as line_name, l.color as line_color
      FROM departures d
      JOIN lines l ON d.line_id = l.id
      WHERE d.station_id = ? AND d.is_active = 1
      ORDER BY d.day_of_week, d.scheduled_time
    `).all(req.params.id);

    const messages = db.prepare(`
      SELECT * FROM display_messages
      WHERE station_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({ success: true, data: { ...station, departures, messages } });
  } catch (error) {
    console.error('Erreur get station:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createStation = (req, res) => {
  try {
    const { name, city, timezone, slug } = req.body;
    const id = require('uuid').v4();

    if (!name) return res.status(400).json({ success: false, error: 'Nom requis' });

    const stationSlug = slug || name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    try {
      db.prepare(`
        INSERT INTO stations (id, name, city, timezone, slug)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, city || 'Dakar', timezone || 'Africa/Dakar', stationSlug);
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ success: false, error: 'Ce slug existe déjà' });
      }
      throw insertErr;
    }

    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'CREATE', 'Station', ?, ?)
    `).run(req.user.userId, id, JSON.stringify({ name, city }));

    res.status(201).json({ success: true, message: 'Gare créée', data: station });
  } catch (error) {
    console.error('Erreur create station:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateStation = (req, res) => {
  try {
    const { name, city, timezone, slug, is_active } = req.body;
    const existing = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Gare non trouvée' });

    db.prepare(`
      UPDATE stations SET name = ?, city = ?, timezone = ?, slug = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || existing.name,
      city !== undefined ? city : existing.city,
      timezone || existing.timezone,
      slug !== undefined ? slug : existing.slug,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );

    const station = db.prepare('SELECT * FROM stations WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Gare mise à jour', data: station });
  } catch (error) {
    console.error('Erreur update station:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.deleteStation = (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM stations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Gare non trouvée' });

    db.prepare('UPDATE stations SET is_active = 0 WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE departures SET is_active = 0 WHERE station_id = ?').run(req.params.id);
    res.json({ success: true, message: 'Gare désactivée' });
  } catch (error) {
    console.error('Erreur delete station:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// ADMIN: CRUD DEPARTURES
// ============================================

exports.getDepartures = (req, res) => {
  try {
    const { station_id, day_of_week, schedule_type } = req.query;

    let whereClause = 'WHERE d.is_active = 1';
    const params = [];

    if (station_id) { whereClause += ' AND d.station_id = ?'; params.push(station_id); }
    if (day_of_week !== undefined && day_of_week !== '') { whereClause += ' AND d.day_of_week = ?'; params.push(parseInt(day_of_week)); }
    if (schedule_type) { whereClause += ' AND d.schedule_type = ?'; params.push(schedule_type); }

    const departures = db.prepare(`
      SELECT d.*, l.number as line_number, l.name as line_name, l.color as line_color, s.name as station_name
      FROM departures d
      JOIN lines l ON d.line_id = l.id
      JOIN stations s ON d.station_id = s.id
      ${whereClause}
      ORDER BY d.day_of_week, d.scheduled_time
      LIMIT 200
    `).all(...params);

    res.json({ success: true, data: departures });
  } catch (error) {
    console.error('Erreur get departures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createDeparture = (req, res) => {
  try {
    const { station_id, line_id, scheduled_time, platform, schedule_type, day_of_week, destination } = req.body;
    const id = require('uuid').v4();

    if (!station_id || !line_id || !scheduled_time) {
      return res.status(400).json({ success: false, error: 'station_id, line_id et scheduled_time requis' });
    }

    // Validate references
    const station = db.prepare('SELECT id FROM stations WHERE id = ? AND is_active = 1').get(station_id);
    if (!station) return res.status(400).json({ success: false, error: 'Gare non trouvée' });

    const line = db.prepare('SELECT id FROM lines WHERE id = ? AND is_active = 1').get(line_id);
    if (!line) return res.status(400).json({ success: false, error: 'Ligne non trouvée' });

    db.prepare(`
      INSERT INTO departures (id, station_id, line_id, scheduled_time, platform, schedule_type, day_of_week, destination)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, station_id, line_id, scheduled_time, platform || null, schedule_type || 'departure', day_of_week !== undefined ? day_of_week : null, destination || null);

    const departure = db.prepare(`
      SELECT d.*, l.number as line_number, l.name as line_name, l.color as line_color
      FROM departures d JOIN lines l ON d.line_id = l.id WHERE d.id = ?
    `).get(id);

    res.status(201).json({ success: true, message: 'Départ créé', data: departure });
  } catch (error) {
    console.error('Erreur create departure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateDeparture = (req, res) => {
  try {
    const { scheduled_time, platform, schedule_type, day_of_week, destination, status, delay_minutes } = req.body;
    const existing = db.prepare('SELECT * FROM departures WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Départ non trouvé' });

    db.prepare(`
      UPDATE departures SET 
        scheduled_time = ?, platform = ?, schedule_type = ?, day_of_week = ?,
        destination = ?, status = ?, delay_minutes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      scheduled_time || existing.scheduled_time,
      platform !== undefined ? platform : existing.platform,
      schedule_type || existing.schedule_type,
      day_of_week !== undefined ? day_of_week : existing.day_of_week,
      destination !== undefined ? destination : existing.destination,
      status || existing.status,
      delay_minutes !== undefined ? delay_minutes : existing.delay_minutes,
      req.params.id
    );

    const departure = db.prepare(`
      SELECT d.*, l.number as line_number, l.name as line_name, l.color as line_color
      FROM departures d JOIN lines l ON d.line_id = l.id WHERE d.id = ?
    `).get(req.params.id);

    res.json({ success: true, message: 'Départ mis à jour', data: departure });
  } catch (error) {
    console.error('Erreur update departure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateDepartureDelay = (req, res) => {
  try {
    const { delay_minutes, status } = req.body;
    const existing = db.prepare('SELECT * FROM departures WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Départ non trouvé' });

    const newDelay = delay_minutes !== undefined ? delay_minutes : existing.delay_minutes;
    const newStatus = status || (newDelay > 0 ? 'delayed' : 'on-time');

    db.prepare(`
      UPDATE departures SET delay_minutes = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newDelay, newStatus, req.params.id);

    const departure = db.prepare(`
      SELECT d.*, l.number as line_number, l.name as line_name, l.color as line_color
      FROM departures d JOIN lines l ON d.line_id = l.id WHERE d.id = ?
    `).get(req.params.id);

    // Notify via broadcast if needed (future WebSocket)
    res.json({ success: true, message: 'Retard mis à jour', data: departure });
  } catch (error) {
    console.error('Erreur update delay:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.deleteDeparture = (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM departures WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Départ non trouvé' });

    db.prepare('UPDATE departures SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Départ supprimé' });
  } catch (error) {
    console.error('Erreur delete departure:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.batchCreateDepartures = (req, res) => {
  try {
    const { departures: items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Liste de départs requise' });
    }
    if (items.length > 500) {
      return res.status(400).json({ success: false, error: 'Maximum 500 départs par envoi' });
    }

    let created = 0;
    let errors = [];

    for (const item of items) {
      try {
        const id = require('uuid').v4();
        db.prepare(`
          INSERT INTO departures (id, station_id, line_id, scheduled_time, platform, schedule_type, day_of_week, destination)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          item.station_id,
          item.line_id,
          item.scheduled_time,
          item.platform || null,
          item.schedule_type || 'departure',
          item.day_of_week !== undefined ? item.day_of_week : null,
          item.destination || null
        );
        created++;
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${created} départ(s) créé(s)`,
      data: { created, errors: errors.length, details: errors }
    });
  } catch (error) {
    console.error('Erreur batch departures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// ADMIN: CSV IMPORT
// ============================================

exports.importCSV = async (req, res) => {
  try {
    const stationId = req.params.stationId;
    const station = db.prepare('SELECT id, name FROM stations WHERE id = ? AND is_active = 1').get(stationId);
    if (!station) return res.status(404).json({ success: false, error: 'Gare non trouvée' });

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fichier CSV requis' });
    }

    const results = [];
    const report = { total: 0, created: 0, updated: 0, errors: [] };

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
        }))
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch {}

    const dayNames = { 'dim': 0, 'dimanche': 0, 'lun': 1, 'lundi': 1, 'mar': 2, 'mardi': 2, 'mer': 3, 'mercredi': 3, 'jeu': 4, 'jeudi': 4, 'ven': 5, 'vendredi': 5, 'sam': 6, 'samedi': 6 };

    for (const row of results) {
      report.total++;

      try {
        // Parse row
        const lineNumber = (row.line_number || row.numero_ligne || '').trim();
        const lineName = (row.line_name || row.nom_ligne || '').trim();
        const color = (row.color || row.couleur || '#2563eb').trim();
        let dayOfWeek = row.day_of_week !== undefined ? parseInt(row.day_of_week) : null;
        if (dayOfWeek === null || isNaN(dayOfWeek)) {
          const dayStr = (row.day_of_week || row.jour || '').trim().toLowerCase();
          dayOfWeek = dayNames[dayStr];
        }
        const scheduledTime = (row.scheduled_time || row.heure || '').trim();
        const platform = (row.platform || row.quai || '').trim() || null;
        const type = (row.type || row.schedule_type || 'departure').trim();
        const destination = (row.destination || row.destination_name || '').trim() || null;

        // Validate
        if (!lineNumber || !scheduledTime) {
          report.errors.push({ row, error: 'line_number et scheduled_time requis' });
          continue;
        }

        // Validate time format
        if (!/^\d{1,2}:\d{2}$/.test(scheduledTime)) {
          report.errors.push({ row, error: `Format heure invalide: ${scheduledTime} (attendu HH:MM)` });
          continue;
        }

        // Find or create line
        let line = db.prepare('SELECT id FROM lines WHERE number = ?').get(lineNumber);
        if (!line) {
          const lineId = require('uuid').v4();
          db.prepare(`
            INSERT INTO lines (id, number, name, color, is_active)
            VALUES (?, ?, ?, ?, 1)
          `).run(lineId, lineNumber, lineName || `Ligne ${lineNumber}`, color);
          line = { id: lineId };
        }

        // Check if departure already exists (same line, station, day, time)
        const existing = db.prepare(`
          SELECT id FROM departures 
          WHERE station_id = ? AND line_id = ? AND day_of_week ${dayOfWeek !== null ? '= ?' : 'IS NULL'} AND scheduled_time = ? AND is_active = 1
        `).get(stationId, line.id, ...(dayOfWeek !== null ? [dayOfWeek] : []), scheduledTime);

        if (existing) {
          // Update existing
          db.prepare(`
            UPDATE departures SET platform = ?, schedule_type = ?, destination = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(platform, type === 'arrival' ? 'arrival' : 'departure', destination, existing.id);
          report.updated++;
        } else {
          // Create new
          const depId = require('uuid').v4();
          db.prepare(`
            INSERT INTO departures (id, station_id, line_id, scheduled_time, platform, schedule_type, day_of_week, destination)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(depId, stationId, line.id, scheduledTime, platform, type === 'arrival' ? 'arrival' : 'departure', dayOfWeek, destination);
          report.created++;
        }
      } catch (err) {
        report.errors.push({ row, error: err.message });
      }
    }

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'IMPORT_CSV', 'Departure', ?, ?)
    `).run(req.user.userId, stationId, JSON.stringify(report));

    res.json({
      success: true,
      message: `Import terminé: ${report.created} créés, ${report.updated} mis à jour, ${report.errors.length} erreurs`,
      data: report
    });
  } catch (error) {
    console.error('Erreur import CSV:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'import CSV' });
  }
};

// ============================================
// ADMIN: MESSAGES
// ============================================

exports.getMessages = (req, res) => {
  try {
    const { station_id } = req.query;
    let whereClause = 'WHERE m.is_active = 1';
    const params = [];
    if (station_id) { whereClause += ' AND m.station_id = ?'; params.push(station_id); }

    const messages = db.prepare(`
      SELECT m.*, s.name as station_name
      FROM display_messages m
      LEFT JOIN stations s ON m.station_id = s.id
      ${whereClause}
      ORDER BY m.priority = 'urgent' DESC, m.created_at DESC
      LIMIT 100
    `).all(...params);

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Erreur get messages:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.createMessage = (req, res) => {
  try {
    const { station_id, message, priority, start_date, end_date } = req.body;
    const id = require('uuid').v4();

    if (!message) return res.status(400).json({ success: false, error: 'Message requis' });

    db.prepare(`
      INSERT INTO display_messages (id, station_id, message, priority, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, station_id || null, message, priority || 'normal', start_date || null, end_date || null);

    const msg = db.prepare('SELECT * FROM display_messages WHERE id = ?').get(id);
    res.status(201).json({ success: true, message: 'Message créé', data: msg });
  } catch (error) {
    console.error('Erreur create message:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.updateMessage = (req, res) => {
  try {
    const { message, priority, start_date, end_date, is_active } = req.body;
    const existing = db.prepare('SELECT * FROM display_messages WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Message non trouvé' });

    db.prepare(`
      UPDATE display_messages SET message = ?, priority = ?, start_date = ?, end_date = ?, is_active = ?
      WHERE id = ?
    `).run(
      message || existing.message,
      priority || existing.priority,
      start_date !== undefined ? start_date : existing.start_date,
      end_date !== undefined ? end_date : existing.end_date,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );

    const msg = db.prepare('SELECT * FROM display_messages WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Message mis à jour', data: msg });
  } catch (error) {
    console.error('Erreur update message:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.deleteMessage = (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM display_messages WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Message non trouvé' });

    db.prepare('UPDATE display_messages SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Message supprimé' });
  } catch (error) {
    console.error('Erreur delete message:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// PUBLIC: AFFICHAGE GARE
// ============================================

exports.getPublicStations = (req, res) => {
  try {
    const stations = db.prepare(`
      SELECT id, name, city, slug FROM stations WHERE is_active = 1 ORDER BY name
    `).all();
    res.json({ success: true, data: stations });
  } catch (error) {
    console.error('Erreur public stations:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getPublicDisplay = (req, res) => {
  try {
    const { stationId } = req.params;
    const { type = 'departure', limit = 30 } = req.query;

    // 1. Get station info
    const station = db.prepare('SELECT * FROM stations WHERE id = ? AND is_active = 1').get(stationId);
    if (!station) {
      return res.status(404).json({ success: false, error: 'Gare non trouvée' });
    }

    // 2. Determine current day
    const now = new Date();
    // Use Dakar timezone (UTC+0)
    const dakarOffset = 0; // GMT
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    const dakarDay = now.getUTCDay(); // Sunday=0
    const currentTimeStr = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;

    // 3. Get departures for this station
    const scheduleType = type === 'arrival' ? 'arrival' : 'departure';
    const departures = db.prepare(`
      SELECT d.id, d.scheduled_time, d.platform, d.schedule_type, d.status, d.delay_minutes,
             d.destination, d.day_of_week,
             l.id as line_id, l.number as line_number, l.name as line_name, l.color as line_color
      FROM departures d
      JOIN lines l ON d.line_id = l.id AND l.is_active = 1
      WHERE d.station_id = ? AND d.is_active = 1 AND d.schedule_type = ?
        AND (d.day_of_week IS NULL OR d.day_of_week = ?)
      ORDER BY d.scheduled_time ASC
      LIMIT ?
    `).all(stationId, scheduleType, dakarDay, parseInt(limit));

    // 4. Calculate estimated time and enrich
    const nowMinutes = utcHours * 60 + utcMinutes;
    const enrichedDepartures = departures.map(d => {
      const [h, m] = d.scheduled_time.split(':').map(Number);
      const schedMinutes = h * 60 + m;
      let estimatedMinutes = schedMinutes + (d.delay_minutes || 0);

      // If estimated time is before now, mark as departed (unless it's tomorrow)
      let effectiveStatus = d.status;
      if (effectiveStatus === 'on-time' && schedMinutes < nowMinutes - 5) {
        effectiveStatus = 'departed';
      }
      if (effectiveStatus === 'delayed' && estimatedMinutes < nowMinutes - 5) {
        effectiveStatus = 'departed';
      }

      const estH = Math.floor(estimatedMinutes / 60) % 24;
      const estM = estimatedMinutes % 60;
      const estimatedTime = `${String(estH).padStart(2, '0')}:${String(estM).padStart(2, '0')}`;

      // Calculate minutes until departure
      const minutesUntil = estimatedMinutes - nowMinutes;
      const isImminent = minutesUntil > 0 && minutesUntil <= 10;
      const isPast = effectiveStatus === 'departed' || minutesUntil < -5;

      return {
        id: d.id,
        lineNumber: d.line_number,
        lineName: d.line_name,
        lineColor: d.line_color,
        destination: d.destination || d.line_name,
        scheduledTime: d.scheduled_time,
        estimatedTime,
        platform: d.platform,
        status: effectiveStatus,
        type: d.schedule_type,
        delayMinutes: d.delay_minutes || 0,
        minutesUntil,
        isImminent,
        isPast,
      };
    });

    // Sort: past items last, then by time
    enrichedDepartures.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      return a.minutesUntil - b.minutesUntil;
    });

    // 5. Get active messages for this station (and global messages with no station_id)
    const messages = db.prepare(`
      SELECT id, message, priority FROM display_messages
      WHERE is_active = 1 
        AND (station_id IS NULL OR station_id = ?)
        AND (start_date IS NULL OR start_date <= datetime('now'))
        AND (end_date IS NULL OR end_date >= datetime('now'))
      ORDER BY 
        CASE priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 WHEN 'info' THEN 2 END,
        created_at DESC
    `).all(stationId);

    // 6. Build response
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    res.json({
      success: true,
      data: {
        station: {
          id: station.id,
          name: station.name,
          city: station.city,
          timezone: station.timezone,
        },
        currentTime: currentTimeStr,
        dayName: dayNames[dakarDay],
        departures: enrichedDepartures,
        messages: messages.map(m => ({
          id: m.id,
          text: m.message,
          priority: m.priority,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur public display:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
