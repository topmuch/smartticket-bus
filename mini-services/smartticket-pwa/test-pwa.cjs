#!/usr/bin/env node
// SmartTicket PWA — Complete Test Suite
const http = require('http');

const BACKEND = 'http://localhost:3001/api/v1';
const PWA = 'http://localhost:3002';

let PASS = 0, FAIL = 0;

function fetch(method, url, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, timeout: 8000 };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
    if (payload) r.write(payload);
    r.end();
  });
}

function t(label, ok) {
  TOTAL++;
  if (ok) { PASS++; console.log('  ✅ ' + label); }
  else { FAIL++; console.log('  ❌ ' + label); }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  🧪 SMARTTICKET PWA — TESTS COMPLETS (27 tests)  ║');
  console.log('╚══════════════════════════════════════════════════╝');

  // ===== 1. PWA WEB SERVER =====
  console.log('\n📋 1. PWA WEB SERVER');
  let r = await fetch('GET', PWA + '/');
  t('1.1 PWA index.html → 200', r.status === 200);
  t('1.2 HTML contient SmartTicket', typeof r.body === 'string' && r.body.includes('SmartTicket Bus'));

  // CSS bundle
  r = await fetch('GET', PWA + '/src/index.css');
  t('1.3 CSS accessible', r.status === 200 || r.status === 304);

  // ===== 2. AUTHENTIFICATION CONTROLLER =====
  console.log('\n📋 2. AUTHENTIFICATION CONTROLLER');

  r = await fetch('POST', `${BACKEND}/auth/login`, { email: 'control1@smartticket.bus', password: 'Control@123' });
  t('2.1 Login contrôleur → 200', r.status === 200 && r.body.success);
  const ctrlToken = r.body?.data?.tokens?.access_token;
  const ctrlUser = r.body?.data?.user;
  t('2.2 Token JWT reçu', !!ctrlToken && ctrlToken.length > 20);
  t('2.3 Rôle = CONTROLLER', ctrlUser?.role === 'CONTROLLER');
  t('2.4 userId présent', !!ctrlUser?.id);

  // Login admin for ticket creation
  const adminR = await fetch('POST', `${BACKEND}/auth/login`, { email: 'admin@smartticket.bus', password: 'Admin@123' });
  const adminToken = adminR.body?.data?.tokens?.access_token;

  // ===== 3. VENTE TICKET (préparation) =====
  console.log('\n📋 3. PRÉPARATION TICKET');

  await fetch('POST', `${BACKEND}/cash-sessions`, { opening_balance: 50000 }, adminToken);
  const sell = await fetch('POST', `${BACKEND}/sell`, {
    from_zone_id: 'z-01', to_zone_id: 'z-03',
    passenger_name: 'Aminata Diallo', payment_method: 'cash', amount_paid: 350
  }, adminToken);
  t('3.1 Vente ticket → 201', sell.status === 201);
  const qr = sell.body?.data?.qr_code;
  t('3.2 QR code JWT reçu', !!qr && qr.length > 30);

  // ===== 4. SCAN/VERIFY (endpoint principal PWA) =====
  console.log('\n📋 4. SCAN/VERIFY — SCÉNARIOS COMPLETS');

  // 4a. Ticket valide
  r = await fetch('POST', `${BACKEND}/scan/verify`, { qr_token: qr, location_lat: 14.6937, location_lng: -17.4441 }, ctrlToken);
  t('4.1 Scan ticket valide → 200', r.status === 200);
  t('4.2 valid = true', r.body.valid === true);
  t('4.3 message = TICKET VALIDE', (r.body.message || '').includes('VALIDE'));
  t('4.4 passenger_name = Aminata Diallo', r.body.details?.passenger_name === 'Aminata Diallo');
  t('4.5 zones format présent', !!r.body.details?.zones);
  t('4.6 type présent', !!r.body.details?.type);
  t('4.7 price présent', typeof r.body.details?.price === 'number');
  t('4.8 control_id (UUID) présent', !!r.body.details?.control_id);

  // 4b. Re-scan → ALREADY_USED
  r = await fetch('POST', `${BACKEND}/scan/verify`, { qr_token: qr }, ctrlToken);
  t('4.9 Re-scan → valid=false', r.body.valid === false);
  t('4.10 reason = already_used', r.body.reason === 'already_used');
  t('4.11 Info 1ère validation présente', !!r.body.details?.first_validated_at);

  // 4c. QR falsifié
  r = await fetch('POST', `${BACKEND}/scan/verify`, { qr_token: 'eyJhbGciOiJIUzI1NiJ9.fake.payload' }, ctrlToken);
  t('4.12 QR falsifié → valid=false', r.body.valid === false);
  t('4.13 reason = FALSIFIED', r.body.reason === 'falsified' || r.body.reason === 'FALSIFIED');

  // ===== 5. STATS ET DONNÉES HORS-LIGNE =====
  console.log('\n📋 5. STATS & DONNÉES HORS-LIGNE');

  r = await fetch('GET', `${BACKEND}/controls/stats`, null, ctrlToken);
  t('5.1 Stats contrôleur → 200', r.status === 200);
  t('5.2 Données stats présentes', !!r.body.data);

  r = await fetch('GET', `${BACKEND}/offline/data`, null, ctrlToken);
  t('5.3 Offline data → 200', r.status === 200);
  t('5.4 Contient blacklist/whitelist', !!r.body.data);

  // ===== 6. SYNC HORS-LIGNE =====
  console.log('\n📋 6. SYNCHRONISATION HORS-LIGNE');

  r = await fetch('POST', `${BACKEND}/controls/sync`, {
    controls: [
      { qr_data: 'offline-pwa-test-1', result: 'VALID', reason: 'PWA offline sync test' },
      { qr_data: 'offline-pwa-test-2', result: 'FALSIFIED', reason: 'PWA offline sync test' }
    ]
  }, ctrlToken);
  t('6.1 Sync batch → 200', r.status === 200);
  t('6.2 Contrôles synchronisés', r.body.success);

  // ===== 7. RBAC =====
  console.log('\n📋 7. RBAC');

  const opR = await fetch('POST', `${BACKEND}/auth/login`, { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  const opTk = opR.body?.data?.tokens?.access_token;
  r = await fetch('POST', `${BACKEND}/scan/verify`, { qr_token: qr }, opTk);
  t('7.1 Opérateur → scan 403', r.status === 403);

  // ===== RESULTS =====
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  RÉSULTATS TESTS PWA                             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ✅ Réussis: ${String(PASS).padEnd(3)} / ${String(PASS + FAIL).padEnd(3)}                                       ║`);
  if (FAIL > 0) console.log(`║  ❌ Échoués: ${String(FAIL).padEnd(3)}                                         ║`);
  if (FAIL === 0) console.log('║                                                     ║');
  console.log(`║  📈 ${Math.round(PASS / (PASS + FAIL) * 100)}% de réussite                                  ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  process.exit(FAIL > 0 ? 1 : 0);
}

let TOTAL = 0;
main().catch(e => { console.error(e); process.exit(1); });
