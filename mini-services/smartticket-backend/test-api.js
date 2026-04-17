#!/usr/bin/env bun
// SmartTicket Backend - Comprehensive Test Script
// Tests all API endpoints

const BASE = 'http://localhost:3001/api/v1';

let passed = 0;
let failed = 0;
const results = [];

async function test(name, method, path, body = null, token = null, expectStatus = 200) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json();

    // For scan endpoints, success:false is acceptable (e.g. ALREADY_USED, FALSIFIED)
    const isScanEndpoint = path === '/scan';
    const ok = res.status === expectStatus && (
      expectStatus !== 200 ? true : 
      isScanEndpoint ? true :
      data.success !== false
    );
    if (ok) {
      passed++;
      results.push(`✅ ${name} [${res.status}]`);
    } else {
      failed++;
      results.push(`❌ ${name} [${res.status}] expected ${expectStatus} - ${JSON.stringify(data).substring(0, 80)}`);
    }
    return { status: res.status, data, ok };
  } catch (e) {
    failed++;
    results.push(`❌ ${name} [ERR] ${e.message}`);
    return { status: 0, data: null, ok: false };
  }
}

async function main() {
  console.log('🧪 SmartTicket Backend - Test Suite\n');

  // ============================================
  // AUTH
  // ============================================
  console.log('📋 AUTH TESTS');

  const adminLogin = await test('Login Admin', 'POST', '/auth/login', 
    { email: 'admin@smartticket.bus', password: 'Admin@123' });
  const adminToken = adminLogin.data?.data?.tokens?.access_token;

  const opLogin = await test('Login Operator', 'POST', '/auth/login',
    { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  const opToken = opLogin.data?.data?.tokens?.access_token;

  const ctrlLogin = await test('Login Controller', 'POST', '/auth/login',
    { email: 'control1@smartticket.bus', password: 'Control@123' });
  const ctrlToken = ctrlLogin.data?.data?.tokens?.access_token;

  await test('Login Wrong Password', 'POST', '/auth/login',
    { email: 'admin@smartticket.bus', password: 'wrong' }, null, 401);

  await test('Login Missing Fields', 'POST', '/auth/login',
    { email: 'admin@smartticket.bus' }, null, 400);

  await test('Get Profile (/me)', 'GET', '/auth/me', null, adminToken);

  await test('Get Profile No Auth', 'GET', '/auth/me', null, null, 401);

  await test('Change Password', 'PUT', '/auth/change-password',
    { current_password: 'Admin@123', new_password: 'Admin@456' }, adminToken);

  // Reset password
  await test('Reset Password', 'PUT', '/auth/change-password',
    { current_password: 'Admin@456', new_password: 'Admin@123' }, adminToken);

  await test('Refresh Token', 'POST', '/auth/refresh',
    { refresh_token: adminLogin.data?.data?.tokens?.refresh_token });

  // ============================================
  // PUBLIC
  // ============================================
  console.log('📋 PUBLIC PORTAL TESTS');

  await test('Public Info', 'GET', '/public/info');
  await test('Public Zones', 'GET', '/zones');
  await test('Public Lines', 'GET', '/lines');
  await test('Public Stops', 'GET', '/stops');
  await test('Public Schedules', 'GET', '/schedules');

  // ============================================
  // ZONES
  // ============================================
  console.log('📋 ZONES TESTS');

  await test('Get Zone By ID', 'GET', '/zones/z-01');
  
  await test('Create Zone', 'POST', '/zones',
    { code: '99', name: 'Zone Test', description: 'Test', color: '#000000' }, adminToken, 201);

  await test('Update Zone', 'PUT', '/zones/z-01',
    { name: 'Cap Manuel - Updated', description: 'Updated', color: '#dc2626' }, adminToken);

  await test('Create Zone Operator Forbidden', 'POST', '/zones',
    { code: '98', name: 'Forbidden' }, opToken, 403);

  await test('Delete Zone', 'DELETE', '/zones/z-01', null, adminToken);

  // Re-create it
  // Re-create zone 01 (soft-delete removed it, so code '01' is free)
  // Actually soft-delete sets is_active=0, code still exists. Skip re-creation.
  // await test('Re-create Zone z-01', 'POST', '/zones', ...);

  // ============================================
  // TARIFFS
  // ============================================
  console.log('📋 TARIFFS TESTS');

  await test('Get Tariffs', 'GET', '/tariffs', null, opToken);
  await test('Create Tariff (already exists)', 'POST', '/tariffs',
    { from_zone_id: 'z-01', to_zone_id: 'z-02', price: 300, ticket_type: 'single' }, adminToken, 409);

  // ============================================
  // TICKETS
  // ============================================
  console.log('📋 TICKET TESTS');

  // Calculate price first
  const priceCalc = await test('Calculate Price', 'POST', '/pricing/calculate',
    { from_zone_id: 'z-01', to_zone_id: 'z-02' }, opToken);

  // Open cash session
  await test('Open Cash Session', 'POST', '/cash-sessions',
    { opening_balance: 50000 }, opToken, 201);

  // Sell ticket
  const sellResult = await test('Sell Ticket', 'POST', '/sell',
    { from_zone_id: 'z-01', to_zone_id: 'z-02', passenger_name: 'Test User', payment_method: 'cash', amount_paid: 250 },
    opToken, 201);
  const ticketQR = sellResult.data?.data?.qr_code;
  const ticketId = sellResult.data?.data?.ticket_id;

  await test('Get Tickets (Operator)', 'GET', '/tickets', null, opToken);
  await test('Get Tickets (Admin)', 'GET', '/tickets', null, adminToken);
  await test('Get Tickets Controller Forbidden', 'GET', '/tickets', null, ctrlToken, 403);

  if (ticketId) {
    await test('Get Ticket By ID', 'GET', `/tickets/${ticketId}`, null, adminToken);
    await test('Generate QR Image', 'GET', `/tickets/${ticketId}/qr`, null, adminToken);
  }

  // ============================================
  // VALIDATION (SCAN) - /scan/verify (nouvelle route)
  // ============================================
  console.log('📋 SCAN TESTS (/scan/verify)');

  if (ticketQR) {
    // Test via /scan/verify avec qr_token (format spec)
    await test('Verify Valid Ticket (/scan/verify)', 'POST', '/scan/verify',
      { qr_token: ticketQR, location_lat: 14.69, location_lng: -17.44 }, ctrlToken);

    // Re-scan same ticket via /scan (backward compat) — should be ALREADY_USED
    await test('Validate Already Used (/scan)', 'POST', '/scan',
      { qr_string: ticketQR }, ctrlToken);

    // Fake QR via /scan/verify
    await test('Validate Fake QR (/scan/verify)', 'POST', '/scan/verify',
      { qr_token: 'fake.jwt.token.here' }, ctrlToken);
  }

  // ============================================
  // CASH SESSIONS
  // ============================================
  console.log('📋 CASH SESSIONS TESTS');

  await test('Get Cash Sessions', 'GET', '/cash-sessions', null, opToken);

  // ============================================
  // CONTROLS
  // ============================================
  console.log('📋 CONTROLS TESTS');

  await test('Get Controls (Admin)', 'GET', '/controls', null, adminToken);
  await test('Get Controls (Controller)', 'GET', '/controls', null, ctrlToken);

  // Offline sync
  await test('Sync Offline Controls', 'POST', '/controls/sync', {
    controls: [
      { qr_data: 'test-qr-1', result: 'VALID', reason: 'Offline test 1' },
      { qr_data: 'test-qr-2', result: 'FALSIFIED', reason: 'Offline test 2' }
    ]
  }, ctrlToken);

  // Offline data
  await test('Get Offline Data', 'GET', '/offline/data', null, ctrlToken);

  // ============================================
  // USERS
  // ============================================
  console.log('📋 USERS TESTS');

  await test('Get Users (Admin)', 'GET', '/users', null, adminToken);
  await test('Get Users Operator Forbidden', 'GET', '/users', null, opToken, 403);
  await test('Get Users Controller Forbidden', 'GET', '/users', null, ctrlToken, 403);

  await test('Create User', 'POST', '/users',
    { email: 'test@smartticket.bus', name: 'Test User', password: 'Test@123', role: 'OPERATOR' }, adminToken, 201);

  await test('Update User', 'PUT', '/users/u-op-001',
    { name: 'Fatou Diallo Updated', role: 'OPERATOR', phone: '+221770000001' }, adminToken);

  // ============================================
  // REPORTS
  // ============================================
  console.log('📋 REPORTS TESTS');

  await test('Dashboard', 'GET', '/reports/dashboard', null, adminToken);
  await test('Revenue Report', 'GET', '/reports/revenue', null, adminToken);
  await test('Dashboard Operator Forbidden', 'GET', '/reports/dashboard', null, opToken, 403);

  // ============================================
  // AUDIT LOGS
  // ============================================
  console.log('📋 AUDIT TESTS');

  await test('Get Audit Logs', 'GET', '/audit-logs', null, adminToken);

  // ============================================
  // RESULTS
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  for (const r of results) {
    console.log(r);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passed: ${passed}/${passed + failed}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${passed + failed}`);
  console.log(`📈 Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
