// ============================================
// SmartTicket Bus - Seed Data (sql.js compatible)
// Données de test: Réseau de bus de Dakar
// ============================================
const bcrypt = require('bcryptjs');
const { initDB, saveDB, _getDB } = require('./src/config/db');

const seed = async () => {
  console.log('🌱 Seeding SmartTicket Bus database...\n');

  try {
    await initDB();
    const db = _getDB();

    // Helper: run single SQL with params
    function run(sql, params) {
      db.run(sql, params);
    }

    // ============================================
    // 1. UTILISATEURS
    // ============================================
    console.log('📦 Creating users...');
    const users = [
      { id: 'u-admin-001', email: 'admin@smartticket.bus', name: 'Administrateur Système', role: 'SUPERADMIN', password: 'Admin@123' },
      { id: 'u-op-001', email: 'guichet1@smartticket.bus', name: 'Fatou Diallo', role: 'OPERATOR', password: 'Oper@123' },
      { id: 'u-op-002', email: 'guichet2@smartticket.bus', name: 'Moussa Ndiaye', role: 'OPERATOR', password: 'Oper@123' },
      { id: 'u-ctrl-001', email: 'control1@smartticket.bus', name: 'Cheikh Sy', role: 'CONTROLLER', password: 'Control@123' },
      { id: 'u-ctrl-002', email: 'control2@smartticket.bus', name: 'Aminata Fall', role: 'CONTROLLER', password: 'Control@123' },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      run(`INSERT OR REPLACE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.email, hash, u.name, u.role]);
      console.log(`  ✅ ${u.email} (${u.role})`);
    }

    // ============================================
    // 2. ZONES
    // ============================================
    console.log('\n📦 Creating zones...');
    const zones = [
      ['z-01', '01', 'Cap Manuel - Dakar-Plateau', 'Centre-ville historique', '#dc2626'],
      ['z-02', '02', 'Médina - Grand Yoff', 'Zone commerciale dense', '#ea580c'],
      ['z-03', '03', 'Liberté - Point E', 'Zone résidentielle ouest', '#16a34a'],
      ['z-04', '04', 'Fann - Hôpital', 'Zone hospitalière et universitaire', '#2563eb'],
      ['z-05', '05', 'Omar Dia - Cambérène', 'Périphérie nord', '#9333ea'],
    ];
    for (const z of zones) {
      run(`INSERT OR REPLACE INTO zones (id, code, name, description, color) VALUES (?, ?, ?, ?, ?)`, z);
      console.log(`  ✅ Zone ${z[1]}: ${z[2]}`);
    }

    // ============================================
    // 3. TARIFS
    // ============================================
    console.log('\n📦 Creating tariffs...');
    const tariffs = [
      ['z-01', 'z-02', 250], ['z-01', 'z-03', 350], ['z-01', 'z-04', 300], ['z-01', 'z-05', 500],
      ['z-02', 'z-01', 250], ['z-02', 'z-03', 300], ['z-02', 'z-04', 200], ['z-02', 'z-05', 450],
      ['z-03', 'z-01', 350], ['z-03', 'z-02', 300], ['z-03', 'z-04', 150], ['z-03', 'z-05', 400],
      ['z-04', 'z-01', 300], ['z-04', 'z-02', 200], ['z-04', 'z-03', 150], ['z-04', 'z-05', 350],
      ['z-05', 'z-01', 500], ['z-05', 'z-02', 450], ['z-05', 'z-03', 400], ['z-05', 'z-04', 350],
    ];
    for (const t of tariffs) {
      run(`INSERT OR REPLACE INTO tariffs (id, from_zone_id, to_zone_id, price, ticket_type) VALUES (?, ?, ?, ?, ?)`,
        [`t-${t[0]}-${t[1]}`, t[0], t[1], t[2], 'single']);
    }
    console.log(`  ✅ ${tariffs.length} tarifs créés (en FCFA)`);

    // ============================================
    // 4. ARRÊTS
    // ============================================
    console.log('\n📦 Creating stops...');
    const stops = [
      ['st-001', 'Gare Routière de Dakar', 'GRD', 'z-01', 14.6937, -17.4441],
      ['st-002', 'Place de l\'Indépendance', 'PDI', 'z-01', 14.6928, -17.4467],
      ['st-003', 'Marché Sandaga', 'MSA', 'z-02', 14.6905, -17.4398],
      ['st-004', 'Gare Médina', 'GME', 'z-02', 14.6807, -17.4428],
      ['st-005', 'Grand Yoff', 'GYO', 'z-02', 14.7353, -17.4692],
      ['st-006', 'Terminus Liberté', 'TLB', 'z-03', 14.6876, -17.4688],
      ['st-007', 'Point E', 'PTE', 'z-03', 14.6824, -17.4784],
      ['st-008', 'Foire', 'FOI', 'z-03', 14.6970, -17.4740],
      ['st-009', 'Hôpital Principal', 'HPR', 'z-04', 14.6804, -17.4539],
      ['st-010', 'Université Cheikh Anta Diop', 'UCD', 'z-04', 14.6751, -17.4542],
      ['st-011', 'Fann Résidence', 'FRE', 'z-04', 14.6703, -17.4625],
      ['st-012', 'Castors', 'CAS', 'z-05', 14.7410, -17.4790],
      ['st-013', 'Omar Dia', 'OMD', 'z-05', 14.7450, -17.4850],
      ['st-014', 'Marché Kermel', 'MKE', 'z-01', 14.6930, -17.4400],
      ['st-015', 'Cambérène', 'CAM', 'z-05', 14.7500, -17.4900],
    ];
    for (const s of stops) {
      run(`INSERT OR REPLACE INTO stops (id, name, code, zone_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`, s);
      console.log(`  ✅ ${s[2]}: ${s[1]}`);
    }

    // ============================================
    // 5. LIGNES
    // ============================================
    console.log('\n📦 Creating lines...');
    const lines = [
      ['l-01', 'L1', 'Ligne Centrale', '#dc2626'],
      ['l-02', 'L2', 'Express Est-Ouest', '#ea580c'],
      ['l-03', 'L3', 'Ligne Plateau-Cambérène', '#16a34a'],
      ['l-04', 'L4', 'Navette Universitaire', '#2563eb'],
      ['l-05', 'L5', 'Dakar Coast Express', '#9333ea'],
      ['l-06', 'L6', 'Grand Yoff - Fann', '#ca8a04'],
    ];
    for (const l of lines) {
      run(`INSERT OR REPLACE INTO lines (id, number, name, color) VALUES (?, ?, ?, ?)`, l);
      console.log(`  ✅ ${l[1]}: ${l[2]}`);
    }

    // ============================================
    // 6. TRONÇONS
    // ============================================
    console.log('\n📦 Creating line-stops...');
    const lineStops = [
      ['l-01', 'st-001', 'st-003', 1, 'forward', 10],
      ['l-01', 'st-003', 'st-004', 2, 'forward', 8],
      ['l-01', 'st-004', 'st-006', 3, 'forward', 12],
      ['l-01', 'st-006', 'st-009', 4, 'forward', 15],
      ['l-02', 'st-007', 'st-002', 1, 'forward', 12],
      ['l-02', 'st-002', 'st-001', 2, 'forward', 5],
      ['l-02', 'st-001', 'st-008', 3, 'forward', 8],
      ['l-02', 'st-008', 'st-005', 4, 'forward', 15],
      ['l-03', 'st-002', 'st-009', 1, 'forward', 15],
      ['l-03', 'st-009', 'st-011', 2, 'forward', 8],
      ['l-03', 'st-011', 'st-013', 3, 'forward', 15],
      ['l-03', 'st-013', 'st-015', 4, 'forward', 10],
      ['l-04', 'st-009', 'st-010', 1, 'forward', 5],
      ['l-04', 'st-010', 'st-011', 2, 'forward', 7],
      ['l-05', 'st-001', 'st-014', 1, 'forward', 3],
      ['l-05', 'st-014', 'st-007', 2, 'forward', 10],
      ['l-05', 'st-007', 'st-006', 3, 'forward', 8],
      ['l-06', 'st-005', 'st-008', 1, 'forward', 10],
      ['l-06', 'st-008', 'st-009', 2, 'forward', 12],
    ];
    for (const ls of lineStops) {
      run(`INSERT OR REPLACE INTO line_stops (id, line_id, from_stop_id, to_stop_id, stop_order, direction, duration) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`ls-${ls[0]}-${ls[1]}-${ls[2]}`, ...ls]);
    }
    console.log(`  ✅ ${lineStops.length} tronçons créés`);

    // ============================================
    // 7. HORAIRES
    // ============================================
    console.log('\n📦 Creating schedules...');
    const schedules = [
      ['l-01', 1, '06:00', '22:00', 15], ['l-01', 2, '06:00', '22:00', 15],
      ['l-01', 3, '06:00', '22:00', 15], ['l-01', 4, '06:00', '22:00', 15],
      ['l-01', 5, '06:00', '22:00', 15], ['l-01', 6, '07:00', '21:00', 20],
      ['l-01', 0, '08:00', '20:00', 30],
      ['l-02', 1, '05:30', '23:00', 10], ['l-02', 2, '05:30', '23:00', 10],
      ['l-02', 3, '05:30', '23:00', 10], ['l-02', 4, '05:30', '23:00', 10],
      ['l-02', 5, '05:30', '23:00', 10], ['l-02', 6, '06:00', '22:00', 15],
      ['l-02', 0, '07:00', '21:00', 20],
      ['l-03', 1, '06:00', '22:00', 20], ['l-03', 2, '06:00', '22:00', 20],
      ['l-03', 3, '06:00', '22:00', 20], ['l-03', 4, '06:00', '22:00', 20],
      ['l-03', 5, '06:00', '22:00', 20],
      ['l-04', 1, '07:00', '19:00', 10], ['l-04', 2, '07:00', '19:00', 10],
      ['l-04', 3, '07:00', '19:00', 10], ['l-04', 4, '07:00', '19:00', 10],
      ['l-04', 5, '07:00', '19:00', 10],
      ['l-05', 1, '06:30', '21:30', 12], ['l-05', 2, '06:30', '21:30', 12],
      ['l-05', 3, '06:30', '21:30', 12], ['l-05', 4, '06:30', '21:30', 12],
      ['l-05', 5, '06:30', '21:30', 12], ['l-05', 6, '07:00', '21:00', 15],
      ['l-06', 1, '06:00', '21:00', 15], ['l-06', 2, '06:00', '21:00', 15],
      ['l-06', 3, '06:00', '21:00', 15], ['l-06', 4, '06:00', '21:00', 15],
      ['l-06', 5, '06:00', '21:00', 15],
    ];
    for (const s of schedules) {
      run(`INSERT OR REPLACE INTO schedules (id, line_id, day_of_week, start_time, end_time, frequency) VALUES (?, ?, ?, ?, ?, ?)`,
        [`sch-${s[0]}-${s[1]}-${s[2].replace(':', '')}`, ...s]);
    }
    console.log(`  ✅ ${schedules.length} horaires créés`);

    // Sauvegarder sur disque
    saveDB();

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  🚌 SmartTicket Bus - Seed Complete!     ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Users:     ${String(users.length).padEnd(32)}║`);
    console.log(`║  Zones:     ${String(zones.length).padEnd(32)}║`);
    console.log(`║  Tariffs:   ${String(tariffs.length).padEnd(32)}║`);
    console.log(`║  Stops:     ${String(stops.length).padEnd(32)}║`);
    console.log(`║  Lines:     ${String(lines.length).padEnd(32)}║`);
    console.log(`║  Schedules: ${String(schedules.length).padEnd(32)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  Credentials:                             ║');
    console.log('║  admin@smartticket.bus / Admin@123       ║');
    console.log('║  guichet1@smartticket.bus / Oper@123     ║');
    console.log('║  control1@smartticket.bus / Control@123  ║');
    console.log('╚══════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
