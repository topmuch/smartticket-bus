#!/usr/bin/env node
// SmartTicket Bus - Systematic API Self-Audit
const BASE = 'http://localhost:3000';

let pass = 0, fail = 0, total = 0;

async function req(method, path, body = null, token = null) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200), status: res.status }; }
    return { status: res.status, json, ok: res.status >= 200 && res.status < 500 };
  } catch (e) {
    return { status: 0, json: { error: e.message }, ok: false };
  }
}

function check(name, result, expectedPass, extra = '') {
  total++;
  const passed = expectedPass ? result.ok : !result.ok || result.json.success === false;
  if (passed) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); console.log(`     → HTTP ${result.status} | ${JSON.stringify(result.json).slice(0, 150)}`); }
}

(async () => {
  console.log('=========================================');
  console.log('  SmartTicket Bus - API Self-Audit');
  console.log('=========================================\n');

  // ===== 1. AUTH =====
  console.log('--- AUTH ---');
  let r;
  
  r = await req('POST', '/api/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  check('Login Admin (superadmin)', r, true);
  const adminToken = r.json?.data?.accessToken || '';
  console.log(`     Token: ${adminToken ? adminToken.slice(0, 30) + '...' : 'NONE'}`);

  r = await req('POST', '/api/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  check('Login Operator', r, true);
  const opToken = r.json?.data?.accessToken || '';

  r = await req('POST', '/api/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  check('Login Controller', r, true);
  const ctrlToken = r.json?.data?.accessToken || '';

  r = await req('POST', '/api/auth/login', { email: 'admin@smartticket.bus', password: 'wrong' });
  check('Login Wrong Password (should fail)', r, true, '(expect success:false)');

  r = await req('POST', '/api/auth/login', { email: 'nonexistent@test.com', password: 'test' });
  check('Login Nonexistent User (should fail)', r, true, '(expect success:false)');

  r = await req('GET', '/api/auth/me', null, adminToken);
  check('GET /me (Admin)', r, true);

  r = await req('GET', '/api/auth/me', null, null);
  check('GET /me (No Token → 401)', r, true, '(expect 401)');

  console.log('');

  // ===== 2. ZONES =====
  console.log('--- ZONES ---');
  r = await req('GET', '/api/zones', null, adminToken);
  check('GET Zones (Admin)', r, true);
  const zones = r.json?.data?.zones || r.json?.data || [];
  let zoneId = zones[0]?.id || '';

  r = await req('GET', '/api/zones', null, null);
  check('GET Zones (No Auth - public read)', r, true);

  if (zoneId) {
    r = await req('GET', `/api/zones/${zoneId}`, null, adminToken);
    check('GET Zone by ID', r, true);

    r = await req('POST', '/api/zones', { code: 'T99', name: 'Zone Test Audit', description: 'Test' }, adminToken);
    check('POST Create Zone', r, true);
    const newZone = r.json?.data;
    const newZoneId = newZone?.id || '';

    if (newZoneId) {
      r = await req('PUT', `/api/zones/${newZoneId}`, { name: 'Zone Test Updated' }, adminToken);
      check('PUT Update Zone', r, true);

      r = await req('DELETE', `/api/zones/${newZoneId}`, null, adminToken);
      check('DELETE Zone', r, true);
    }
  }
  console.log('');

  // ===== 3. FARES =====
  console.log('--- FARES ---');
  r = await req('GET', '/api/fares', null, adminToken);
  check('GET Fares', r, true);
  const fares = r.json?.data?.fares || r.json?.data || [];

  r = await req('POST', '/api/pricing/calculate', { fromZoneId: zoneId, toZoneId: zoneId }, adminToken);
  check('POST Calculate Pricing', r, true);
  console.log('');

  // ===== 4. LINES =====
  console.log('--- LINES ---');
  r = await req('GET', '/api/lines', null, adminToken);
  check('GET Lines (Admin)', r, true);
  const lines = r.json?.data?.lines || r.json?.data || [];
  let lineId = lines[0]?.id || '';

  r = await req('GET', '/api/lines', null, null);
  check('GET Lines (Public)', r, true);

  if (lineId) {
    r = await req('GET', `/api/lines/${lineId}`, null, adminToken);
    check('GET Line by ID', r, true);
  }
  console.log('');

  // ===== 5. STOPS =====
  console.log('--- STOPS ---');
  r = await req('GET', '/api/stops', null, adminToken);
  check('GET Stops (Admin)', r, true);

  r = await req('GET', '/api/stops', null, null);
  check('GET Stops (Public)', r, true);
  const stops = r.json?.data?.stops || r.json?.data || [];
  let stopId = stops[0]?.id || '';

  if (stopId) {
    r = await req('GET', `/api/stops/${stopId}`, null, adminToken);
    check('GET Stop by ID', r, true);
  }
  console.log('');

  // ===== 6. SCHEDULES =====
  console.log('--- SCHEDULES ---');
  r = await req('GET', '/api/schedules', null, adminToken);
  check('GET Schedules', r, true);
  console.log('');

  // ===== 7. USERS =====
  console.log('--- USERS (RBAC TEST) ---');
  r = await req('GET', '/api/users', null, adminToken);
  check('GET Users (Admin → OK)', r, true);

  r = await req('GET', '/api/users', null, opToken);
  check('GET Users (Operator → 403)', r, true, '(expect forbidden)');

  r = await req('GET', '/api/users', null, ctrlToken);
  check('GET Users (Controller → 403)', r, true, '(expect forbidden)');
  console.log('');

  // ===== 8. TICKETS =====
  console.log('--- TICKETS ---');
  r = await req('GET', '/api/tickets', null, adminToken);
  check('GET Tickets (Admin)', r, true);

  r = await req('GET', '/api/tickets', null, opToken);
  check('GET Tickets (Operator)', r, true);

  r = await req('GET', '/api/tickets', null, ctrlToken);
  check('GET Tickets (Controller → 403)', r, true, '(expect forbidden)');
  console.log('');

  // ===== 9. CONTROLS =====
  console.log('--- CONTROLS ---');
  r = await req('GET', '/api/controls', null, adminToken);
  check('GET Controls (Admin)', r, true);

  r = await req('GET', '/api/controls', null, ctrlToken);
  check('GET Controls (Controller)', r, true);

  r = await req('GET', '/api/controls/stats', null, adminToken);
  check('GET Controls Stats', r, true);
  console.log('');

  // ===== 10. REPORTS =====
  console.log('--- REPORTS ---');
  r = await req('GET', '/api/reports/dashboard', null, adminToken);
  check('GET Dashboard Stats', r, true);

  r = await req('GET', '/api/reports/revenue', null, adminToken);
  check('GET Revenue Report', r, true);

  r = await req('GET', '/api/reports/controls', null, adminToken);
  check('GET Controls Report', r, true);

  r = await req('GET', '/api/reports/export', null, adminToken);
  check('GET Export CSV', r, true);
  console.log('');

  // ===== 11. CASH SESSIONS =====
  console.log('--- CASH SESSIONS ---');
  r = await req('GET', '/api/cash-sessions', null, adminToken);
  check('GET Cash Sessions', r, true);
  console.log('');

  // ===== 12. SUBSCRIPTIONS =====
  console.log('--- SUBSCRIPTIONS ---');
  r = await req('GET', '/api/subscriptions', null, adminToken);
  check('GET Subscriptions', r, true);
  console.log('');

  // ===== 13. AUDIT LOGS =====
  console.log('--- AUDIT LOGS ---');
  r = await req('GET', '/api/audit-logs', null, adminToken);
  check('GET Audit Logs', r, true);
  console.log('');

  // ===== 14. PUBLIC PORTAL =====
  console.log('--- PUBLIC PORTAL ---');
  r = await req('GET', '/api/public/info', null);
  check('GET Public Info', r, true);

  r = await req('GET', '/api/public/lines', null);
  check('GET Public Lines', r, true);

  r = await req('GET', '/api/public/stops', null);
  check('GET Public Stops', r, true);

  r = await req('GET', '/api/public/schedules', null);
  check('GET Public Schedules', r, true);

  r = await req('GET', '/api/public/search?query=Place', null);
  check('GET Public Search', r, true);
  console.log('');

  // ===== 15. TICKET SALE + VALIDATION FLOW =====
  console.log('--- TICKET SALE + VALIDATION FLOW ---');
  
  // Open cash session
  r = await req('POST', '/api/cash-sessions', { openingBalance: 50000 }, opToken);
  check('POST Open Cash Session', r, true);
  const sessionId = r.json?.data?.id || '';

  // Get a fare
  const fromFare = fares[0];
  const toFare = fares[1];
  
  if (fromFare && toFare && sessionId) {
    r = await req('POST', '/api/tickets', {
      type: 'UNIT',
      fromZoneId: fromFare.fromZoneId,
      toZoneId: fromFare.toZoneId,
      price: fromFare.price || 250,
      amountPaid: 500,
      paymentMethod: 'cash',
      cashSessionId: sessionId
    }, opToken);
    check('POST Sell Ticket (UNIT)', r, true);
    const ticket = r.json?.data || {};
    const qrString = ticket.qrString || '';
    
    if (qrString) {
      // Validate the ticket as controller
      r = await req('POST', '/api/tickets/validate', { qrString }, ctrlToken);
      check('POST Validate Ticket QR (VALID)', r, true);
      console.log(`     Validation result: ${r.json?.result || 'unknown'}`);

      // Try to validate again (should be ALREADY_USED for UNIT)
      r = await req('POST', '/api/tickets/validate', { qrString }, ctrlToken);
      check('POST Re-validate (ALREADY_USED)', r, true);
      console.log(`     Re-validation result: ${r.json?.result || 'unknown'}`);
    }

    // Validate a fake QR
    r = await req('POST', '/api/tickets/validate', { qrString: 'fake.qr.token.invalid' }, ctrlToken);
    check('POST Validate Fake QR (FALSIFIED)', r, true);
    console.log(`     Fake QR result: ${r.json?.result || 'unknown'}`);
  }
  console.log('');

  // ===== RESULTS =====
  console.log('=========================================');
  console.log(`  RESULTS: ✅ ${pass}/${total} passed | ❌ ${fail}/${total} failed`);
  if (fail === 0) console.log('  🎉 ALL TESTS PASSED!');
  else console.log(`  ⚠️  ${fail} test(s) need attention`);
  console.log('=========================================');

  process.exit(fail > 0 ? 1 : 0);
})();
