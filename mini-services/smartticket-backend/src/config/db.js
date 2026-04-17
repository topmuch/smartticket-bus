// ============================================
// SmartTicket Bus - Configuration Base de données
// SQLite via sql.js (WebAssembly, pas de compilation native)
// ============================================
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './data/smartticket.db');
const DB_DIR = path.dirname(DB_PATH);

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

/**
 * Convertit les résultats sql.js en objets simples (comme better-sqlite3)
 */
function rowsFromResult(result) {
  const rows = [];
  if (result && result.values) {
    for (const row of result.values) {
      const obj = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      rows.push(obj);
    }
  }
  return rows;
}

/**
 * Crée le schéma de la base de données
 */
function createSchema() {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
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

  db.run(`CREATE TABLE IF NOT EXISTS zones (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#3b82f6',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tariffs (
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

  db.run(`CREATE TABLE IF NOT EXISTS lines (
    id          TEXT PRIMARY KEY,
    number      TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    color       TEXT DEFAULT '#16a34a',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stops (
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

  db.run(`CREATE TABLE IF NOT EXISTS line_stops (
    id          TEXT PRIMARY KEY,
    line_id     TEXT NOT NULL REFERENCES lines(id),
    from_stop_id TEXT NOT NULL,
    to_stop_id   TEXT NOT NULL,
    stop_order  INTEGER NOT NULL,
    direction   TEXT NOT NULL DEFAULT 'forward',
    duration    INTEGER,
    UNIQUE(line_id, from_stop_id, to_stop_id, direction)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id          TEXT PRIMARY KEY,
    line_id     TEXT NOT NULL REFERENCES lines(id),
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    frequency   INTEGER NOT NULL DEFAULT 15,
    is_active   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(line_id, day_of_week, start_time)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tickets (
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

  db.run(`CREATE TABLE IF NOT EXISTS controls (
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

  db.run(`CREATE TABLE IF NOT EXISTS cash_sessions (
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

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
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

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    details    TEXT,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  ];

  for (const idx of indexes) {
    db.run(idx);
  }

  console.log('✅ Schéma de la base de données créé avec succès');
}

/**
 * Wrapper qui expose une API compatible better-sqlite3
 * pour le reste du code (prepare().get(), prepare().all(), prepare().run())
 */
class DBWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  /**
   * Exécute une requête SQL et retourne la première ligne
   * .get(sql, ...params) → { row } | undefined
   */
  getRows() {
    return new Proxy(this, {
      get(target, prop) {
        if (prop === 'get') {
          // Disponible pour compatibilité mais pas utilisé directement
          return undefined;
        }
        return target[prop];
      }
    });
  }

  exec(sql) {
    this._db.exec(sql);
  }

  run(sql, ...params) {
    try {
      if (params.length > 0) {
        this._db.run(sql, params);
      } else {
        this._db.run(sql);
      }
    } catch (err) {
      console.error('SQL Error:', sql, params, err.message);
      throw err;
    }
  }
}

/**
 * "prepare" retourne un objet avec .get(), .all(), .run()
 * Compatible avec l'API better-sqlite3 utilisée dans les contrôleurs
 */
function createPrepare(dbSql) {
  return function prepare(sql) {
    return {
      get(...params) {
        try {
          const stmt = dbSql.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (err) {
          console.error('Prepare.get Error:', sql, params, err.message);
          throw err;
        }
      },
      all(...params) {
        try {
          const stmt = dbSql.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          console.error('Prepare.all Error:', sql, params, err.message);
          throw err;
        }
      },
      run(...params) {
        try {
          const stmt = dbSql.prepare(sql);
          stmt.bind(params);
          stmt.step();
          stmt.free();
        } catch (err) {
          console.error('Prepare.run Error:', sql, params, err.message);
          throw err;
        }
      }
    };
  };
}

/**
 * Vérifie la connexion
 */
function checkConnection() {
  try {
    const result = db.exec("SELECT datetime('now') as now");
    const now = result[0].values[0][0];
    console.log('✅ Connecté à SQLite (sql.js) | Heure DB:', now);
    return true;
  } catch (err) {
    console.error('❌ Erreur de connexion DB:', err);
    return false;
  }
}

/**
 * Sauvegarder la base en fichier
 */
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Initialise la connexion (ASYNC car sql.js charge le WASM)
 */
async function initDB() {
  const SQL = await initSqlJs();

  // Charger la DB existante ou en créer une nouvelle
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Base de données chargée depuis:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Nouvelle base de données créée');
  }

  createSchema();
  saveDB();

  return db;
}

module.exports = {
  db: new Proxy({}, {
    get(target, prop) {
      // Intercepte les appels db.prepare(), db.exec(), db.run()
      if (prop === 'prepare') {
        return createPrepare(db);
      }
      if (prop === 'exec') {
        return db ? db.exec.bind(db) : () => {};
      }
      if (prop === 'run') {
        return db ? db.run.bind(db) : () => {};
      }
      return undefined;
    }
  }),
  checkConnection,
  saveDB,
  initDB,
  _getDB: () => db // Accès direct pour le seed
};
