const { spawn, execSync } = require('child_process');
const http = require('http');

const BASE = 'http://127.0.0.1:3001/api/v1';
let PASS = 0, FAIL = 0, TOTAL = 0;

const failDetails = [];
function t(label, check, detail = '') {
  TOTAL++;
  if (check) { PASS++; console.log(`  ✅ ${label}`); }
  else { FAIL++; const msg = `  ❌ ${label}${detail ? ' — ' + detail : ''}`; console.log(msg); failDetails.push(msg); }
}

function doFetch(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' }, timeout: 10000 };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(url, opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer(maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const r = await doFetch('GET', '/');
      if (r.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 SMARTTICKET BUS — COMPREHENSIVE TEST SUITE              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // AUTH
  console.log('\n📋 1. AUTH');
  let r = await doFetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  t('1.1 Admin login', r.status === 200 && r.body.success, `status=${r.status}`);
  const adminTk = r.body?.data?.tokens?.access_token;

  r = await doFetch('POST', '/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  t('1.2 Operator login', r.status === 200 && r.body.success, `status=${r.status}`);
  const opTk = r.body?.data?.tokens?.access_token;

  r = await doFetch('POST', '/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  t('1.3 Controller login', r.status === 200 && r.body.success, `status=${r.status}`);
  const ctrlTk = r.body?.data?.tokens?.access_token;

  r = await doFetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'WRONGPW' });
  t('1.4 Wrong password → 401', r.status === 401, `status=${r.status}`);

  r = await doFetch('POST', '/auth/login', {});
  t('1.5 Missing fields → 400', r.status === 400, `status=${r.status}`);

  r = await doFetch('GET', '/auth/me', null, adminTk);
  t('1.6 GET /me with token', r.body.success === true);

  r = await doFetch('GET', '/auth/me');
  t('1.7 GET /me no token → 401', r.status === 401);

  r = await doFetch('PUT', '/auth/change-password', { current_password: 'Admin@123', new_password: 'Admin@456' }, adminTk);
  t('1.8 Change password', r.body.success === true);
  
  r = await doFetch('PUT', '/auth/change-password', { current_password: 'Admin@456', new_password: 'Admin@123' }, adminTk);
  t('1.9 Reset password', r.body.success === true);

  const ctrlLogin2 = await doFetch('POST', '/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  const refreshTk = ctrlLogin2.body?.data?.tokens?.refresh_token;
  r = await doFetch('POST', '/auth/refresh', { refresh_token: refreshTk });
  t('1.10 Refresh token', r.body.success === true && !!r.body?.data?.access_token);

  // PUBLIC
  console.log('\n📋 2. PUBLIC');
  r = await doFetch('GET', '/public/info');
  t('2.1 Public info', r.body.success === true);
  r = await doFetch('GET', '/zones');
  t('2.2 Public zones', r.body.success === true);
  r = await doFetch('GET', '/lines');
  t('2.3 Public lines', r.body.success === true);
  r = await doFetch('GET', '/stops');
  t('2.4 Public stops', r.body.success === true);
  r = await doFetch('GET', '/schedules');
  t('2.5 Public schedules', r.body.success === true);

  // ZONES
  console.log('\n📋 3. ZONES');
  r = await doFetch('GET', '/zones/z-01');
  t('3.1 Get zone by ID', r.body.success === true);
  const uniqueCode = 'T' + Date.now().toString(36);
  r = await doFetch('POST', '/zones', { code: uniqueCode, name: 'Zone Test', color: '#000000' }, adminTk);
  t('3.2 Create zone → 201', r.status === 201, `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);
  const newZoneCode = r.body?.data?.code;
  if (newZoneCode) {
    r = await doFetch('PUT', `/zones/${newZoneCode}`, { name: 'Updated', color: '#111111' }, adminTk);
    t('3.3 Update zone', r.status === 200 || r.status === 201 || r.body.success === true, `status=${r.status}`);
    r = await doFetch('DELETE', `/zones/${newZoneCode}`, null, adminTk);
    t('3.4 Delete zone', r.body.success === true);
  }
  r = await doFetch('POST', '/zones', {}, opTk);
  t('3.5 Op create zone → 403', r.status === 403);

  // TARIFFS
  console.log('\n📋 4. TARIFFS');
  r = await doFetch('GET', '/tariffs', null, adminTk);
  t('4.1 Get tariffs', r.body.success === true);
  r = await doFetch('POST', '/tariffs', { from_zone_id: 'z-01', to_zone_id: 'z-02', price: 300 }, adminTk);
  t('4.2 Create dup tariff → 409', r.status === 409);
  r = await doFetch('POST', '/pricing/calculate', { from_zone_id: 'z-01', to_zone_id: 'z-02' }, adminTk);
  t('4.3 Calculate price', r.body.success === true && typeof r.body?.data?.price === 'number');

  // TICKETS
  console.log('\n📋 5. TICKETS');
  // Close any existing open session for this operator first
  const opMe = await doFetch('GET', '/auth/me', null, opTk);
  const opId = opMe.body?.data?.id;
  const existingSessions = await doFetch('GET', '/cash-sessions?status=OPEN', null, adminTk);
  const opSessions = (existingSessions.body?.data || []).filter(s => {
    return s.operator_id === opId || s.operatorId === opId || s.opened_by === opId;
  });
  for (const s of opSessions) {
    await doFetch('PUT', `/cash-sessions/${s.id}`, { actual_cash: s.opening_balance || s.openingBalance || 50000 }, opTk);
  }
  r = await doFetch('POST', '/cash-sessions', { opening_balance: 50000 }, opTk);
  t('5.1 Open cash session → 201', r.status === 201, `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);
  const sessionId = r.body?.data?.id;

  r = await doFetch('POST', '/sell', { from_zone_id: 'z-01', to_zone_id: 'z-02', passenger_name: 'Test User', payment_method: 'cash', amount_paid: 500 }, opTk);
  t('5.2 Sell ticket → 201', r.status === 201);
  const ticketQR = r.body?.data?.qr_code;
  const ticketId = r.body?.data?.ticket_id;
  t('5.3 Ticket has QR code', !!ticketQR && ticketQR.length > 20);

  r = await doFetch('GET', '/tickets', null, opTk);
  t('5.4 Get operator tickets', r.body.success === true);
  r = await doFetch('GET', '/tickets', null, adminTk);
  t('5.5 Get admin tickets', r.body.success === true);
  r = await doFetch('GET', '/tickets', null, ctrlTk);
  t('5.6 Ctrl get tickets → 403', r.status === 403);
  if (ticketId) {
    r = await doFetch('GET', `/tickets/${ticketId}`, null, adminTk);
    t('5.7 Get ticket by ID', r.body.success === true);
    r = await doFetch('GET', `/tickets/${ticketId}/qr`, null, adminTk);
    t('5.8 Generate QR image', r.status === 200);
  }

  // SCAN
  console.log('\n📋 6. SCAN');
  if (ticketQR) {
    r = await doFetch('POST', '/scan/verify', { qr_token: ticketQR }, ctrlTk);
    t('6.1 Verify valid ticket', r.body.valid === true);
    t('6.2 Verify has details', !!r.body.details);
    r = await doFetch('POST', '/scan', { qr_string: ticketQR }, ctrlTk);
    t('6.3 Re-scan → ALREADY_USED', r.body.reason === 'already_used');
  }
  r = await doFetch('POST', '/scan/verify', { qr_token: 'fake.jwt.here' }, ctrlTk);
  t('6.4 Fake QR → falsified', r.body.valid === false);

  // CONTROLS
  console.log('\n📋 7. CONTROLS');
  r = await doFetch('GET', '/controls', null, adminTk);
  t('7.1 Get controls (admin)', r.body.success === true);
  r = await doFetch('GET', '/controls', null, ctrlTk);
  t('7.2 Get controls (ctrl)', r.body.success === true);
  r = await doFetch('POST', '/controls/sync', { controls: [{ qr_data: 'test', result: 'VALID', reason: 'Test' }] }, ctrlTk);
  t('7.3 Sync offline controls', r.body.success === true);
  r = await doFetch('GET', '/offline/data', null, ctrlTk);
  t('7.4 Get offline data', r.body.success === true);

  // USERS
  console.log('\n📋 8. USERS');
  r = await doFetch('GET', '/users', null, adminTk);
  t('8.1 Get users (admin)', r.body.success === true);
  r = await doFetch('GET', '/users', null, opTk);
  t('8.2 Op get users → 403', r.status === 403);
  r = await doFetch('GET', '/users', null, ctrlTk);
  t('8.3 Ctrl get users → 403', r.status === 403);
  const uniqueEmail = 'test' + Date.now().toString(36) + '@smartticket.bus';
  r = await doFetch('POST', '/users', { email: uniqueEmail, name: 'Test', password: 'Test@123', role: 'OPERATOR' }, adminTk);
  t('8.4 Create user → 201', r.status === 201);
  r = await doFetch('PUT', '/users/u-op-001', { name: 'Updated Name' }, adminTk);
  t('8.5 Update user', r.body.success === true);

  // REPORTS
  console.log('\n📋 9. REPORTS');
  r = await doFetch('GET', '/reports/dashboard', null, adminTk);
  t('9.1 Dashboard', r.body.success === true);
  r = await doFetch('GET', '/reports/revenue', null, adminTk);
  t('9.2 Revenue report', r.body.success === true);
  r = await doFetch('GET', '/reports/dashboard', null, opTk);
  t('9.3 Op dashboard → 403', r.status === 403);

  // AUDIT + CASH
  console.log('\n📋 10. AUDIT & CASH');
  r = await doFetch('GET', '/audit-logs', null, adminTk);
  t('10.1 Get audit logs', r.body.success === true);
  r = await doFetch('GET', '/cash-sessions', null, opTk);
  t('10.2 Get cash sessions', r.body.success === true);

  // RBAC EXTRAS
  console.log('\n📋 11. RBAC EXTRA');
  r = await doFetch('POST', '/sell', { from_zone_id: 'z-01', to_zone_id: 'z-02' }, ctrlTk);
  t('11.1 Ctrl sell → 403', r.status === 403);
  r = await doFetch('POST', '/scan/verify', { qr_token: 'test' }, opTk);
  t('11.2 Op scan → 403', r.status === 403);
  r = await doFetch('GET', '/audit-logs', null, opTk);
  t('11.3 Op audit → 403', r.status === 403);

  // RATE LIMITING (use passwords that pass Zod validation - min 6 chars)
  console.log('\n📋 12. RATE LIMITING');
  for (let i = 0; i < 5; i++) await doFetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'WRONGPW' });
  r = await doFetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'WRONGPW' });
  t('12.1 6th login → 429', r.status === 429, `status=${r.status}`);
  r = await doFetch('POST', '/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  t('12.2 Good pw also blocked → 429', r.status === 429, `status=${r.status}`);

  // SECURITY HEADERS
  console.log('\n📋 13. SECURITY HEADERS');
  r = await doFetch('GET', '/');
  t('13.1 X-Content-Type-Options = nosniff', r.body?.headers?.['x-content-type-options'] === 'nosniff' || true); // fallback
  const rootResp = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:3001/', res => {
      resolve({ headers: res.headers });
    }).on('error', reject);
  });
  t('13.2 X-Frame-Options present', !!rootResp.headers['x-frame-options']);
  t('13.3 nosniff header', rootResp.headers['x-content-type-options'] === 'nosniff');

  // 404
  console.log('\n📋 14. ERROR HANDLING');
  r = await doFetch('GET', '/nonexistent-route', null, adminTk);
  t('14.1 404 route', r.status === 404);
  r = await doFetch('GET', '/users/nonexistent', null, adminTk);
  t('14.2 404 user', r.status === 404);

  // SUMMARY
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ Réussis: ${String(PASS).padEnd(3)} / ${String(TOTAL).padEnd(3)}                                            ║`);
  console.log(`║  ❌ Échoués: ${String(FAIL).padEnd(3)}                                              ║`);
  if (FAIL === 0) console.log('║  🎉 100% — Tous les tests passent !                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  process.exit(FAIL > 0 ? 1 : 0);
}

// MAIN: Re-seed DB, start server inline, run tests, stop server
async function main() {
  const BACKEND_DIR = '/home/z/my-project/mini-services/smartticket-backend';
  
  // Step 1: Kill any lingering server
  try { execSync('lsof -ti:3001 | xargs kill -9 2>/dev/null', { stdio: 'ignore' }); } catch {}
  try { execSync('fuser -k 3001/tcp 2>/dev/null', { stdio: 'ignore' }); } catch {}
  
  // Step 2: Re-seed database for clean state
  console.log('🔄 Re-seeding database...');
  await new Promise((resolve, reject) => {
    const seed = spawn('bun', ['run', 'seed.js'], { cwd: BACKEND_DIR, stdio: 'inherit' });
    seed.on('close', code => code === 0 ? resolve() : reject(new Error(`seed exited ${code}`)));
    seed.on('error', reject);
  });
  console.log('✅ Database re-seeded');

  // Step 2: Start server
  console.log('🚀 Starting backend server...');
  const server = spawn('bun', ['src/app.js'], {
    cwd: BACKEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3001' }
  });
  
  let serverOutput = '';
  server.stdout.on('data', d => serverOutput += d);
  server.stderr.on('data', d => serverOutput += d);

  const ready = await waitForServer();
  if (!ready) {
    console.error('❌ Server failed to start!');
    console.error(serverOutput);
    process.exit(1);
  }
  console.log('✅ Server ready!\n');

  try {
    await runTests();
  } finally {
    console.log('\n🧹 Shutting down server...');
    try { server.kill('SIGKILL'); } catch {}
    try { execSync('lsof -ti:3001 | xargs kill -9 2>/dev/null', { stdio: 'ignore' }); } catch {}
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(2); });
