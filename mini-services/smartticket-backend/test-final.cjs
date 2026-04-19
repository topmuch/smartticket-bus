const http = require('http');
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    const d = body ? JSON.stringify(body) : null;
    const r = http.request({ hostname: 'localhost', port: 3001, path, method, headers: h }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(b) }); } catch { resolve({ s: res.statusCode, d: b }); } });
    });
    r.on('error', e => reject(e));
    if (d) r.write(d); r.end();
  });
}

async function main() {
  let P = 0, F = 0;
  const errs = [];
  const t = async (n, m, p, b, tk, es = 200) => {
    try {
      const r = await req(m, p, b, tk);
      r.s === es ? P++ : (F++, errs.push(`${n}: exp=${es} got=${r.s} ${typeof r.d === 'string' ? r.d.substring(0, 80) : ''}`));
      return r.d;
    } catch (e) { F++; errs.push(`${n}: ERR ${e.message}`); return {}; }
  };

  // AUTH
  console.log('AUTH...');
  const a = await t('Login Admin', 'POST', '/api/v1/auth/login', { email: 'admin@smartticket.bus', password: 'Admin@123' });
  const AT = a.d?.data?.tokens?.access_token;
  const o = await t('Login Op', 'POST', '/api/v1/auth/login', { email: 'guichet1@smartticket.bus', password: 'Oper@123' });
  const OT = o.d?.data?.tokens?.access_token;
  const c = await t('Login Ctrl', 'POST', '/api/v1/auth/login', { email: 'control1@smartticket.bus', password: 'Control@123' });
  const CT = c.d?.data?.tokens?.access_token;
  await t('Bad PW', 'POST', '/api/v1/auth/login', { email: 'admin@smartticket.bus', password: 'x' }, '', 401);
  await t('No auth', 'GET', '/api/v1/auth/me', null, '', 401);
  await t('Bad JWT', 'GET', '/api/v1/auth/me', null, 'bad', 403);
  await t('/me admin', 'GET', '/api/v1/auth/me', null, AT);
  await t('/me op', 'GET', '/api/v1/auth/me', null, OT);
  await t('/me ctrl', 'GET', '/api/v1/auth/me', null, CT);

  // PUBLIC
  console.log('PUBLIC...');
  await t('Info', 'GET', '/api/v1/public/info');
  await t('Zones', 'GET', '/api/v1/public/zones');
  await t('Lines', 'GET', '/api/v1/public/lines');
  await t('Stops', 'GET', '/api/v1/public/stops');
  await t('Schedules', 'GET', '/api/v1/public/schedules');
  await t('Fares', 'GET', '/api/v1/public/fares');
  await t('Passages', 'GET', '/api/v1/public/passages?line_id=l-01&day_of_week=1');
  await t('Search', 'GET', '/api/v1/public/search?q=Plateau');
  await t('Pricing pub', 'POST', '/api/v1/pricing/calculate', { from_zone_id: 'z-01', to_zone_id: 'z-02' });

  // ZONES CRUD
  console.log('ZONES...');
  await t('Get', 'GET', '/api/v1/zones', null, AT);
  const zr = await t('Create', 'POST', '/api/v1/zones', { code: 'TZ', name: 'Test Zone', color: '#333333' }, AT, 201);
  if (zr.d?.id) {
    await t('Update', 'PUT', `/api/v1/zones/${zr.d.id}`, { name: 'Updated' }, AT);
    await t('Delete', 'DELETE', `/api/v1/zones/${zr.d.id}`, null, AT);
  }
  await t('Op forbid', 'POST', '/api/v1/zones', { code: 'X', name: 'X' }, OT, 403);

  // LINES CRUD
  console.log('LINES...');
  const lr = await t('Create', 'POST', '/api/v1/lines', { number: 'TZ1', name: 'Test', description: 't' }, AT, 201);
  if (lr.d?.id) {
    await t('Update', 'PUT', `/api/v1/lines/${lr.d.id}`, { name: 'Updated' }, AT);
    await t('Delete', 'DELETE', `/api/v1/lines/${lr.d.id}`, null, AT);
  }

  // STOPS CRUD
  console.log('STOPS...');
  const sr = await t('Create', 'POST', '/api/v1/stops', { name: 'Test', code: 'TZS', zone_id: 'z-01', latitude: 0, longitude: 0 }, AT, 201);
  if (sr.d?.id) {
    await t('Update', 'PUT', `/api/v1/stops/${sr.d.id}`, { name: 'Updated' }, AT);
    await t('Delete', 'DELETE', `/api/v1/stops/${sr.d.id}`, null, AT);
  }

  // SCHEDULES CRUD
  console.log('SCHEDULES...');
  const scr = await t('Create', 'POST', '/api/v1/schedules', { line_id: 'l-01', day_of_week: 6, start_time: '09:00', end_time: '18:00', frequency: 30 }, AT, 201);
  if (scr.d?.id) {
    await t('Update', 'PUT', `/api/v1/schedules/${scr.d.id}`, { frequency: 45 }, AT);
    await t('Delete', 'DELETE', `/api/v1/schedules/${scr.d.id}`, null, AT);
  }

  // LINE STOPS
  console.log('LINE STOPS...');
  await t('Get', 'GET', '/api/v1/line-stops');
  await t('Filter', 'GET', '/api/v1/line-stops?line_id=l-01');

  // USERS
  console.log('USERS...');
  await t('Get', 'GET', '/api/v1/users', null, AT);
  await t('Op forbid', 'GET', '/api/v1/users', null, OT, 403);
  await t('Ctrl forbid', 'GET', '/api/v1/users', null, CT, 403);
  const ur = await t('Create', 'POST', '/api/v1/users', { name: 'Test', email: `test${Date.now()}@st.bus`, password: 'Test@1234', role: 'OPERATOR' }, AT, 201);
  if (ur.d?.id) {
    await t('Update', 'PUT', `/api/v1/users/${ur.d.id}`, { name: 'Updated' }, AT);
    await t('Delete', 'DELETE', `/api/v1/users/${ur.d.id}`, null, AT);
  }

  // TARIFFS
  console.log('TARIFFS...');
  await t('Get', 'GET', '/api/v1/tariffs', null, AT);
  await t('Op forbid', 'POST', '/api/v1/tariffs', { from_zone_id: 'z-01', to_zone_id: 'z-03', price: 400 }, OT, 403);

  // TICKETS
  console.log('TICKETS...');
  await t('Calc', 'POST', '/api/v1/tickets/calculate-price', { from_zone_id: 'z-01', to_zone_id: 'z-02' }, OT);
  await t('Open Session', 'POST', '/api/v1/cash-sessions/open', { opening_balance: 50000 }, OT, 201);
  const tr = await t('Sell', 'POST', '/api/v1/sell', { from_zone_id: 'z-01', to_zone_id: 'z-02', passenger_name: 'Test Client', payment_method: 'cash', amount_paid: 500 }, OT, 201);
  const qr = tr.d?.qr_code;
  await t('Get admin', 'GET', '/api/v1/tickets', null, AT);
  await t('Get op', 'GET', '/api/v1/tickets', null, OT);
  await t('Ctrl forbid', 'GET', '/api/v1/tickets', null, CT, 403);

  // SCAN
  console.log('SCAN...');
  if (qr) await t('Valid', 'POST', '/api/v1/scan/verify', { qr_token: qr }, CT);
  await t('Fake', 'POST', '/api/v1/scan/verify', { qr_token: 'fake_' + Date.now() }, CT);
  await t('Op forbid', 'POST', '/api/v1/scan/verify', { qr_token: 'x' }, OT, 403);

  // CASH
  console.log('CASH...');
  await t('Get', 'GET', '/api/v1/cash-sessions', null, AT);
  await t('Close', 'PUT', '/api/v1/cash-sessions/close', { actual_cash: 50500 }, OT);

  // CONTROLS
  console.log('CONTROLS...');
  await t('Get admin', 'GET', '/api/v1/controls', null, AT);
  await t('Get ctrl', 'GET', '/api/v1/controls', null, CT);
  await t('Sync', 'POST', '/api/v1/controls/sync', { controls: [{ ticket_id: '1', qr_data: 'test', result: 'VALID', reason: 'OK' }] }, CT);
  await t('Stats', 'GET', '/api/v1/controls/stats', null, AT);
  await t('Op forbid', 'POST', '/api/v1/controls/sync', { controls: [] }, OT, 403);

  // REPORTS
  console.log('REPORTS...');
  await t('Dashboard', 'GET', '/api/v1/reports/dashboard', null, AT);
  await t('Revenue', 'GET', '/api/v1/reports/revenue', null, AT);
  await t('Op forbid', 'GET', '/api/v1/reports/dashboard', null, OT, 403);
  await t('Export', 'GET', '/api/v1/reports/export', null, AT);

  // AUDIT
  console.log('AUDIT...');
  await t('Get', 'GET', '/api/v1/audit-logs', null, AT);
  await t('Op forbid', 'GET', '/api/v1/audit-logs', null, OT, 403);

  // OFFLINE
  console.log('OFFLINE...');
  await t('Ctrl', 'GET', '/api/v1/offline/data', null, CT);
  await t('Admin', 'GET', '/api/v1/offline/data', null, AT);

  // ERRORS
  console.log('ERRORS...');
  await t('404', 'GET', '/api/v1/nonexistent', null, '', 404);

  console.log('\n' + '='.repeat(50));
  console.log(`RESULTATS: ${P}/${P+F} | ${F === 0 ? '✅ TOUS LES TESTS PASSENT !' : '❌ ' + F + ' ECHEC(S)'}`);
  console.log('='.repeat(50));
  if (errs.length) { console.log('\nEchecs:'); errs.forEach(e => console.log('  - ' + e)); }
}

main().catch(e => console.error('FATAL:', e));
