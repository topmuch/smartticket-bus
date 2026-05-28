// ============================================
// SmartTicket Bus - Configuration Base de données
// SQLite via better-sqlite3 (natif, pas de WASM)
// ============================================
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './data/smartticket.db');
const DB_DIR = path.dirname(DB_PATH);

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Instance unique de la DB (better-sqlite3 est synchrone)
const db = new Database(DB_PATH);

// Activer WAL et foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Crée le schéma de la base de données
 */
function createSchema() {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'OPERATOR' CHECK(role IN ('SUPERADMIN', 'OPERATOR', 'CONTROLLER')),
    is_active     INTEGER NOT NULL DEFAULT 1,
    phone         TEXT,
    last_login_at TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS zones (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#3b82f6',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS tariffs (
    id              TEXT PRIMARY KEY,
    from_zone_id    TEXT NOT NULL REFERENCES zones(id),
    to_zone_id      TEXT NOT NULL REFERENCES zones(id),
    price           REAL NOT NULL,
    ticket_type     TEXT NOT NULL DEFAULT 'single' CHECK(ticket_type IN ('single', 'subscription')),
    passenger_name  TEXT,
    passenger_photo_url TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_zone_id, to_zone_id)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS lines (
    id          TEXT PRIMARY KEY,
    number      TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    color       TEXT DEFAULT '#16a34a',
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Add description column if it doesn't exist (migration for existing DB)
  try { db.exec('ALTER TABLE lines ADD COLUMN description TEXT'); } catch(e) { /* column already exists */ }

  db.exec(`CREATE TABLE IF NOT EXISTS stops (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE NOT NULL,
    zone_id     TEXT NOT NULL REFERENCES zones(id),
    latitude    REAL,
    longitude   REAL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS line_stops (
    id          TEXT PRIMARY KEY,
    line_id     TEXT NOT NULL REFERENCES lines(id),
    from_stop_id TEXT NOT NULL,
    to_stop_id   TEXT NOT NULL,
    stop_order  INTEGER NOT NULL,
    direction   TEXT NOT NULL DEFAULT 'forward',
    duration    INTEGER,
    UNIQUE(line_id, from_stop_id, to_stop_id, direction)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS schedules (
    id          TEXT PRIMARY KEY,
    line_id     TEXT NOT NULL REFERENCES lines(id),
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    frequency   INTEGER NOT NULL DEFAULT 15,
    is_active   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(line_id, day_of_week, start_time)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS tickets (
    id                 TEXT PRIMARY KEY,
    ticket_number      TEXT UNIQUE NOT NULL,
    type               TEXT NOT NULL DEFAULT 'single' CHECK(type IN ('single', 'subscription')),
    status             TEXT NOT NULL DEFAULT 'VALID' CHECK(status IN ('VALID', 'USED', 'EXPIRED', 'CANCELLED', 'INVALID')),
    passenger_name     TEXT,
    passenger_phone    TEXT,
    passenger_photo_url TEXT,
    from_zone_id       TEXT REFERENCES zones(id),
    to_zone_id         TEXT REFERENCES zones(id),
    from_stop_id       TEXT,
    to_stop_id         TEXT,
    line_id            TEXT,
    price              REAL NOT NULL DEFAULT 0,
    qr_token           TEXT UNIQUE,
    qr_signature       TEXT,
    valid_from         TEXT NOT NULL DEFAULT (datetime('now')),
    valid_until        TEXT NOT NULL,
    seller_id          TEXT NOT NULL REFERENCES users(id),
    cash_session_id    TEXT,
    sold_at            TEXT NOT NULL DEFAULT (datetime('now')),
    amount_paid        REAL NOT NULL DEFAULT 0,
    change_given       REAL NOT NULL DEFAULT 0,
    payment_method     TEXT NOT NULL DEFAULT 'cash',
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS controls (
    id                  TEXT PRIMARY KEY,
    ticket_id           TEXT REFERENCES tickets(id),
    qr_data             TEXT NOT NULL,
    result              TEXT NOT NULL CHECK(result IN ('VALID', 'INVALID', 'EXPIRED', 'ALREADY_USED', 'WRONG_ZONE', 'FALSIFIED', 'NOT_FOUND')),
    reason              TEXT,
    controller_id       TEXT NOT NULL REFERENCES users(id),
    scanned_at          TEXT NOT NULL DEFAULT (datetime('now')),
    synced              INTEGER NOT NULL DEFAULT 0,
    synced_at           TEXT,
    synced_from_offline INTEGER NOT NULL DEFAULT 0,
    batch_id            TEXT,
    latitude            REAL,
    longitude           REAL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS cash_sessions (
    id              TEXT PRIMARY KEY,
    operator_id     TEXT NOT NULL REFERENCES users(id),
    date            TEXT NOT NULL DEFAULT (date('now')),
    status          TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
    opening_balance REAL NOT NULL DEFAULT 0,
    total_sales     INTEGER NOT NULL DEFAULT 0,
    total_revenue   REAL NOT NULL DEFAULT 0,
    expected_cash   REAL NOT NULL DEFAULT 0,
    actual_cash     REAL,
    difference      REAL,
    notes           TEXT,
    opened_at       TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at       TEXT
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS subscriptions (
    id               TEXT PRIMARY KEY,
    ticket_id        TEXT UNIQUE NOT NULL REFERENCES tickets(id),
    passenger_name   TEXT NOT NULL,
    passenger_phone  TEXT NOT NULL,
    passenger_photo  TEXT,
    zone_id          TEXT REFERENCES zones(id),
    duration_days    INTEGER NOT NULL DEFAULT 30,
    start_date       TEXT NOT NULL,
    end_date         TEXT NOT NULL,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    details    TEXT,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ============================================
  // AFFICHAGE GARE (Digital Signage) - MODULE ADD-ON
  // ============================================

  db.exec(`CREATE TABLE IF NOT EXISTS stations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    city        TEXT,
    timezone    TEXT DEFAULT 'Africa/Dakar',
    slug        TEXT UNIQUE,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS departures (
    id              TEXT PRIMARY KEY,
    station_id      TEXT NOT NULL REFERENCES stations(id),
    line_id         TEXT NOT NULL REFERENCES lines(id),
    scheduled_time  TEXT NOT NULL,
    platform        TEXT,
    schedule_type   TEXT NOT NULL DEFAULT 'departure' CHECK(schedule_type IN ('departure', 'arrival')),
    status          TEXT NOT NULL DEFAULT 'on-time' CHECK(status IN ('on-time', 'delayed', 'cancelled', 'departed')),
    delay_minutes   INTEGER NOT NULL DEFAULT 0,
    day_of_week     INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
    destination     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS display_messages (
    id          TEXT PRIMARY KEY,
    station_id  TEXT REFERENCES stations(id),
    message     TEXT NOT NULL,
    priority    TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('urgent', 'normal', 'info')),
    start_date  TEXT,
    end_date    TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Index pour les performances
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tickets_seller ON tickets(seller_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_qr_token ON tickets(qr_token)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_valid_until ON tickets(valid_until)',
    'CREATE INDEX IF NOT EXISTS idx_controls_controller ON controls(controller_id)',
    'CREATE INDEX IF NOT EXISTS idx_controls_ticket ON controls(ticket_id)',
    'CREATE INDEX IF NOT EXISTS idx_controls_result ON controls(result)',
    'CREATE INDEX IF NOT EXISTS idx_cash_sessions_operator ON cash_sessions(operator_id)',
    'CREATE INDEX IF NOT EXISTS idx_tariffs_zones ON tariffs(from_zone_id, to_zone_id)',
    'CREATE INDEX IF NOT EXISTS idx_stops_zone ON stops(zone_id)',
    'CREATE INDEX IF NOT EXISTS idx_line_stops_line ON line_stops(line_id)',
    'CREATE INDEX IF NOT EXISTS idx_schedules_line ON schedules(line_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_departures_station ON departures(station_id)',
    'CREATE INDEX IF NOT EXISTS idx_departures_line ON departures(line_id)',
    'CREATE INDEX IF NOT EXISTS idx_departures_lookup ON departures(station_id, day_of_week, scheduled_time)',
    'CREATE INDEX IF NOT EXISTS idx_display_messages_station ON display_messages(station_id)',
  ];

  for (const idx of indexes) {
    db.exec(idx);
  }

  console.log('✅ Schéma de la base de données créé avec succès');
}

/**
 * Vérifie la connexion
 */
function checkConnection() {
  try {
    const row = db.prepare("SELECT datetime('now') as now").get();
    console.log('✅ Connecté à SQLite (better-sqlite3) | Heure DB:', row.now);
    return true;
  } catch (err) {
    console.error('❌ Erreur de connexion DB:', err);
    return false;
  }
}

/**
 * Initialise la base de données (synchrone avec better-sqlite3)
 */
function initDB() {
  console.log('📂 Base de données SQLite:', DB_PATH);
  createSchema();
}

module.exports = {
  db,
  checkConnection,
  initDB,
};
