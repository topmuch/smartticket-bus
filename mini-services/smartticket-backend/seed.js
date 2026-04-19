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

    // ============================================
    // 8. GARES (Digital Signage)
    // ============================================
    console.log('\n📦 Creating stations...');
    const stations = [
      ['stn-001', 'Gare Routière Peters', 'Dakar', 'Africa/Dakar', 'gare-peters'],
      ['stn-002', 'Gare de Liberté', 'Dakar', 'Africa/Dakar', 'gare-liberte'],
      ['stn-003', 'Gare Sandaga', 'Dakar', 'Africa/Dakar', 'gare-sandaga'],
    ];
    for (const s of stations) {
      run(`INSERT OR REPLACE INTO stations (id, name, city, timezone, slug) VALUES (?, ?, ?, ?, ?)`, s);
      console.log(`  ✅ ${s[1]}`);
    }

    // ============================================
    // 9. DÉPARTS (Digital Signage)
    // ============================================
    console.log('\n📦 Creating departures...');
    const departures = [
      // Gare Peters - Départs
      ['stn-001', 'l-01', '06:15', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '06:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '06:45', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '07:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '07:20', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '07:40', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '08:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '08:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '09:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '09:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '10:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '10:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '11:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '11:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '12:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '12:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '13:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '13:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '14:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '14:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '15:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '15:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '16:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '16:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '17:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '17:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '18:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '18:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '19:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '19:30', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '20:00', 'Quai 1', 'departure', 1, 'Médina - Grand Yoff'],
      ['stn-001', 'l-02', '06:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '06:20', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '06:40', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '07:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '07:30', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '08:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '08:30', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '09:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '09:30', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '10:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '10:30', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '11:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '12:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '13:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '14:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '15:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '16:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '17:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '18:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '19:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-02', '20:00', 'Quai 2', 'departure', 1, 'Point E - Foire'],
      ['stn-001', 'l-03', '06:30', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '07:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '07:30', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '08:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '09:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '10:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '11:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '12:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '13:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '14:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '15:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '16:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '17:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '18:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '19:00', 'Quai 3', 'departure', 1, 'Fann - Cambérène'],
      ['stn-001', 'l-05', '07:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '08:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '09:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '10:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '11:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '12:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '13:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '14:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '15:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '16:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '17:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '18:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '19:00', 'Quai 4', 'departure', 1, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-06', '06:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '07:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '08:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '09:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '10:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '11:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '12:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '13:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '14:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '15:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '16:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '17:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '18:30', 'Quai 5', 'departure', 1, 'Grand Yoff - Fann'],
      ['stn-001', 'l-04', '07:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '08:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '09:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '10:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '11:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '12:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '13:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '14:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '15:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '16:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '17:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      ['stn-001', 'l-04', '18:00', 'Quai 6', 'departure', 1, 'Hôpital - Université'],
      // Some arrivals
      ['stn-001', 'l-01', '06:00', 'Quai 1', 'arrival', 1, 'Gare Routière (arrivée)'],
      ['stn-001', 'l-01', '06:50', 'Quai 1', 'arrival', 1, 'Gare Routière (arrivée)'],
      ['stn-001', 'l-01', '07:40', 'Quai 1', 'arrival', 1, 'Gare Routière (arrivée)'],
      ['stn-001', 'l-02', '06:10', 'Quai 2', 'arrival', 1, 'Gare Routière (arrivée)'],
      ['stn-001', 'l-02', '07:10', 'Quai 2', 'arrival', 1, 'Gare Routière (arrivée)'],
      // Same for day 2 (Tuesday)
      ['stn-001', 'l-01', '06:15', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '06:45', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '07:15', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '08:00', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '09:00', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '10:00', 'Quai 1', 'departure', 2, 'Médina - Grand Yoff'],
      ['stn-001', 'l-02', '06:00', 'Quai 2', 'departure', 2, 'Point E - Foire'],
      ['stn-001', 'l-02', '07:00', 'Quai 2', 'departure', 2, 'Point E - Foire'],
      ['stn-001', 'l-02', '08:00', 'Quai 2', 'departure', 2, 'Point E - Foire'],
      ['stn-001', 'l-02', '09:00', 'Quai 2', 'departure', 2, 'Point E - Foire'],
      ['stn-001', 'l-03', '07:00', 'Quai 3', 'departure', 2, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '09:00', 'Quai 3', 'departure', 2, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '11:00', 'Quai 3', 'departure', 2, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '13:00', 'Quai 3', 'departure', 2, 'Fann - Cambérène'],
      ['stn-001', 'l-05', '08:00', 'Quai 4', 'departure', 2, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '10:00', 'Quai 4', 'departure', 2, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '12:00', 'Quai 4', 'departure', 2, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '14:00', 'Quai 4', 'departure', 2, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-06', '07:30', 'Quai 5', 'departure', 2, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '09:30', 'Quai 5', 'departure', 2, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '11:30', 'Quai 5', 'departure', 2, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '13:30', 'Quai 5', 'departure', 2, 'Grand Yoff - Fann'],
      ['stn-001', 'l-04', '08:00', 'Quai 6', 'departure', 2, 'Hôpital - Université'],
      ['stn-001', 'l-04', '10:00', 'Quai 6', 'departure', 2, 'Hôpital - Université'],
      ['stn-001', 'l-04', '12:00', 'Quai 6', 'departure', 2, 'Hôpital - Université'],
      // Gare Liberté
      ['stn-002', 'l-02', '06:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '07:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '08:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '09:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '10:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '11:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '12:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '13:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '14:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '15:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '16:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '17:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '18:30', 'Quai 1', 'departure', 1, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-03', '07:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '09:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '11:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '13:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '15:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '17:00', 'Quai 2', 'departure', 1, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-06', '06:30', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '08:00', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '09:30', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '11:00', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '12:30', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '14:00', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '15:30', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '17:00', 'Quai 3', 'departure', 1, 'Fann - Grand Yoff'],
      // Gare Sandaga
      ['stn-003', 'l-01', '06:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '07:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '08:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '09:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '10:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '11:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '12:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '13:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '14:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '15:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '16:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '17:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '18:30', 'Quai 1', 'departure', 1, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-05', '07:00', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '08:30', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '10:00', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '11:30', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '13:00', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '14:30', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '16:00', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      ['stn-003', 'l-05', '17:30', 'Quai 2', 'departure', 1, 'Liberté - Point E'],
      // === SUNDAY departures (day_of_week=0) for demo ===
      // Gare Peters - Sunday
      ['stn-001', 'l-01', '07:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '08:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '09:30', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '11:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '13:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '15:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '17:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-01', '19:00', 'Quai 1', 'departure', 0, 'Médina - Grand Yoff'],
      ['stn-001', 'l-02', '07:30', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-02', '09:00', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-02', '11:00', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-02', '14:00', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-02', '16:00', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-02', '18:00', 'Quai 2', 'departure', 0, 'Point E - Foire'],
      ['stn-001', 'l-03', '08:00', 'Quai 3', 'departure', 0, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '10:00', 'Quai 3', 'departure', 0, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '13:00', 'Quai 3', 'departure', 0, 'Fann - Cambérène'],
      ['stn-001', 'l-03', '16:00', 'Quai 3', 'departure', 0, 'Fann - Cambérène'],
      ['stn-001', 'l-05', '09:00', 'Quai 4', 'departure', 0, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '12:00', 'Quai 4', 'departure', 0, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-05', '15:00', 'Quai 4', 'departure', 0, 'Marché Kermel - Liberté'],
      ['stn-001', 'l-06', '08:00', 'Quai 5', 'departure', 0, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '11:00', 'Quai 5', 'departure', 0, 'Grand Yoff - Fann'],
      ['stn-001', 'l-06', '14:00', 'Quai 5', 'departure', 0, 'Grand Yoff - Fann'],
      ['stn-001', 'l-04', '09:00', 'Quai 6', 'departure', 0, 'Hôpital - Université'],
      ['stn-001', 'l-04', '12:00', 'Quai 6', 'departure', 0, 'Hôpital - Université'],
      ['stn-001', 'l-04', '15:00', 'Quai 6', 'departure', 0, 'Hôpital - Université'],
      // Gare Liberté - Sunday
      ['stn-002', 'l-02', '08:00', 'Quai 1', 'departure', 0, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '10:00', 'Quai 1', 'departure', 0, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '13:00', 'Quai 1', 'departure', 0, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-02', '16:00', 'Quai 1', 'departure', 0, 'Place Indépendance - Gare Peters'],
      ['stn-002', 'l-03', '09:00', 'Quai 2', 'departure', 0, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-03', '14:00', 'Quai 2', 'departure', 0, 'Plateau - Fann Résidence'],
      ['stn-002', 'l-06', '09:00', 'Quai 3', 'departure', 0, 'Fann - Grand Yoff'],
      ['stn-002', 'l-06', '15:00', 'Quai 3', 'departure', 0, 'Fann - Grand Yoff'],
      // Gare Sandaga - Sunday
      ['stn-003', 'l-01', '08:00', 'Quai 1', 'departure', 0, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '11:00', 'Quai 1', 'departure', 0, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-01', '15:00', 'Quai 1', 'departure', 0, 'Gare Peters - Grand Yoff'],
      ['stn-003', 'l-05', '09:00', 'Quai 2', 'departure', 0, 'Liberté - Point E'],
      ['stn-003', 'l-05', '13:00', 'Quai 2', 'departure', 0, 'Liberté - Point E'],
    ];
    for (const d of departures) {
      const dId = `dep-${d[0]}-${d[2]}-${d[4]}-${d[5]}`;
      run(`INSERT OR REPLACE INTO departures (id, station_id, line_id, scheduled_time, platform, schedule_type, day_of_week, destination) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [dId, d[0], d[1], d[2], d[3], d[4], d[5], d[6]]);
    }
    console.log(`  ✅ ${departures.length} départs créés`);

    // ============================================
    // 10. MESSAGES D'AFFICHAGE
    // ============================================
    console.log('\n📦 Creating display messages...');
    const messages = [
      ['stn-001', '⚠️ RETARDS DE 15 MIN SUR LA LIGNE L1 CAUSE TRAVAUX À LA SORTIE DE LA VILLE — MERCI DE VOTRE COMPRÉHENSION', 'urgent'],
      ['stn-001', '🚌 Nouveau service L5 disponible dès le 20 avril. Consultez nos guichets pour plus d\'informations.', 'normal'],
      ['null', ' Bienvenue à bord des lignes SmartTicket Bus. Billets disponibles aux guichets et sur notre application.', 'info'],
      ['stn-002', 'ℹ️ Le quai 2 sera fermé pour rénovation du 25 au 28 avril. Les départs L3 sont reportés au quai 3.', 'urgent'],
    ];
    for (const m of messages) {
      run(`INSERT OR REPLACE INTO display_messages (id, station_id, message, priority, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [`msg-${require('uuid').v4()}`, m[0] === 'null' ? null : m[0], m[1], m[2], null, null]);
    }
    console.log(`  ✅ ${messages.length} messages créés`);

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
