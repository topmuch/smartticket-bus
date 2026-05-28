const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'localhost', port: 3001, path, method, headers };
    const req = http.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', e => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  let pass = 0, fail = 0;
  const errors = [];

  async function test(name, method, path, body, token, expStatus) {
    try {
      const r = await request(method, path, body, token);
      const ok = r.status === expStatus;
      ok ? pass++ : fail++;
      if (!ok) errors.push(`${name}: exp=${expStatus} got=${r.status}`);
      return r.data;
    } catch (e) {
      fail++;
      errors.push(`${name}: CONNECTION ERROR - ${e.message}`);
      return {};
    }
  }

  // LOGIN + GET TOKENS
  console.log('=== AUTH ===');
  const loginAdmin = await test('Login Admin', 'POST', '/api/v1/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' }, '', 200);
  const ADMIN = loginAdmin.data?.tokens?.access_token;
  const loginOp = await test('Login Operator', 'POST', '/api/v1/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' }, '', 200);
  const OP = loginOp.data?.tokens?.access_token;
  const loginCtrl = await test('Login Controller', 'POST', '/api/v1/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' }, '', 200);
  const CTRL = loginCtrl.data?.tokens?.access_token;
  
  await test('Bad Password', 'POST', '/api/v1/auth/login', { email: 'admin@smartticket.bus', password: 'wrong' }, '', 401);
  await test('No Auth /me', 'GET', '/api/v1/auth/me', null, '', 401);
  await test('Bad JWT /me', 'GET', '/api/v1/auth/me', null, 'bad_token', 403);
  if (ADMIN) await test('/me Admin', 'GET', '/api/v1/auth/me', null, ADMIN, 200);
  if (OP) await test('/me Operator', 'GET', '/api/v1/auth/me', null, OP, 200);
  if (CTRL) await test('/me Controller', 'GET', '/api/v1/auth/me', null, CTRL, 200);
  console.log(`  Auth: ${ADMIN ? '✅' : '❌'} tokens obtained`);

  // PUBLIC ENDPOINTS
  console.log('=== PUBLIC ===');
  await test('Info', 'GET', '/api/v1/public/info');
  await test('Zones', 'GET', '/api/v1/public/zones');
  await test('Lines', 'GET', '/api/v1/public/lines');
  await test('Stops', 'GET', '/api/v1/public/stops');
  await test('Schedules', 'GET', '/api/v1/public/schedules');
  await test('Fares', 'GET', '/api/v1/public/fares');
  await test('Passages', 'GET', '/api/v1/public/passages?line_id=1&day_of_week=1');
  await test('Search', 'GET', '/api/v1/public/search?q=Plateau');
  await test('Pricing', 'POST', '/api/v1/pricing/calculate', { from_zone_id: 1, to_zone_id: 2 });

  // CRUD: ZONES
  console.log('=== ZONES CRUD ===');
  await test('Get Zones', 'GET', '/api/v1/zones', null, ADMIN);
  const zr = await test('Create Zone', 'POST', '/api/v1/zones', { code: 'T99', name: 'Test', color: '#000000' }, ADMIN, 201);
  const zid = zr.data?.id;
  if (zid) {
    await test('Update Zone', 'PUT', `/api/v1/zones/${zid}`, { name: 'Updated' }, ADMIN);
    await test('Delete Zone', 'DELETE', `/api/v1/zones/${zid}`, null, ADMIN);
  }
  await test('Op Zone Forbid', 'POST', '/api/v1/zones', { code: 'X', name: 'Nope' }, OP, 403);

  // CRUD: LINES
  console.log('=== LINES CRUD ===');
  const lr = await test('Create Line', 'POST', '/api/v1/lines', { number: 'T99X', name: 'Test', description: 't' }, ADMIN, 201);
  const lid = lr.data?.id;
  if (lid) {
    await test('Update Line', 'PUT', `/api/v1/lines/${lid}`, { name: 'Updated' }, ADMIN);
    await test('Delete Line', 'DELETE', `/api/v1/lines/${lid}`, null, ADMIN);
  }

  // CRUD: STOPS
  console.log('=== STOPS CRUD ===');
  const sr = await test('Create Stop', 'POST', '/api/v1/stops', { name: 'Test', code: 'TST', zone_id: 1, latitude: 0, longitude: 0 }, ADMIN, 201);
  const sid = sr.data?.id;
  if (sid) {
    await test('Update Stop', 'PUT', `/api/v1/stops/${sid}`, { name: 'Updated' }, ADMIN);
    await test('Delete Stop', 'DELETE', `/api/v1/stops/${sid}`, null, ADMIN);
  }

  // CRUD: SCHEDULES
  console.log('=== SCHEDULES CRUD ===');
  const scr = await test('Create Schedule', 'POST', '/api/v1/schedules', { line_id: 1, day_of_week: 6, start_time: '08:00', end_time: '20:00', frequency: 30 }, ADMIN, 201);
  const scid = scr.data?.id;
  if (scid) {
    await test('Update Schedule', 'PUT', `/api/v1/schedules/${scid}`, { frequency: 45 }, ADMIN);
    await test('Delete Schedule', 'DELETE', `/api/v1/schedules/${scid}`, null, ADMIN);
  }

  // LINE STOPS
  console.log('=== LINE STOPS ===');
  await test('Get Line Stops', 'GET', '/api/v1/line-stops');
  await test('Filter Line Stops', 'GET', '/api/v1/line-stops?line_id=1');

  // USERS
  console.log('=== USERS CRUD ===');
  await test('Get Users', 'GET', '/api/v1/users', null, ADMIN);
  await test('Op Users Forbid', 'GET', '/api/v1/users', null, OP, 403);
  await test('Ctrl Users Forbid', 'GET', '/api/v1/users', null, CTRL, 403);
  const ur = await test('Create User', 'POST', '/api/v1/users', { name: 'Test', email: 'test@st.bus', password: 'Test@1234', role: 'OPERATOR' }, ADMIN, 201);
  const uid = ur.data?.id;
  if (uid) {
    await test('Update User', 'PUT', `/api/v1/users/${uid}`, { name: 'Updated' }, ADMIN);
    await test('Delete User', 'DELETE', `/api/v1/users/${uid}`, null, ADMIN);
  }

  // TARIFFS
  console.log('=== TARIFFS ===');
  await test('Get Tariffs', 'GET', '/api/v1/tariffs', null, ADMIN);
  await test('Op Tariffs Forbid', 'POST', '/api/v1/tariffs', { from_zone_id: 1, to_zone_id: 3, price: 400 }, OP, 403);

  // TICKETS
  console.log('=== TICKETS ===');
  await test('Calc Price', 'POST', '/api/v1/tickets/calculate-price', { from_zone_id: 1, to_zone_id: 2 }, OP);
  await test('Open Cash Session', 'POST', '/api/v1/cash-sessions/open', { opening_balance: 50000 }, OP, 201);
  const tr = await test('Sell Ticket', 'POST', '/api/v1/sell', { from_zone_id: 1, to_zone_id: 2, passenger_name: 'Test Client', payment_method: 'cash', amount_paid: 500 }, OP, 201);
  const qr = tr.data?.qr_token || tr.data?.qr_code;
  await test('Get Tickets Admin', 'GET', '/api/v1/tickets', null, ADMIN);
  await test('Get Tickets Op', 'GET', '/api/v1/tickets', null, OP);
  await test('Ctrl Tickets Forbid', 'GET', '/api/v1/tickets', null, CTRL, 403);

  // SCAN
  console.log('=== SCAN ===');
  if (qr) {
    await test('Scan Valid', 'POST', '/api/v1/scan/verify', { qr_token: qr }, CTRL);
  }
  await test('Scan Fake', 'POST', '/api/v1/scan/verify', { qr_token: 'totally_fake_' + Date.now() }, CTRL);
  await test('Op Scan Forbid', 'POST', '/api/v1/scan/verify', { qr_token: 'x' }, OP, 403);

  // CASH SESSIONS
  console.log('=== CASH SESSIONS ===');
  await test('Get Cash Sessions', 'GET', '/api/v1/cash-sessions', null, ADMIN);
  await test('Close Cash Session', 'PUT', '/api/v1/cash-sessions/close', { actual_cash: 50500 }, OP);

  // CONTROLS
  console.log('=== CONTROLS ===');
  await test('Get Controls Admin', 'GET', '/api/v1/controls', null, ADMIN);
  await test('Get Controls Ctrl', 'GET', '/api/v1/controls', null, CTRL);
  await test('Sync Controls', 'POST', '/api/v1/controls/sync', { controls: [{ ticket_id: 1, qr_data: 'test', result: 'VALID', reason: 'OK' }] }, CTRL);
  await test('Controls Stats', 'GET', '/api/v1/controls/stats', null, ADMIN);
  await test('Op Sync Forbid', 'POST', '/api/v1/controls/sync', { controls: [] }, OP, 403);

  // REPORTS
  console.log('=== REPORTS ===');
  await test('Dashboard', 'GET', '/api/v1/reports/dashboard', null, ADMIN);
  await test('Revenue', 'GET', '/api/v1/reports/revenue', null, ADMIN);
  await test('Op Dash Forbid', 'GET', '/api/v1/reports/dashboard', null, OP, 403);
  await test('Export CSV', 'GET', '/api/v1/reports/export', null, ADMIN);

  // AUDIT
  console.log('=== AUDIT ===');
  await test('Audit Logs', 'GET', '/api/v1/audit-logs', null, ADMIN);
  await test('Op Audit Forbid', 'GET', '/api/v1/audit-logs', null, OP, 403);

  // OFFLINE
  console.log('=== OFFLINE ===');
  await test('Offline Ctrl', 'GET', '/api/v1/offline/data', null, CTRL);
  await test('Offline Admin', 'GET', '/api/v1/offline/data', null, ADMIN);

  // ERRORS
  console.log('=== ERRORS ===');
  await test('404', 'GET', '/api/v1/nonexistent', null, '', 404);

  // RESULTS
  console.log('\n============================================');
  console.log(`RESULTATS: ${pass}/${pass + fail} TESTS`);
  console.log(fail === 0 ? '✅ TOUS LES TESTS PASSENT !' : `❌ ${fail} ECHEC(S)`);
  console.log('============================================');
  if (errors.length > 0) {
    console.log('\nDetails:');
    errors.forEach(e => console.log('  - ' + e));
  }
}

main().catch(e => console.error('FATAL:', e.message, e.stack));
