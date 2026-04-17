// SmartTicket Bus - Complete API Test Script
const BASE = 'http://localhost:3000';

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => null);
    const elapsed = Date.now() - start;
    return { status: res.status, ok: res.ok, data, elapsed, path };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { status: 0, ok: false, data: null, error: err.message, elapsed, path };
  }
}

let pass = 0, fail = 0;
const results = [];

function log(testId, desc, result, expectStatus = null) {
  const expectedOk = expectStatus ? result.status === expectStatus : result.ok;
  const status = expectedOk ? '✅' : '❌';
  if (expectedOk) pass++; else fail++;
  const detail = result.data
    ? (result.data.success !== undefined ? `success=${result.data.success}` : '')
    : (result.error || '');
  const expectNote = expectStatus ? ` (expect ${expectStatus})` : '';
  const msg = `${status} [${testId}] ${desc} => HTTP ${result.status}${expectNote} (${result.elapsed}ms) ${detail}`;
  console.log(msg);
  results.push({ testId, desc, status: result.status, ok: expectedOk, elapsed: result.elapsed });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SMARTTICKET BUS - TESTS COMPLETS');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // ==================== AUTH ====================
  console.log('\n=== AUTHENTIFICATION ===');

  let r;
  let adminToken, opToken, ctrlToken;

  r = await request('POST', '/api/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  log('A1', 'Login SUPERADMIN', r);
  adminToken = r.data?.data?.accessToken || '';

  r = await request('POST', '/api/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  log('A2', 'Login OPERATOR', r);
  opToken = r.data?.data?.accessToken || '';

  r = await request('POST', '/api/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  log('A3', 'Login CONTROLLER', r);
  ctrlToken = r.data?.data?.accessToken || '';

  r = await request('POST', '/api/auth/login', { email: 'admin@smartticket.bus', password: 'WRONG' });
  log('A4', 'Login wrong password (expect 401)', r, 401);

  r = await request('GET', '/api/auth/me', null, adminToken);
  log('A5', 'GET /me with admin token', r);

  r = await request('GET', '/api/auth/me');
  log('A6', 'GET /me no token (expect 401)', r, 401);

  r = await request('POST', '/api/auth/change-password', { currentPassword: 'Admin@123', newPassword: 'Admin@123' }, adminToken);
  log('A7', 'Change password (same pw)', r);

  // ==================== ZONES ====================
  console.log('\n=== ZONES ===');

  r = await request('GET', '/api/zones');
  log('Z1', 'GET all zones', r);

  r = await request('GET', '/api/zones', null, adminToken);
  log('Z2', 'GET zones (auth)', r);

  const zones = r.data?.data || [];
  if (zones.length > 0) {
    r = await request('GET', `/api/zones/${zones[0].id}`, null, adminToken);
    log('Z3', 'GET zone by ID', r);

    r = await request('POST', '/api/zones', { code: 'T99', name: 'Zone Test', color: '#ff0000' }, adminToken);
    log('Z4', 'POST create zone', r);

    if (r.data?.data?.id) {
      const newZoneId = r.data.data.id;
      r = await request('PUT', `/api/zones/${newZoneId}`, { name: 'Zone Test Updated' }, adminToken);
      log('Z5', 'PUT update zone', r);

      r = await request('DELETE', `/api/zones/${newZoneId}`, null, adminToken);
      log('Z6', 'DELETE zone', r);
    }
  }

  // ==================== FARES ====================
  console.log('\n=== TARIFS ===');

  r = await request('GET', '/api/fares', null, adminToken);
  log('F1', 'GET all fares', r);

  const fares = r.data?.data || [];
  if (fares.length > 0) {
    r = await request('GET', `/api/fares/${fares[0].id}`, null, adminToken);
    log('F2', 'GET fare by ID', r);
  }

  r = await request('POST', '/api/pricing/calculate', { fromZoneId: zones[0]?.id, toZoneId: zones[1]?.id }, adminToken);
  log('F3', 'POST pricing calculate', r);

  // ==================== LINES ====================
  console.log('\n=== LIGNES ===');

  r = await request('GET', '/api/lines');
  log('L1', 'GET all lines (public)', r);

  const lines = r.data?.data || [];
  if (lines.length > 0) {
    r = await request('GET', `/api/lines/${lines[0].id}`, null, adminToken);
    log('L2', 'GET line by ID', r);
  }

  r = await request('POST', '/api/lines', { number: `TEST${Date.now()}`, name: 'Test Line', color: '#ff0000' }, adminToken);
  log('L3', 'POST create line', r);

  if (r.data?.data?.id) {
    const newLineId = r.data.data.id;
    r = await request('PUT', `/api/lines/${newLineId}`, { name: 'Test Line Updated' }, adminToken);
    log('L4', 'PUT update line', r);

    r = await request('DELETE', `/api/lines/${newLineId}`, null, adminToken);
    log('L5', 'DELETE line', r);
  }

  // ==================== STOPS ====================
  console.log('\n=== ARRETS ===');

  r = await request('GET', '/api/stops');
  log('S1', 'GET all stops (public)', r);

  const stops = r.data?.data || [];
  if (stops.length > 0) {
    r = await request('GET', `/api/stops/${stops[0].id}`, null, adminToken);
    log('S2', 'GET stop by ID', r);
  }

  // ==================== SCHEDULES ====================
  console.log('\n=== HORAIRES ===');

  r = await request('GET', '/api/schedules');
  log('H1', 'GET all schedules (public)', r);

  // ==================== USERS ====================
  console.log('\n=== UTILISATEURS ===');

  r = await request('GET', '/api/users', null, adminToken);
  log('U1', 'GET users (admin)', r);

  r = await request('GET', '/api/users', null, opToken);
  log('U2', 'GET users (operator - expect 403)', r, 403);

  r = await request('GET', '/api/users', null, ctrlToken);
  log('U3', 'GET users (controller - expect 403)', r, 403);

  const users = r.data?.data || [];
  const allUsersResp = await request('GET', '/api/users', null, adminToken);
  const allUsers = allUsersResp.data?.data || [];
  if (allUsers.length > 0) {
    r = await request('GET', `/api/users/${allUsers[0].id}`, null, adminToken);
    log('U4', 'GET user by ID', r);
  }

  // ==================== CASH SESSIONS ====================
  console.log('\n=== SESSIONS DE CAISSE ===');

  r = await request('GET', '/api/cash-sessions', null, adminToken);
  log('C1', 'GET cash sessions', r);

  r = await request('GET', '/api/cash-sessions?status=OPEN', null, adminToken);
  log('C2', 'GET open cash sessions', r);

  // First close any existing open sessions for this operator
  const opMeResp = await request('GET', '/api/auth/me', null, opToken);
  const operatorId = opMeResp.data?.data?.id;
  const openSessions = await request('GET', '/api/cash-sessions?status=OPEN', null, adminToken);
  const operatorOpenSessions = (openSessions.data?.data || []).filter(s => s.operatorId === operatorId);
  for (const s of operatorOpenSessions) {
    await request('PUT', `/api/cash-sessions/${s.id}`, { actualCash: s.openingBalance, notes: 'Auto-close before test' }, opToken);
  }

  r = await request('POST', '/api/cash-sessions', { openingBalance: 50000 }, opToken);
  log('C3', 'POST open cash session', r);

  let openSessionId = r.data?.data?.id;

  if (openSessionId) {
    r = await request('PUT', `/api/cash-sessions/${openSessionId}`, {
      actualCash: 75000,
      notes: 'Fermeture test'
    }, opToken);
    log('C4', 'PUT close cash session', r);
  }

  // ==================== TICKETS ====================
  console.log('\n=== TICKETS ===');

  // Open a new session for ticket test
  r = await request('POST', '/api/cash-sessions', { openingBalance: 50000 }, opToken);
  openSessionId = r.data?.data?.id;

  r = await request('GET', '/api/tickets', null, adminToken);
  log('T1', 'GET tickets (admin)', r);

  r = await request('GET', '/api/tickets', null, opToken);
  log('T2', 'GET tickets (operator)', r);

  r = await request('GET', '/api/tickets', null, ctrlToken);
  log('T3', 'GET tickets (controller - expect 403)', r, 403);

  // Sell a ticket
  r = await request('POST', '/api/tickets', {
    type: 'UNIT',
    passengerName: 'Test Passenger',
    passengerPhone: '+221 77 000 00 00',
    fromZoneId: zones[0]?.id,
    toZoneId: zones[1]?.id,
    fromStopId: stops[0]?.id,
    toStopId: stops[1]?.id,
    lineId: lines[0]?.id,
    price: 250,
    amountPaid: 500,
    changeGiven: 250,
    paymentMethod: 'cash',
    cashSessionId: openSessionId,
  }, opToken);
  log('T4', 'POST sell ticket', r);

  let ticketQrToken = r.data?.data?.qrToken;
  let ticketId = r.data?.data?.id;

  if (ticketId) {
    r = await request('GET', `/api/tickets/${ticketId}`, null, adminToken);
    log('T5', 'GET ticket by ID', r);
  }

  // ==================== TICKET VALIDATION ====================
  console.log('\n=== VALIDATION DE TICKETS ===');

  if (ticketQrToken) {
    r = await request('POST', '/api/tickets/validate', { qrString: ticketQrToken }, ctrlToken);
    log('V1', 'POST validate valid ticket', r);
    if (r.data?.valid) {
      // Re-validate (should be ALREADY_USED)
      r = await request('POST', '/api/tickets/validate', { qrString: ticketQrToken }, ctrlToken);
      log('V2', 'POST validate already used ticket', r);
    }
  }

  // Validate with fake QR
  r = await request('POST', '/api/tickets/validate', { qrString: 'FAKE_QR_TOKEN_DATA' }, ctrlToken);
  log('V3', 'POST validate fake ticket (expect FALSIFIED)', r);

  // ==================== CONTROLS ====================
  console.log('\n=== CONTROLES ===');

  r = await request('GET', '/api/controls', null, adminToken);
  log('CT1', 'GET controls (admin)', r);

  r = await request('GET', '/api/controls', null, ctrlToken);
  log('CT2', 'GET controls (controller)', r);

  r = await request('GET', '/api/controls/stats', null, ctrlToken);
  log('CT3', 'GET control stats', r);

  // ==================== REPORTS ====================
  console.log('\n=== RAPPORTS ===');

  r = await request('GET', '/api/reports/dashboard', null, adminToken);
  log('R1', 'GET dashboard report', r);

  r = await request('GET', '/api/reports/revenue', null, adminToken);
  log('R2', 'GET revenue report', r);

  r = await request('GET', '/api/reports/controls', null, adminToken);
  log('R3', 'GET controls report', r);

  r = await request('GET', '/api/reports/export', null, adminToken);
  log('R4', 'GET CSV export', r);

  // ==================== PUBLIC PORTAL ====================
  console.log('\n=== PORTAIL PUBLIC ===');

  r = await request('GET', '/api/public/info');
  log('P1', 'GET public info', r);

  r = await request('GET', '/api/public/lines');
  log('P2', 'GET public lines', r);

  r = await request('GET', '/api/public/stops');
  log('P3', 'GET public stops', r);

  r = await request('GET', '/api/public/schedules');
  log('P4', 'GET public schedules', r);

  r = await request('GET', '/api/public/search?q=Place');
  log('P5', 'GET public search', r);

  // ==================== SUBSCRIPTIONS ====================
  console.log('\n=== ABONNEMENTS ===');

  r = await request('GET', '/api/subscriptions', null, adminToken);
  log('SUB1', 'GET subscriptions', r);

  // ==================== AUDIT LOGS ====================
  console.log('\n=== JOURNAUX D\'AUDIT ===');

  r = await request('GET', '/api/audit-logs', null, adminToken);
  log('AL1', 'GET audit logs', r);

  // ==================== LINE STOPS ====================
  console.log('\n=== ARRETS DE LIGNE ===');

  r = await request('GET', '/api/line-stops', null, adminToken);
  log('LS1', 'GET line stops', r);

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log(`  RESULTATS: ${pass} PASS / ${fail} FAIL sur ${pass + fail} tests`);
  console.log('='.repeat(60));

  if (fail > 0) {
    console.log('\nTests echoues:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  ❌ [${r.testId}] ${r.desc} => HTTP ${r.status}`);
    });
  }
}

main().catch(console.error);
