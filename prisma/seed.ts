import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { generateQRToken } from '../src/lib/qr';

async function seed() {
  console.log('🌱 Seeding SmartTicket Bus database...\n');

  // =============================================
  // 1. UTILISATEURS
  // =============================================
  console.log('📋 Creating users...');

  const adminPassword = await hashPassword('Admin@123');
  const operatorPassword = await hashPassword('Oper@123');
  const controllerPassword = await hashPassword('Control@123');

  const superadmin = await db.user.upsert({
    where: { email: 'admin@smartticket.bus' },
    update: {},
    create: {
      email: 'admin@smartticket.bus',
      passwordHash: adminPassword,
      name: 'Super Administrateur',
      role: 'SUPERADMIN',
      isActive: true,
      phone: '+221 77 123 00 00',
    },
  });

  const operator1 = await db.user.upsert({
    where: { email: 'guichet1@smartticket.bus' },
    update: {},
    create: {
      email: 'guichet1@smartticket.bus',
      passwordHash: operatorPassword,
      name: 'Marie Diallo',
      role: 'OPERATOR',
      isActive: true,
      phone: '+221 77 456 00 00',
    },
  });

  const operator2 = await db.user.upsert({
    where: { email: 'guichet2@smartticket.bus' },
    update: {},
    create: {
      email: 'guichet2@smartticket.bus',
      passwordHash: operatorPassword,
      name: 'Ibrahim Ndiaye',
      role: 'OPERATOR',
      isActive: true,
      phone: '+221 78 456 00 00',
    },
  });

  const controller1 = await db.user.upsert({
    where: { email: 'control1@smartticket.bus' },
    update: {},
    create: {
      email: 'control1@smartticket.bus',
      passwordHash: controllerPassword,
      name: 'Ousmane Fall',
      role: 'CONTROLLER',
      isActive: true,
      phone: '+221 76 789 00 00',
    },
  });

  const controller2 = await db.user.upsert({
    where: { email: 'control2@smartticket.bus' },
    update: {},
    create: {
      email: 'control2@smartticket.bus',
      passwordHash: controllerPassword,
      name: 'Fatou Sow',
      role: 'CONTROLLER',
      isActive: true,
      phone: '+221 76 789 00 01',
    },
  });

  console.log(`  ✅ 5 users created (1 superadmin, 2 operators, 2 controllers)\n`);

  // =============================================
  // 2. ZONES
  // =============================================
  console.log('🗺️  Creating zones...');

  const zone1 = await db.zone.upsert({
    where: { code: '01' },
    update: {},
    create: {
      code: '01',
      name: 'Centre-ville',
      description: 'Zone centre-ville, gare routière, marché central',
      color: '#16a34a',
      isActive: true,
    },
  });

  const zone2 = await db.zone.upsert({
    where: { code: '02' },
    update: {},
    create: {
      code: '02',
      name: 'Zone Nord',
      description: 'Quartiers nord: Université, Hôpital, Parcelles',
      color: '#2563eb',
      isActive: true,
    },
  });

  const zone3 = await db.zone.upsert({
    where: { code: '03' },
    update: {},
    create: {
      code: '03',
      name: 'Zone Est',
      description: 'Quartiers est: Liberté, Grand Yoff, Patte d\'Oie',
      color: '#d97706',
      isActive: true,
    },
  });

  const zone4 = await db.zone.upsert({
    where: { code: '04' },
    update: {},
    create: {
      code: '04',
      name: 'Zone Sud',
      description: 'Quartiers sud: Médina, Fann, Bel Air',
      color: '#dc2626',
      isActive: true,
    },
  });

  const zone5 = await db.zone.upsert({
    where: { code: '05' },
    update: {},
    create: {
      code: '05',
      name: 'Zone Ouest',
      description: 'Quartiers ouest: Ngor, Yoff, Ouakam',
      color: '#7c3aed',
      isActive: true,
    },
  });

  console.log(`  ✅ 5 zones created\n`);

  // =============================================
  // 3. TARIFS
  // =============================================
  console.log('💰 Creating fares...');

  const fareData = [
    { from: zone1.id, to: zone1.id, price: 150 },   // Centre intra-zone
    { from: zone2.id, to: zone2.id, price: 150 },
    { from: zone3.id, to: zone3.id, price: 150 },
    { from: zone4.id, to: zone4.id, price: 150 },
    { from: zone5.id, to: zone5.id, price: 150 },
    { from: zone1.id, to: zone2.id, price: 250 },   // Centre → Nord
    { from: zone1.id, to: zone3.id, price: 300 },   // Centre → Est
    { from: zone1.id, to: zone4.id, price: 250 },   // Centre → Sud
    { from: zone1.id, to: zone5.id, price: 350 },   // Centre → Ouest
    { from: zone2.id, to: zone3.id, price: 300 },   // Nord → Est
    { from: zone2.id, to: zone4.id, price: 350 },   // Nord → Sud
    { from: zone2.id, to: zone5.id, price: 400 },   // Nord → Ouest
    { from: zone3.id, to: zone4.id, price: 300 },   // Est → Sud
    { from: zone3.id, to: zone5.id, price: 350 },   // Est → Ouest
    { from: zone4.id, to: zone5.id, price: 300 },   // Sud → Ouest
  ];

  for (const fd of fareData) {
    await db.fare.upsert({
      where: {
        fromZoneId_toZoneId: { fromZoneId: fd.from, toZoneId: fd.to },
      },
      update: {},
      create: {
        fromZoneId: fd.from,
        toZoneId: fd.to,
        price: fd.price,
        isActive: true,
      },
    });
  }

  console.log(`  ✅ 15 fares created\n`);

  // =============================================
  // 4. ARRETS
  // =============================================
  console.log('🚏 Creating stops...');

  const stopsData = [
    // Zone 01 - Centre-ville
    { name: 'Gare Routière', code: 'ST001', zoneId: zone1.id, lat: 14.6937, lng: -17.4441 },
    { name: 'Marché Sandaga', code: 'ST002', zoneId: zone1.id, lat: 14.6915, lng: -17.4395 },
    { name: 'Place de l\'Indépendance', code: 'ST003', zoneId: zone1.id, lat: 14.6936, lng: -17.4448 },
    // Zone 02 - Nord
    { name: 'Université Cheikh Anta Diop', code: 'ST004', zoneId: zone2.id, lat: 14.7015, lng: -17.4795 },
    { name: 'Hôpital Aristide Le Dantec', code: 'ST005', zoneId: zone2.id, lat: 14.6985, lng: -17.4745 },
    { name: 'Parcelles Assainies', code: 'ST006', zoneId: zone2.id, lat: 14.7150, lng: -17.4650 },
    // Zone 03 - Est
    { name: 'Terminus Liberté', code: 'ST007', zoneId: zone3.id, lat: 14.6850, lng: -17.4250 },
    { name: 'Grand Yoff', code: 'ST008', zoneId: zone3.id, lat: 14.6800, lng: -17.4150 },
    { name: 'Patte d\'Oie', code: 'ST009', zoneId: zone3.id, lat: 14.6875, lng: -17.4300 },
    // Zone 04 - Sud
    { name: 'Médina', code: 'ST010', zoneId: zone4.id, lat: 14.6850, lng: -17.4500 },
    { name: 'Fann Hock', code: 'ST011', zoneId: zone4.id, lat: 14.6780, lng: -17.4550 },
    { name: 'Bel Air', code: 'ST012', zoneId: zone4.id, lat: 14.6700, lng: -17.4480 },
    // Zone 05 - Ouest
    { name: 'Ngor', code: 'ST013', zoneId: zone5.id, lat: 14.7170, lng: -17.5030 },
    { name: 'Yoff', code: 'ST014', zoneId: zone5.id, lat: 14.7350, lng: -17.4900 },
    { name: 'Ouakam', code: 'ST015', zoneId: zone5.id, lat: 14.7000, lng: -17.4900 },
  ];

  const createdStops: any[] = [];
  for (const sd of stopsData) {
    const stop = await db.stop.upsert({
      where: { code: sd.code },
      update: {},
      create: {
        name: sd.name,
        code: sd.code,
        zoneId: sd.zoneId,
        latitude: sd.lat,
        longitude: sd.lng,
        isActive: true,
      },
    });
    createdStops.push(stop);
  }

  console.log(`  ✅ 15 stops created\n`);

  // =============================================
  // 5. LIGNES
  // =============================================
  console.log('🚌 Creating lines...');

  const linesData = [
    { number: 'L1', name: 'Ligne Centre-Nord', color: '#16a34a' },
    { number: 'L2', name: 'Ligne Centre-Est', color: '#2563eb' },
    { number: 'L3', name: 'Ligne Centre-Sud', color: '#d97706' },
    { number: 'L4', name: 'Ligne Nord-Ouest', color: '#dc2626' },
    { number: 'L5', name: 'Ligne Est-Sud', color: '#7c3aed' },
    { number: 'EXP1', name: 'Express Aéroport-Centre', color: '#0891b2' },
  ];

  const createdLines: any[] = [];
  for (const ld of linesData) {
    const line = await db.line.upsert({
      where: { number: ld.number },
      update: {},
      create: {
        number: ld.number,
        name: ld.name,
        color: ld.color,
        isActive: true,
      },
    });
    createdLines.push(line);
  }

  console.log(`  ✅ 6 lines created\n`);

  // =============================================
  // 6. LIGNE-ARRETS
  // =============================================
  console.log('🔗 Creating line-stop relationships...');

  const lineStopRelations = [
    // L1: Gare → Marché → Place → Hôpital → Université → Parcelles
    { lineIdx: 0, fromIdx: 0, toIdx: 1, order: 1, duration: 5 },
    { lineIdx: 0, fromIdx: 1, toIdx: 2, order: 2, duration: 3 },
    { lineIdx: 0, fromIdx: 2, toIdx: 4, order: 3, duration: 10 },
    { lineIdx: 0, fromIdx: 4, toIdx: 3, order: 4, duration: 8 },
    { lineIdx: 0, fromIdx: 3, toIdx: 5, order: 5, duration: 7 },
    // L2: Gare → Marché → Patte d'Oie → Liberté → Grand Yoff
    { lineIdx: 1, fromIdx: 0, toIdx: 1, order: 1, duration: 5 },
    { lineIdx: 1, fromIdx: 1, toIdx: 8, order: 2, duration: 8 },
    { lineIdx: 1, fromIdx: 8, toIdx: 6, order: 3, duration: 7 },
    { lineIdx: 1, fromIdx: 6, toIdx: 7, order: 4, duration: 10 },
    // L3: Gare → Place → Médina → Fann → Bel Air
    { lineIdx: 2, fromIdx: 0, toIdx: 2, order: 1, duration: 3 },
    { lineIdx: 2, fromIdx: 2, toIdx: 9, order: 2, duration: 8 },
    { lineIdx: 2, fromIdx: 9, toIdx: 10, order: 3, duration: 5 },
    { lineIdx: 2, fromIdx: 10, toIdx: 11, order: 4, duration: 7 },
    // L4: Université → Hôpital → Ouakam → Ngor → Yoff
    { lineIdx: 3, fromIdx: 3, toIdx: 4, order: 1, duration: 8 },
    { lineIdx: 3, fromIdx: 4, toIdx: 14, order: 2, duration: 10 },
    { lineIdx: 3, fromIdx: 14, toIdx: 12, order: 3, duration: 8 },
    { lineIdx: 3, fromIdx: 12, toIdx: 13, order: 4, duration: 6 },
    // L5: Grand Yoff → Liberté → Patte d'Oie → Médina → Bel Air
    { lineIdx: 4, fromIdx: 7, toIdx: 6, order: 1, duration: 10 },
    { lineIdx: 4, fromIdx: 6, toIdx: 8, order: 2, duration: 7 },
    { lineIdx: 4, fromIdx: 8, toIdx: 9, order: 3, duration: 10 },
    { lineIdx: 4, fromIdx: 9, toIdx: 11, order: 4, duration: 12 },
    // EXP1: Aéroport area (simulated via Liberté) → Gare
    { lineIdx: 5, fromIdx: 6, toIdx: 2, order: 1, duration: 15 },
    { lineIdx: 5, fromIdx: 2, toIdx: 0, order: 2, duration: 12 },
  ];

  for (const lsr of lineStopRelations) {
    await db.lineStop.upsert({
      where: {
        lineId_fromStopId_toStopId_direction: {
          lineId: createdLines[lsr.lineIdx].id,
          fromStopId: createdStops[lsr.fromIdx].id,
          toStopId: createdStops[lsr.toIdx].id,
          direction: 'forward',
        },
      },
      update: {},
      create: {
        lineId: createdLines[lsr.lineIdx].id,
        fromStopId: createdStops[lsr.fromIdx].id,
        toStopId: createdStops[lsr.toIdx].id,
        order: lsr.order,
        direction: 'forward',
        duration: lsr.duration,
      },
    });
  }

  console.log(`  ✅ 25 line-stop relations created\n`);

  // =============================================
  // 7. HORAIRES
  // =============================================
  console.log('🕐 Creating schedules...');

  const schedulesData = [
    // L1 - every day
    { lineIdx: 0, dow: 1, start: '05:30', end: '22:00', freq: 15 },
    { lineIdx: 0, dow: 2, start: '05:30', end: '22:00', freq: 15 },
    { lineIdx: 0, dow: 3, start: '05:30', end: '22:00', freq: 15 },
    { lineIdx: 0, dow: 4, start: '05:30', end: '22:00', freq: 15 },
    { lineIdx: 0, dow: 5, start: '05:30', end: '22:00', freq: 15 },
    { lineIdx: 0, dow: 6, start: '06:00', end: '22:00', freq: 20 },
    { lineIdx: 0, dow: 0, start: '06:30', end: '21:00', freq: 30 },
    // L2 - weekdays
    { lineIdx: 1, dow: 1, start: '06:00', end: '21:00', freq: 12 },
    { lineIdx: 1, dow: 2, start: '06:00', end: '21:00', freq: 12 },
    { lineIdx: 1, dow: 3, start: '06:00', end: '21:00', freq: 12 },
    { lineIdx: 1, dow: 4, start: '06:00', end: '21:00', freq: 12 },
    { lineIdx: 1, dow: 5, start: '06:00', end: '21:00', freq: 12 },
    { lineIdx: 1, dow: 6, start: '07:00', end: '20:00', freq: 20 },
    { lineIdx: 1, dow: 0, start: '07:30', end: '19:00', freq: 30 },
    // L3 - every day
    { lineIdx: 2, dow: 1, start: '05:45', end: '22:30', freq: 10 },
    { lineIdx: 2, dow: 2, start: '05:45', end: '22:30', freq: 10 },
    { lineIdx: 2, dow: 3, start: '05:45', end: '22:30', freq: 10 },
    { lineIdx: 2, dow: 4, start: '05:45', end: '22:30', freq: 10 },
    { lineIdx: 2, dow: 5, start: '05:45', end: '22:30', freq: 10 },
    { lineIdx: 2, dow: 6, start: '06:00', end: '22:00', freq: 15 },
    { lineIdx: 2, dow: 0, start: '06:30', end: '21:00', freq: 25 },
    // L4
    { lineIdx: 3, dow: 1, start: '06:00', end: '21:30', freq: 18 },
    { lineIdx: 3, dow: 2, start: '06:00', end: '21:30', freq: 18 },
    { lineIdx: 3, dow: 3, start: '06:00', end: '21:30', freq: 18 },
    { lineIdx: 3, dow: 4, start: '06:00', end: '21:30', freq: 18 },
    { lineIdx: 3, dow: 5, start: '06:00', end: '21:30', freq: 18 },
    { lineIdx: 3, dow: 6, start: '07:00', end: '20:00', freq: 25 },
    // L5
    { lineIdx: 4, dow: 1, start: '06:00', end: '21:00', freq: 20 },
    { lineIdx: 4, dow: 2, start: '06:00', end: '21:00', freq: 20 },
    { lineIdx: 4, dow: 3, start: '06:00', end: '21:00', freq: 20 },
    { lineIdx: 4, dow: 4, start: '06:00', end: '21:00', freq: 20 },
    { lineIdx: 4, dow: 5, start: '06:00', end: '21:00', freq: 20 },
    // EXP1 - express, every 30 min
    { lineIdx: 5, dow: 1, start: '05:00', end: '23:00', freq: 30 },
    { lineIdx: 5, dow: 2, start: '05:00', end: '23:00', freq: 30 },
    { lineIdx: 5, dow: 3, start: '05:00', end: '23:00', freq: 30 },
    { lineIdx: 5, dow: 4, start: '05:00', end: '23:00', freq: 30 },
    { lineIdx: 5, dow: 5, start: '05:00', end: '23:00', freq: 30 },
    { lineIdx: 5, dow: 6, start: '06:00', end: '22:00', freq: 45 },
    { lineIdx: 5, dow: 0, start: '07:00', end: '21:00', freq: 60 },
  ];

  for (const sd of schedulesData) {
    await db.schedule.upsert({
      where: {
        lineId_dayOfWeek_startTime: {
          lineId: createdLines[sd.lineIdx].id,
          dayOfWeek: sd.dow,
          startTime: sd.start,
        },
      },
      update: {},
      create: {
        lineId: createdLines[sd.lineIdx].id,
        dayOfWeek: sd.dow,
        startTime: sd.start,
        endTime: sd.end,
        frequency: sd.freq,
        isActive: true,
      },
    });
  }

  console.log(`  ✅ 39 schedules created\n`);

  // =============================================
  // 8. TICKETS DE TEST
  // =============================================
  console.log('🎫 Creating sample tickets...');

  const now = new Date();
  const validTo = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours

  const sampleTickets = [
    {
      type: 'UNIT' as const,
      ticketNumber: 'TK-20250101-0001',
      passengerName: 'Voyageur Test',
      passengerPhone: '+221 77 000 00 01',
      fromStopId: createdStops[0].id,  // Gare
      toStopId: createdStops[3].id,    // Université
      fromZoneId: zone1.id,
      toZoneId: zone2.id,
      lineId: createdLines[0].id,
      price: 250,
      amountPaid: 500,
      changeGiven: 250,
      paymentMethod: 'cash',
      validFrom: now,
      validTo,
      soldById: operator1.id,
      status: 'VALID' as const,
    },
    {
      type: 'UNIT' as const,
      ticketNumber: 'TK-20250101-0002',
      passengerName: 'Aminata Ba',
      passengerPhone: '+221 78 000 00 02',
      fromStopId: createdStops[0].id,
      toStopId: createdStops[6].id,
      fromZoneId: zone1.id,
      toZoneId: zone3.id,
      lineId: createdLines[1].id,
      price: 300,
      amountPaid: 300,
      changeGiven: 0,
      paymentMethod: 'mobile',
      validFrom: now,
      validTo,
      soldById: operator2.id,
      status: 'VALID' as const,
    },
    {
      type: 'UNIT' as const,
      ticketNumber: 'TK-20250101-0003',
      passengerName: 'Moussa Diop',
      passengerPhone: '+221 76 000 00 03',
      fromStopId: createdStops[0].id,
      toStopId: createdStops[9].id,
      fromZoneId: zone1.id,
      toZoneId: zone4.id,
      lineId: createdLines[2].id,
      price: 250,
      amountPaid: 500,
      changeGiven: 250,
      paymentMethod: 'cash',
      validFrom: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      validTo: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      soldById: operator1.id,
      status: 'EXPIRED' as const,
    },
  ];

  for (const td of sampleTickets) {
    const qrPayload = {
      tid: `tmp-${td.ticketNumber}`,
      typ: td.type as 'UNIT' | 'SUBSCRIPTION',
      zf: zone1.id,
      zt: zone2.id,
      exp: Math.floor(td.validTo.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000),
      ticketNumber: td.ticketNumber,
      fromStop: createdStops[0].code,
      toStop: createdStops[3].code,
      fromZone: zone1.code,
      toZone: zone2.code,
      passengerName: td.passengerName,
    };

    const qrString = generateQRToken(qrPayload);
    const [token, signature] = [qrString, ''];

    await db.ticket.create({
      data: {
        ...td,
        qrToken: token,
        qrSignature: signature,
      },
    });
  }

  console.log(`  ✅ 3 sample tickets created\n`);

  // =============================================
  // 9. SESSION DE CAISSE OUVERTE
  // =============================================
  console.log('💰 Creating open cash session...');

  const cashSession = await db.cashSession.create({
    data: {
      operatorId: operator1.id,
      date: now,
      status: 'OPEN',
      openingBalance: 50000,
      totalSales: 2,
      totalRevenue: 550,
    },
  });

  console.log(`  ✅ Open cash session created\n`);

  // =============================================
  // 10. CONTROLES DE TEST
  // =============================================
  console.log('📋 Creating sample controls...');

  await db.control.createMany({
    data: [
      {
        qrData: 'sample-qr-data-1',
        result: 'VALID',
        controllerId: controller1.id,
        scannedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        latitude: 14.6937,
        longitude: -17.4441,
      },
      {
        qrData: 'sample-qr-data-2',
        result: 'VALID',
        controllerId: controller1.id,
        scannedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        latitude: 14.7015,
        longitude: -17.4795,
      },
      {
        qrData: 'sample-qr-data-3',
        result: 'EXPIRED',
        reason: 'Ticket expiré depuis 1 heure',
        controllerId: controller2.id,
        scannedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        latitude: 14.6850,
        longitude: -17.4250,
      },
      {
        qrData: 'sample-qr-data-4',
        result: 'VALID',
        controllerId: controller2.id,
        scannedAt: new Date(now.getTime() - 30 * 60 * 1000),
        synced: false,
        latitude: 14.7170,
        longitude: -17.5030,
      },
    ],
  });

  console.log(`  ✅ 4 sample controls created\n`);

  // =============================================
  // 11. CONFIGURATION SYSTÈME
  // =============================================
  console.log('⚙️  Creating system config...');

  await db.systemConfig.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: 'SmartTicket Bus - Dakar' },
  });

  await db.systemConfig.upsert({
    where: { key: 'currency' },
    update: {},
    create: { key: 'currency', value: 'FCFA' },
  });

  await db.systemConfig.upsert({
    where: { key: 'ticket_validity_hours' },
    update: {},
    create: { key: 'ticket_validity_hours', value: '3' },
  });

  await db.systemConfig.upsert({
    where: { key: 'subscription_default_days' },
    update: {},
    create: { key: 'subscription_default_days', value: '30' },
  });

  console.log(`  ✅ System config created\n`);

  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed completed successfully!');
  console.log('═══════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log('  • 5 Users (1 admin, 2 operators, 2 controllers)');
  console.log('  • 5 Zones (01-05)');
  console.log('  • 15 Fares');
  console.log('  • 15 Stops');
  console.log('  • 6 Lines');
  console.log('  • 25 Line-Stop relations');
  console.log('  • 39 Schedules');
  console.log('  • 3 Sample Tickets');
  console.log('  • 1 Open Cash Session');
  console.log('  • 4 Sample Controls');
  console.log('  • 4 System Config entries');
  console.log('\n🔑 Test Accounts:');
  console.log('  • Superadmin: admin@smartticket.bus / Admin@123');
  console.log('  • Operator 1: guichet1@smartticket.bus / Oper@123');
  console.log('  • Operator 2: guichet2@smartticket.bus / Oper@123');
  console.log('  • Controller 1: control1@smartticket.bus / Control@123');
  console.log('  • Controller 2: control2@smartticket.bus / Control@123');

  await db.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed error:', e);
  process.exit(1);
});
