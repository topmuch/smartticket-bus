#!/usr/bin/env node
// ============================================
// SmartTicket Bus - Unified Test Suite
// Node.js http module only — NO fetch()
// 50 tests across 11 categories
// ============================================
const http = require('http');

const BASE = 'http://127.0.0.1:3001/api/v1';

let PASS = 0, FAIL = 0, TOTAL = 0;

// ---------- HTTP helper (http module only) ----------
function fetch(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;

    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------- Test helper ----------
function t(label, check) {
  TOTAL++;
  if (check) {
    console.log(`  \u2705 ${label}`);
    PASS++;
  } else {
    console.log(`  \u274C ${label}`);
    FAIL++;
  }
}

// ---------- Main runner ----------
async function run() {
  console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  \uD83E\uDDEA SMARTTICKET BUS \u2014 UNIFIED TEST SUITE (50 tests)       \u2551');
  console.log('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');

  let r;
  let adminToken, opToken, ctrlToken, ctrlRefreshToken;
  let ticketQR, ticketId, createdZoneId;

  // ============================================
  // 1. AUTH (10 tests)
  // ============================================
  console.log('\n\u1F4CB 1. AUTH');

  // 1.1-1.3: Login three roles
  r = await fetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  t('1.1 Login admin (SUPERADMIN) \u2192 200', r.status === 200 && r.body.success === true);
  adminToken = r.body?.data?.tokens?.access_token;

  r = await fetch('POST', '/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  t('1.2 Login operator (OPERATOR) \u2192 200', r.status === 200 && r.body.success === true);
  opToken = r.body?.data?.tokens?.access_token;

  r = await fetch('POST', '/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  t('1.3 Login controller (CONTROLLER) \u2192 200', r.status === 200 && r.body.success === true);
  ctrlToken = r.body?.data?.tokens?.access_token;
  ctrlRefreshToken = r.body?.data?.tokens?.refresh_token;

  // 1.4: Wrong password
  r = await fetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'wrong' });
  t('1.4 Wrong password \u2192 401', r.status === 401);

  // 1.5: Missing fields
  r = await fetch('POST', '/auth/login', { email: 'admin@smartticket.bus' });
  t('1.5 Missing password field \u2192 400', r.status === 400);

  // 1.6: GET /me with valid token
  r = await fetch('GET', '/auth/me', null, adminToken);
  t('1.6 GET /me with token \u2192 200', r.status === 200 && r.body.success === true);

  // 1.7: GET /me without auth
  r = await fetch('GET', '/auth/me');
  t('1.7 GET /me no auth \u2192 401', r.status === 401);

  // 1.8: Change password
  r = await fetch('PUT', '/auth/change-password', { current_password: 'Admin@123', new_password: 'Admin@456' }, adminToken);
  t('1.8 Change password \u2192 200', r.body.success === true);

  // 1.9: Reset password back
  r = await fetch('PUT', '/auth/change-password', { current_password: 'Admin@456', new_password: 'Admin@123' }, adminToken);
  t('1.9 Reset password back \u2192 200', r.body.success === true);

  // 1.10: Refresh token
  r = await fetch('POST', '/auth/refresh', { refresh_token: ctrlRefreshToken });
  t('1.10 Refresh token \u2192 200', r.body.success === true && !!r.body?.data?.access_token);

  // ============================================
  // 2. PUBLIC (5 tests)
  // ============================================
  console.log('\n\u1F4CB 2. PUBLIC ENDPOINTS');

  r = await fetch('GET', '/public/info');
  t('2.1 GET /public/info \u2192 200', r.status === 200 && r.body.success === true);

  r = await fetch('GET', '/zones');
  t('2.2 GET /zones \u2192 200', r.status === 200 && r.body.success === true);

  r = await fetch('GET', '/lines');
  t('2.3 GET /lines \u2192 200', r.status === 200 && r.body.success === true);

  r = await fetch('GET', '/stops');
  t('2.4 GET /stops \u2192 200', r.status === 200 && r.body.success === true);

  r = await fetch('GET', '/schedules');
  t('2.5 GET /schedules \u2192 200', r.status === 200 && r.body.success === true);

  // ============================================
  // 3. ZONES (6 tests)
  // ============================================
  console.log('\n\u1F4CB 3. ZONES');

  r = await fetch('GET', '/zones', null, adminToken);
  t('3.1 Get all zones \u2192 200', r.body.success === true && Array.isArray(r.body.data));

  r = await fetch('GET', '/zones/z-01', null, adminToken);
  t('3.2 Get zone by ID (z-01) \u2192 200', r.status === 200 && r.body.success === true);

  r = await fetch('POST', '/zones', { code: '99', name: 'Zone Test', description: 'Test', color: '#000000' }, adminToken);
  t('3.3 Create zone \u2192 201', r.status === 201 && r.body.success === true);
  createdZoneId = r.body?.data?.id || r.body?.data?.zone_id || (r.body?.data?.code ? `z-${r.body.data.code}` : null);

  r = await fetch('PUT', '/zones/z-01', { name: 'Cap Manuel - Updated', description: 'Updated', color: '#dc2626' }, adminToken);
  t('3.4 Update zone (z-01) \u2192 200', r.body.success === true);

  r = await fetch('POST', '/zones', { code: '98', name: 'Forbidden Zone' }, opToken);
  t('3.5 Create zone operator forbidden \u2192 403', r.status === 403);

  if (createdZoneId) {
    r = await fetch('DELETE', `/zones/${createdZoneId}`, null, adminToken);
    t('3.6 Delete created zone \u2192 200', r.body.success === true);
  } else {
    t('3.6 Delete created zone \u2192 200 (skipped, no zone ID)', false);
  }

  // ============================================
  // 4. TARIFFS (3 tests)
  // ============================================
  console.log('\n\u1F4CB 4. TARIFFS');

  r = await fetch('GET', '/tariffs', null, adminToken);
  t('4.1 Get all tariffs \u2192 200', r.body.success === true);

  r = await fetch('POST', '/tariffs', { from_zone_id: 'z-01', to_zone_id: 'z-02', price: 300, ticket_type: 'single' }, adminToken);
  t('4.2 Create duplicate tariff \u2192 409', r.status === 409);

  r = await fetch('POST', '/pricing/calculate', { from_zone_id: 'z-01', to_zone_id: 'z-02' }, opToken);
  t('4.3 Calculate price \u2192 200', r.body.success === true && typeof r.body?.data?.price === 'number');

  // ============================================
  // 5. TICKETS (8 tests)
  // ============================================
  console.log('\n\u1F4CB 5. TICKETS');

  // 5.1: Calculate price
  r = await fetch('POST', '/pricing/calculate', { from_zone_id: 'z-01', to_zone_id: 'z-02' }, opToken);
  t('5.1 Calculate ticket price \u2192 200', r.body.success === true);

  // 5.2: Open cash session
  r = await fetch('POST', '/cash-sessions', { opening_balance: 50000 }, opToken);
  t('5.2 Open cash session \u2192 201', r.status === 201 && r.body.success === true);

  // 5.3: Sell ticket
  r = await fetch('POST', '/sell', {
    from_zone_id: 'z-01',
    to_zone_id: 'z-02',
    passenger_name: 'Test User',
    payment_method: 'cash',
    amount_paid: 250,
  }, opToken);
  t('5.3 Sell ticket \u2192 201', r.status === 201 && r.body.success === true);
  ticketQR = r.body?.data?.qr_code;
  ticketId = r.body?.data?.ticket_id;

  // 5.4: Get operator tickets
  r = await fetch('GET', '/tickets', null, opToken);
  t('5.4 Get tickets (operator) \u2192 200', r.body.success === true);

  // 5.5: Get admin tickets
  r = await fetch('GET', '/tickets', null, adminToken);
  t('5.5 Get tickets (admin) \u2192 200', r.body.success === true);

  // 5.6: Controller forbidden from tickets
  r = await fetch('GET', '/tickets', null, ctrlToken);
  t('5.6 Get tickets controller forbidden \u2192 403', r.status === 403);

  // 5.7: Get ticket by ID
  if (ticketId) {
    r = await fetch('GET', `/tickets/${ticketId}`, null, adminToken);
    t('5.7 Get ticket by ID \u2192 200', r.body.success === true);
  } else {
    t('5.7 Get ticket by ID \u2192 200 (skipped, no ticket)', false);
  }

  // 5.8: Generate QR image
  if (ticketId) {
    r = await fetch('GET', `/tickets/${ticketId}/qr`, null, adminToken);
    t('5.8 Generate QR image \u2192 200', r.status === 200);
  } else {
    t('5.8 Generate QR image \u2192 200 (skipped, no ticket)', false);
  }

  // ============================================
  // 6. SCAN (4 tests)
  // ============================================
  console.log('\n\u1F4CB 6. SCAN / VALIDATION');

  if (ticketQR) {
    // 6.1: Verify valid ticket via /scan/verify (spec endpoint)
    r = await fetch('POST', '/scan/verify', { qr_token: ticketQR, location_lat: 14.69, location_lng: -17.44 }, ctrlToken);
    t('6.1 Verify valid ticket (/scan/verify) \u2192 VALID', r.body.valid === true);

    // 6.2: Re-scan same ticket via /scan (backward compat) \u2192 ALREADY_USED
    r = await fetch('POST', '/scan', { qr_string: ticketQR }, ctrlToken);
    t('6.2 Already used (/scan backward compat) \u2192 ALREADY_USED', r.body.valid === false);

    // 6.3: Fake QR via /scan/verify
    r = await fetch('POST', '/scan/verify', { qr_token: 'fake.jwt.token.here' }, ctrlToken);
    t('6.3 Fake QR (/scan/verify) \u2192 valid=false', r.body.valid === false);

    // 6.4: Fake QR via /scan (backward compat old endpoint)
    r = await fetch('POST', '/scan', { qr_string: 'fake.jwt.token.here' }, ctrlToken);
    t('6.4 Fake QR (/scan backward compat) \u2192 valid=false', r.body.valid === false);
  } else {
    t('6.1 Verify valid ticket (/scan/verify) \u2192 VALID (skipped)', false);
    t('6.2 Already used (/scan backward compat) (skipped)', false);
    t('6.3 Fake QR (/scan/verify) (skipped)', false);
    t('6.4 Fake QR (/scan backward compat) (skipped)', false);
  }

  // ============================================
  // 7. CONTROLS (4 tests)
  // ============================================
  console.log('\n\u1F4CB 7. CONTROLS');

  r = await fetch('GET', '/controls', null, adminToken);
  t('7.1 Get controls (admin) \u2192 200', r.body.success === true);

  r = await fetch('GET', '/controls', null, ctrlToken);
  t('7.2 Get controls (controller) \u2192 200', r.body.success === true);

  r = await fetch('POST', '/controls/sync', {
    controls: [
      { qr_data: 'test-qr-1', result: 'VALID', reason: 'Offline test 1' },
      { qr_data: 'test-qr-2', result: 'FALSIFIED', reason: 'Offline test 2' },
    ],
  }, ctrlToken);
  t('7.3 Sync offline controls \u2192 200', r.body.success === true);

  r = await fetch('GET', '/offline/data', null, ctrlToken);
  t('7.4 Get offline data \u2192 200', r.body.success === true);

  // ============================================
  // 8. USERS (5 tests)
  // ============================================
  console.log('\n\u1F4CB 8. USERS');

  r = await fetch('GET', '/users', null, adminToken);
  t('8.1 Get users (admin) \u2192 200', r.body.success === true);

  r = await fetch('GET', '/users', null, opToken);
  t('8.2 Get users operator forbidden \u2192 403', r.status === 403);

  r = await fetch('GET', '/users', null, ctrlToken);
  t('8.3 Get users controller forbidden \u2192 403', r.status === 403);

  r = await fetch('POST', '/users', {
    email: 'test@smartticket.bus',
    name: 'Test User',
    password: 'Test@123',
    role: 'OPERATOR',
  }, adminToken);
  t('8.4 Create user \u2192 201', r.status === 201 && r.body.success === true);

  r = await fetch('PUT', '/users/u-op-001', {
    name: 'Fatou Diallo Updated',
    role: 'OPERATOR',
    phone: '+221770000001',
  }, adminToken);
  t('8.5 Update user (u-op-001) \u2192 200', r.body.success === true);

  // ============================================
  // 9. REPORTS (3 tests)
  // ============================================
  console.log('\n\u1F4CB 9. REPORTS');

  r = await fetch('GET', '/reports/dashboard', null, adminToken);
  t('9.1 Dashboard (admin) \u2192 200', r.body.success === true);

  r = await fetch('GET', '/reports/revenue', null, adminToken);
  t('9.2 Revenue report (admin) \u2192 200', r.body.success === true);

  r = await fetch('GET', '/reports/dashboard', null, opToken);
  t('9.3 Dashboard operator forbidden \u2192 403', r.status === 403);

  // ============================================
  // 10. AUDIT (1 test)
  // ============================================
  console.log('\n\u1F4CB 10. AUDIT LOGS');

  r = await fetch('GET', '/audit-logs', null, adminToken);
  t('10.1 Get audit logs (admin) \u2192 200', r.body.success === true);

  // ============================================
  // 11. CASH SESSIONS (1 test)
  // ============================================
  console.log('\n\u1F4CB 11. CASH SESSIONS');

  r = await fetch('GET', '/cash-sessions', null, opToken);
  t('11.1 Get cash sessions (operator) \u2192 200', r.body.success === true);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  RESULTS                                                      \u2551');
  console.log('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
  console.log(`\u2551  \u2705 Passed: ${String(PASS).padEnd(3)} / ${String(TOTAL).padEnd(3)}                                          \u2551`);
  if (FAIL > 0) {
    console.log(`\u2551  \u274C Failed: ${String(FAIL).padEnd(3)}                                            \u2551`);
  } else {
    console.log('\u2551  \u274C Failed: 0                                             \u2551');
  }
  console.log(`\u2551  \uD83D\uDCC8 Rate:   ${String(Math.round(PASS / TOTAL * 100) + '%').padEnd(3)}                                           \u2551`);
  if (FAIL === 0) {
    console.log('\u2551                                                              \u2551');
    console.log('\u2551  \uD83C\uDF89 100% \u2014 All tests passed!                                 \u2551');
  }
  console.log('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');

  process.exit(FAIL > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(2);
});
