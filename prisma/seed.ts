import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { generateQRToken } from '../src/lib/qr';

// ================================================================
// SmartTicket Bus — Seed v2 (Regional Fixed-Departure Model)
// Replaces frequency-based Schedule model with Departure model.
// No more Subscription model or TicketType enum.
// ================================================================

async function seed() {
  console.log('🌱 Seeding SmartTicket Bus database (Regional v2)...\n');

  // =============================================
  // 1. UTILISATEURS (5 users)
  // =============================================
  console.log('📋 Creating users...');

  const pwd = await hashPassword('admin123');

  const superadmin = await db.user.upsert({
    where: { email: 'admin@smartticket.bus' },
    update: {},
    create: {
      email: 'admin@smartticket.bus',
      passwordHash: pwd,
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
      passwordHash: pwd,
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
      passwordHash: pwd,
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
      passwordHash: pwd,
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
      passwordHash: pwd,
      name: 'Fatou Sow',
      role: 'CONTROLLER',
      isActive: true,
      phone: '+221 76 789 00 01',
    },
  });

  console.log('  ✅ 5 users created (1 superadmin, 2 operators, 2 controllers)\n');

  // =============================================
  // 2. ZONES (5 zones)
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
      description: "Quartiers est: Liberté, Grand Yoff, Patte d'Oie",
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

  console.log('  ✅ 5 zones created\n');

  // =============================================
  // 3. TARIFS (15 fares — all zone pairs)
  // =============================================
  console.log('💰 Creating fares...');

  const fareData = [
    { from: zone1.id, to: zone1.id, price: 150 },
    { from: zone2.id, to: zone2.id, price: 150 },
    { from: zone3.id, to: zone3.id, price: 150 },
    { from: zone4.id, to: zone4.id, price: 150 },
    { from: zone5.id, to: zone5.id, price: 150 },
    { from: zone1.id, to: zone2.id, price: 250 },
    { from: zone1.id, to: zone3.id, price: 300 },
    { from: zone1.id, to: zone4.id, price: 250 },
    { from: zone1.id, to: zone5.id, price: 350 },
    { from: zone2.id, to: zone3.id, price: 300 },
    { from: zone2.id, to: zone4.id, price: 350 },
    { from: zone2.id, to: zone5.id, price: 400 },
    { from: zone3.id, to: zone4.id, price: 300 },
    { from: zone3.id, to: zone5.id, price: 350 },
    { from: zone4.id, to: zone5.id, price: 300 },
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

  console.log('  ✅ 15 fares created\n');

  // =============================================
  // 4. ARRETS (15 urban + 6 regional = 21 stops)
  // =============================================
  console.log('🚏 Creating stops...');

  const stopsData = [
    // ── Zone 01 — Centre-ville (indices 0–2) ──
    { name: 'Gare Routière',             code: 'ST001', zoneId: zone1.id, lat: 14.6937, lng: -17.4441 },
    { name: 'Marché Sandaga',            code: 'ST002', zoneId: zone1.id, lat: 14.6915, lng: -17.4395 },
    { name: "Place de l'Indépendance",    code: 'ST003', zoneId: zone1.id, lat: 14.6936, lng: -17.4448 },
    // ── Zone 02 — Nord (indices 3–5) ──
    { name: 'Université Cheikh Anta Diop', code: 'ST004', zoneId: zone2.id, lat: 14.7015, lng: -17.4795 },
    { name: 'Hôpital Aristide Le Dantec',  code: 'ST005', zoneId: zone2.id, lat: 14.6985, lng: -17.4745 },
    { name: 'Parcelles Assainies',         code: 'ST006', zoneId: zone2.id, lat: 14.7150, lng: -17.4650 },
    // ── Zone 03 — Est (indices 6–8) ──
    { name: 'Terminus Liberté',    code: 'ST007', zoneId: zone3.id, lat: 14.6850, lng: -17.4250 },
    { name: 'Grand Yoff',          code: 'ST008', zoneId: zone3.id, lat: 14.6800, lng: -17.4150 },
    { name: "Patte d'Oie",        code: 'ST009', zoneId: zone3.id, lat: 14.6875, lng: -17.4300 },
    // ── Zone 04 — Sud (indices 9–11) ──
    { name: 'Médina',     code: 'ST010', zoneId: zone4.id, lat: 14.6850, lng: -17.4500 },
    { name: 'Fann Hock',  code: 'ST011', zoneId: zone4.id, lat: 14.6780, lng: -17.4550 },
    { name: 'Bel Air',    code: 'ST012', zoneId: zone4.id, lat: 14.6700, lng: -17.4480 },
    // ── Zone 05 — Ouest (indices 12–14) ──
    { name: 'Ngor',    code: 'ST013', zoneId: zone5.id, lat: 14.7170, lng: -17.5030 },
    { name: 'Yoff',    code: 'ST014', zoneId: zone5.id, lat: 14.7350, lng: -17.4900 },
    { name: 'Ouakam',  code: 'ST015', zoneId: zone5.id, lat: 14.7000, lng: -17.4900 },
    // ── Regional stations (indices 15–20) ──
    { name: 'Dakar - Gare Routière',  code: 'ST100', zoneId: zone1.id, lat: 14.6937, lng: -17.4441 },
    { name: 'Thiès - Gare',           code: 'ST101', zoneId: zone2.id, lat: 14.7930, lng: -16.9260 },
    { name: 'Mbour - Terminal',       code: 'ST102', zoneId: zone3.id, lat: 14.4170, lng: -16.9590 },
    { name: 'Saint-Louis - Gare',     code: 'ST103', zoneId: zone2.id, lat: 16.4580, lng: -16.4550 },
    { name: 'Kaolack - Gare',         code: 'ST104', zoneId: zone4.id, lat: 14.1310, lng: -16.0730 },
    { name: 'Ziguinchor - Gare',      code: 'ST105', zoneId: zone5.id, lat: 12.5830, lng: -16.2710 },
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

  console.log(`  ✅ ${createdStops.length} stops created (15 urban + 6 regional)\n`);

  // =============================================
  // 5. LIGNES (6 urban + 3 regional = 9 lines)
  // =============================================
  console.log('🚌 Creating lines...');

  const linesData = [
    // ── Urban lines (indices 0–5) ──
    { number: 'L1',   name: 'Ligne Centre-Nord',          description: 'Gare Routière → Université via Hôpital et Parcelles Assainies',  color: '#16a34a' },
    { number: 'L2',   name: 'Ligne Centre-Est',           description: "Gare Routière → Grand Yoff via Patte d'Oie et Liberté",           color: '#2563eb' },
    { number: 'L3',   name: 'Ligne Centre-Sud',           description: 'Gare Routière → Bel Air via Médina et Fann Hock',                  color: '#d97706' },
    { number: 'L4',   name: 'Ligne Nord-Ouest',          description: 'Université → Yoff via Ouakam et Ngor',                            color: '#dc2626' },
    { number: 'L5',   name: 'Ligne Est-Sud',              description: 'Grand Yoff → Bel Air via Liberté et Médina',                        color: '#7c3aed' },
    { number: 'EXP1', name: 'Express Aéroport-Centre',    description: 'Liaison rapide Aéroport - Centre-ville',                           color: '#0891b2' },
    // ── Regional lines (indices 6–8) ──
    { number: 'L12',  name: 'Dakar ↔ Mbour',             description: 'Ligne régionale Dakar-Mbour (80 km)',  color: '#16a34a', originStation: 'Dakar - Gare Routière', destinationStation: 'Mbour - Terminal' },
    { number: 'L13',  name: 'Dakar ↔ Thiès',             description: 'Ligne régionale Dakar-Thiès (70 km)',   color: '#2563eb', originStation: 'Dakar - Gare Routière', destinationStation: 'Thiès - Gare' },
    { number: 'L14',  name: 'Dakar ↔ Saint-Louis',       description: 'Ligne régionale Dakar-Saint-Louis (260 km)', color: '#d97706', originStation: 'Dakar - Gare Routière', destinationStation: 'Saint-Louis - Gare' },
  ];

  const createdLines: any[] = [];
  for (const ld of linesData) {
    const line = await db.line.upsert({
      where: { number: ld.number },
      update: { description: ld.description },
      create: {
        number: ld.number,
        name: ld.name,
        description: ld.description,
        color: ld.color,
        isActive: true,
        originStation: (ld as any).originStation ?? null,
        destinationStation: (ld as any).destinationStation ?? null,
      },
    });
    createdLines.push(line);
  }

  console.log(`  ✅ ${createdLines.length} lines created (6 urban + 3 regional)\n`);

  // =============================================
  // 6. LIGNE-ARRETS (25 urban + 3 regional = 28)
  // =============================================
  console.log('🔗 Creating line-stop relationships...');

  const lineStopRelations = [
    // ── L1: Gare(0) → Marché(1) → Place(2) → Hôpital(4) → Université(3) → Parcelles(5) ──
    { lineIdx: 0,  fromIdx: 0,  toIdx: 1,  order: 1, duration: 5 },
    { lineIdx: 0,  fromIdx: 1,  toIdx: 2,  order: 2, duration: 3 },
    { lineIdx: 0,  fromIdx: 2,  toIdx: 4,  order: 3, duration: 10 },
    { lineIdx: 0,  fromIdx: 4,  toIdx: 3,  order: 4, duration: 8 },
    { lineIdx: 0,  fromIdx: 3,  toIdx: 5,  order: 5, duration: 7 },
    // ── L2: Gare(0) → Marché(1) → Patte d'Oie(8) → Liberté(6) → Grand Yoff(7) ──
    { lineIdx: 1,  fromIdx: 0,  toIdx: 1,  order: 1, duration: 5 },
    { lineIdx: 1,  fromIdx: 1,  toIdx: 8,  order: 2, duration: 8 },
    { lineIdx: 1,  fromIdx: 8,  toIdx: 6,  order: 3, duration: 7 },
    { lineIdx: 1,  fromIdx: 6,  toIdx: 7,  order: 4, duration: 10 },
    // ── L3: Gare(0) → Place(2) → Médina(9) → Fann(10) → Bel Air(11) ──
    { lineIdx: 2,  fromIdx: 0,  toIdx: 2,  order: 1, duration: 3 },
    { lineIdx: 2,  fromIdx: 2,  toIdx: 9,  order: 2, duration: 8 },
    { lineIdx: 2,  fromIdx: 9,  toIdx: 10, order: 3, duration: 5 },
    { lineIdx: 2,  fromIdx: 10, toIdx: 11, order: 4, duration: 7 },
    // ── L4: Université(3) → Hôpital(4) → Ouakam(14) → Ngor(12) → Yoff(13) ──
    { lineIdx: 3,  fromIdx: 3,  toIdx: 4,  order: 1, duration: 8 },
    { lineIdx: 3,  fromIdx: 4,  toIdx: 14, order: 2, duration: 10 },
    { lineIdx: 3,  fromIdx: 14, toIdx: 12, order: 3, duration: 8 },
    { lineIdx: 3,  fromIdx: 12, toIdx: 13, order: 4, duration: 6 },
    // ── L5: Grand Yoff(7) → Liberté(6) → Patte d'Oie(8) → Médina(9) → Bel Air(11) ──
    { lineIdx: 4,  fromIdx: 7,  toIdx: 6,  order: 1, duration: 10 },
    { lineIdx: 4,  fromIdx: 6,  toIdx: 8,  order: 2, duration: 7 },
    { lineIdx: 4,  fromIdx: 8,  toIdx: 9,  order: 3, duration: 10 },
    { lineIdx: 4,  fromIdx: 9,  toIdx: 11, order: 4, duration: 12 },
    // ── EXP1: Liberté(6) → Place(2) → Gare(0) ──
    { lineIdx: 5,  fromIdx: 6,  toIdx: 2,  order: 1, duration: 15 },
    { lineIdx: 5,  fromIdx: 2,  toIdx: 0,  order: 2, duration: 12 },
    // ── Regional: minimal stop relations ──
    // L12: Dakar Gare(15) → Mbour Terminal(17)
    { lineIdx: 6,  fromIdx: 15, toIdx: 17, order: 1, duration: 90 },
    // L13: Dakar Gare(15) → Thiès Gare(16)
    { lineIdx: 7,  fromIdx: 15, toIdx: 16, order: 1, duration: 70 },
    // L14: Dakar Gare(15) → Saint-Louis Gare(18)
    { lineIdx: 8,  fromIdx: 15, toIdx: 18, order: 1, duration: 240 },
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

  console.log(`  ✅ ${lineStopRelations.length} line-stop relations created\n`);

  // =============================================
  // 7. NO SCHEDULES — replaced by Departures
  // =============================================
  console.log('⏭️  Skipping schedules (replaced by Departures model)\n');

  // =============================================
  // 8. DEPARTURES — Today + Tomorrow for regional lines
  // =============================================
  console.log('🚀 Creating departures...');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Stop references (regional)
  const dakarStop  = createdStops[15]; // ST100
  const thiesStop  = createdStops[16]; // ST101
  const mbourStop  = createdStops[17]; // ST102
  const stlouisStop = createdStops[18]; // ST103

  // Line references (regional)
  const L12 = createdLines[6];
  const L13 = createdLines[7];
  const L14 = createdLines[8];

  // Zone reference for departures (Dakar zone = zone1)
  const dakarZone = zone1;

  type DepartureSpec = {
    lineId: any;
    direction: 'ALLER' | 'RETOUR';
    date: string;
    time: string;
    originId: any;
    destinationId: any;
    platform: string;
    status: 'SCHEDULED' | 'BOARDING' | 'DELAYED' | 'DEPARTED' | 'CANCELLED';
    delayMinutes: number;
    maxSeats: number;
    availableSeats: number;
    price: number;
    notes?: string;
  };

  const departuresSpec: DepartureSpec[] = [
    // ── L12 Dakar↔Mbour TODAY ──
    {
      lineId: L12.id, direction: 'ALLER', date: todayStr, time: '07:00',
      originId: dakarStop.id, destinationId: mbourStop.id,
      platform: 'Quai 2', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 38, price: 2500,
    },
    {
      lineId: L12.id, direction: 'ALLER', date: todayStr, time: '14:00',
      originId: dakarStop.id, destinationId: mbourStop.id,
      platform: 'Quai 2', status: 'BOARDING', delayMinutes: 0,
      maxSeats: 45, availableSeats: 12, price: 2500,
    },
    {
      lineId: L12.id, direction: 'RETOUR', date: todayStr, time: '09:00',
      originId: mbourStop.id, destinationId: dakarStop.id,
      platform: 'Quai 3', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 45, price: 2500,
    },
    {
      lineId: L12.id, direction: 'RETOUR', date: todayStr, time: '16:00',
      originId: mbourStop.id, destinationId: dakarStop.id,
      platform: 'Quai 3', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 30, price: 2500,
    },
    // ── L13 Dakar↔Thiès TODAY ──
    {
      lineId: L13.id, direction: 'ALLER', date: todayStr, time: '06:30',
      originId: dakarStop.id, destinationId: thiesStop.id,
      platform: 'Quai 5', status: 'DELAYED', delayMinutes: 15,
      maxSeats: 45, availableSeats: 20, price: 3500,
    },
    {
      lineId: L13.id, direction: 'RETOUR', date: todayStr, time: '17:00',
      originId: thiesStop.id, destinationId: dakarStop.id,
      platform: 'Quai 5', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 40, price: 3500,
    },
    // ── L14 Dakar↔Saint-Louis TODAY ──
    {
      lineId: L14.id, direction: 'ALLER', date: todayStr, time: '08:00',
      originId: dakarStop.id, destinationId: stlouisStop.id,
      platform: 'Quai 1', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 50, availableSeats: 35, price: 5000,
    },
    // ── L14 Dakar↔Saint-Louis TOMORROW ──
    {
      lineId: L14.id, direction: 'RETOUR', date: tomorrowStr, time: '07:00',
      originId: stlouisStop.id, destinationId: dakarStop.id,
      platform: 'Quai 1', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 50, availableSeats: 50, price: 5000,
    },
    // ── TOMORROW: L12 07:00 & 14:00 ALLER ──
    {
      lineId: L12.id, direction: 'ALLER', date: tomorrowStr, time: '07:00',
      originId: dakarStop.id, destinationId: mbourStop.id,
      platform: 'Quai 2', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 45, price: 2500,
    },
    {
      lineId: L12.id, direction: 'ALLER', date: tomorrowStr, time: '14:00',
      originId: dakarStop.id, destinationId: mbourStop.id,
      platform: 'Quai 2', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 45, price: 2500,
    },
    // ── TOMORROW: L13 06:30 ALLER ──
    {
      lineId: L13.id, direction: 'ALLER', date: tomorrowStr, time: '06:30',
      originId: dakarStop.id, destinationId: thiesStop.id,
      platform: 'Quai 5', status: 'SCHEDULED', delayMinutes: 0,
      maxSeats: 45, availableSeats: 45, price: 3500,
    },
  ];

  const createdDepartures: any[] = [];
  for (const spec of departuresSpec) {
    const departure = await db.departure.upsert({
      where: {
        lineId_direction_departureDate_scheduledTime: {
          lineId: spec.lineId,
          direction: spec.direction,
          departureDate: spec.date,
          scheduledTime: spec.time,
        },
      },
      update: {},
      create: {
        lineId: spec.lineId,
        direction: spec.direction,
        departureDate: spec.date,
        scheduledTime: spec.time,
        originStationId: spec.originId,
        destinationStationId: spec.destinationId,
        platform: spec.platform,
        status: spec.status,
        delayMinutes: spec.delayMinutes,
        maxSeats: spec.maxSeats,
        availableSeats: spec.availableSeats,
        price: spec.price,
        notes: spec.notes ?? null,
        zoneId: dakarZone.id,
      },
    });
    createdDepartures.push(departure);
  }

  console.log(`  ✅ ${createdDepartures.length} departures created\n`);

  // Shorthand references to specific departures for ticket creation
  const d_L12_07_ALLER_today    = createdDepartures[0];  // SCHEDULED
  const d_L12_14_ALLER_today    = createdDepartures[1];  // BOARDING
  const d_L12_09_RETOUR_today  = createdDepartures[2];  // SCHEDULED
  const d_L12_16_RETOUR_today  = createdDepartures[3];  // SCHEDULED
  const d_L13_0630_ALLER_today = createdDepartures[4];  // DELAYED
  const d_L13_17_RETOUR_today  = createdDepartures[5];  // SCHEDULED
  const d_L14_08_ALLER_today    = createdDepartures[6];  // SCHEDULED
  const d_L14_07_RETOUR_tom    = createdDepartures[7];  // SCHEDULED (tomorrow)

  // =============================================
  // 9. SESSION DE CAISSE OUVERTE (before tickets)
  // =============================================
  console.log('💰 Creating open cash session...');

  const now = new Date();

  const cashSession = await db.cashSession.create({
    data: {
      operatorId: operator1.id,
      date: now,
      status: 'OPEN',
      openingBalance: 50000,
      totalSales: 7,
      totalRevenue: 20500,
    },
  });

  console.log('  ✅ Open cash session created for operator1\n');

  // =============================================
  // 10. TICKETS (7 sample tickets linked to departures)
  // =============================================
  console.log('🎫 Creating sample tickets...');

  // Helper to build QR payload for a departure-linked ticket
  function buildQRPayload(departure: any, ticketNumber: string, passengerName: string | null) {
    const depDateTime = new Date(`${departure.departureDate}T${departure.scheduledTime}:00`);
    const validFrom = Math.floor(depDateTime.getTime() / 1000) - 1800; // 30 min before departure
    const validTo   = Math.floor(depDateTime.getTime() / 1000) + 3600 * 4; // 4 hours after departure

    const payload = {
      tid: `tmp-${ticketNumber}`,
      typ: 'UNIT' as const,
      exp: validTo,
      iat: Math.floor(now.getTime() / 1000),
      ticketNumber,
      passengerName: passengerName ?? undefined,
      departureId: departure.id,
      lineId: departure.lineId,
      scheduledTime: departure.scheduledTime,
      departureDate: departure.departureDate,
      validFrom,
      validTo,
    };
    return { payload, validFromSec: validFrom, validToSec: validTo };
  }

  type TicketSpec = {
    ticketNumber: string;
    passengerName: string;
    passengerPhone: string;
    departureId: string;
    fromStopId: string;
    toStopId: string;
    lineId: string;
    fromZoneId: string;
    toZoneId: string;
    price: number;
    amountPaid: number;
    changeGiven: number;
    paymentMethod: string;
    soldById: string;
    status: 'VALID' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'INVALID';
  };

  const ticketsSpec: TicketSpec[] = [
    {
      ticketNumber: 'TK-REG-0001',
      passengerName: 'Mamadou Diop',
      passengerPhone: '+221 77 111 22 33',
      departureId: d_L12_07_ALLER_today.id,
      fromStopId: dakarStop.id,
      toStopId: mbourStop.id,
      lineId: L12.id,
      fromZoneId: zone1.id,
      toZoneId: zone3.id,
      price: 2500,
      amountPaid: 3000,
      changeGiven: 500,
      paymentMethod: 'cash',
      soldById: operator1.id,
      status: 'VALID',
    },
    {
      ticketNumber: 'TK-REG-0002',
      passengerName: 'Aïssatou Ba',
      passengerPhone: '+221 78 222 33 44',
      departureId: d_L12_14_ALLER_today.id,
      fromStopId: dakarStop.id,
      toStopId: mbourStop.id,
      lineId: L12.id,
      fromZoneId: zone1.id,
      toZoneId: zone3.id,
      price: 2500,
      amountPaid: 2500,
      changeGiven: 0,
      paymentMethod: 'mobile',
      soldById: operator2.id,
      status: 'VALID',
    },
    {
      ticketNumber: 'TK-REG-0003',
      passengerName: 'Ibrahima Sow',
      passengerPhone: '+221 76 333 44 55',
      departureId: d_L12_09_RETOUR_today.id,
      fromStopId: mbourStop.id,
      toStopId: dakarStop.id,
      lineId: L12.id,
      fromZoneId: zone3.id,
      toZoneId: zone1.id,
      price: 2500,
      amountPaid: 3000,
      changeGiven: 500,
      paymentMethod: 'cash',
      soldById: operator1.id,
      status: 'USED',
    },
    {
      ticketNumber: 'TK-REG-0004',
      passengerName: 'Fatou Ndiaye',
      passengerPhone: '+221 77 444 55 66',
      departureId: d_L13_0630_ALLER_today.id,
      fromStopId: dakarStop.id,
      toStopId: thiesStop.id,
      lineId: L13.id,
      fromZoneId: zone1.id,
      toZoneId: zone2.id,
      price: 3500,
      amountPaid: 5000,
      changeGiven: 1500,
      paymentMethod: 'cash',
      soldById: operator1.id,
      status: 'VALID',
    },
    {
      ticketNumber: 'TK-REG-0005',
      passengerName: 'Cheikh Mbaye',
      passengerPhone: '+221 78 555 66 77',
      departureId: d_L14_08_ALLER_today.id,
      fromStopId: dakarStop.id,
      toStopId: stlouisStop.id,
      lineId: L14.id,
      fromZoneId: zone1.id,
      toZoneId: zone2.id,
      price: 5000,
      amountPaid: 5000,
      changeGiven: 0,
      paymentMethod: 'cash',
      soldById: operator2.id,
      status: 'VALID',
    },
    {
      ticketNumber: 'TK-REG-0006',
      passengerName: 'Aminata Fall',
      passengerPhone: '+221 76 666 77 88',
      departureId: d_L12_07_ALLER_today.id, // reuse the same departure reference (tomorrow copy)
      fromStopId: dakarStop.id,
      toStopId: mbourStop.id,
      lineId: L12.id,
      fromZoneId: zone1.id,
      toZoneId: zone3.id,
      price: 2500,
      amountPaid: 2500,
      changeGiven: 0,
      paymentMethod: 'mobile',
      soldById: operator1.id,
      status: 'VALID',
    },
    {
      ticketNumber: 'TK-REG-0007',
      passengerName: 'Ousmane Dieng',
      passengerPhone: '+221 77 777 88 99',
      departureId: d_L13_17_RETOUR_today.id,
      fromStopId: thiesStop.id,
      toStopId: dakarStop.id,
      lineId: L13.id,
      fromZoneId: zone2.id,
      toZoneId: zone1.id,
      price: 3500,
      amountPaid: 4000,
      changeGiven: 500,
      paymentMethod: 'cash',
      soldById: operator1.id,
      status: 'USED',
    },
  ];

  // Create a lookup map for departures by ID
  const departureMap = new Map(createdDepartures.map((d: any) => [d.id, d]));

  for (const ts of ticketsSpec) {
    const departure = departureMap.get(ts.departureId);
    if (!departure) {
      console.error(`  ❌ Departure ${ts.departureId} not found for ticket ${ts.ticketNumber}`);
      continue;
    }

    const { payload, validFromSec, validToSec } = buildQRPayload(departure, ts.ticketNumber, ts.passengerName);

    const token = generateQRToken(payload);
    // For the qrSignature, we store a short hash of the token
    const sig = token.slice(-16);

    await db.ticket.upsert({
      where: { ticketNumber: ts.ticketNumber },
      update: {},
      create: {
        ticketNumber: ts.ticketNumber,
        status: ts.status,
        passengerName: ts.passengerName,
        passengerPhone: ts.passengerPhone,
        departureId: ts.departureId,
        fromStopId: ts.fromStopId,
        toStopId: ts.toStopId,
        fromZoneId: ts.fromZoneId,
        toZoneId: ts.toZoneId,
        lineId: ts.lineId,
        price: ts.price,
        qrToken: token,
        qrSignature: sig,
        validFrom: new Date(validFromSec * 1000),
        validTo: new Date(validToSec * 1000),
        soldById: ts.soldById,
        cashSessionId: cashSession.id,
        amountPaid: ts.amountPaid,
        changeGiven: ts.changeGiven,
        paymentMethod: ts.paymentMethod,
      },
    });
  }

  console.log(`  ✅ ${ticketsSpec.length} sample tickets created (departure-linked)\n`);

  // =============================================
  // 11. CONTROLES (4 sample controls)
  // =============================================
  console.log('📋 Creating sample controls...');

  await db.control.createMany({
    data: [
      {
        qrData: 'sample-qr-data-regional-1',
        result: 'VALID',
        controllerId: controller1.id,
        scannedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        latitude: 14.6937,
        longitude: -17.4441,
      },
      {
        qrData: 'sample-qr-data-regional-2',
        result: 'VALID',
        controllerId: controller1.id,
        scannedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        latitude: 14.7930,
        longitude: -16.9260,
      },
      {
        qrData: 'sample-qr-data-regional-3',
        result: 'ALREADY_USED',
        reason: 'Ticket déjà utilisé lors du contrôle précédent',
        controllerId: controller2.id,
        scannedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        synced: true,
        syncedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        latitude: 14.4170,
        longitude: -16.9590,
      },
      {
        qrData: 'sample-qr-data-regional-4',
        result: 'VALID',
        controllerId: controller2.id,
        scannedAt: new Date(now.getTime() - 30 * 60 * 1000),
        synced: false,
        latitude: 16.4580,
        longitude: -16.4550,
      },
    ],
  });

  console.log('  ✅ 4 sample controls created\n');

  // =============================================
  // 12. CONFIGURATION SYSTÈME
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

  // Replace subscription_default_days with departure_max_default
  // First delete the old key if it exists
  const deleted = await db.systemConfig.deleteMany({
    where: { key: 'subscription_default_days' },
  });
  if (deleted.count > 0) {
    console.log('  ℹ️  Removed old subscription_default_days config');
  }

  await db.systemConfig.upsert({
    where: { key: 'departure_max_default' },
    update: {},
    create: { key: 'departure_max_default', value: '45' },
  });

  console.log('  ✅ System config created (with departure_max_default)\n');

  // =============================================
  // SUMMARY
  // =============================================
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Seed completed successfully!');
  console.log('═══════════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log('  • 5 Users (1 superadmin, 2 operators, 2 controllers)');
  console.log('  • 5 Zones (01–05)');
  console.log('  • 15 Fares');
  console.log('  • 21 Stops (15 urban + 6 regional)');
  console.log('  • 9 Lines (6 urban + 3 regional)');
  console.log(`  • ${lineStopRelations.length} Line-Stop relations`);
  console.log(`  • ${createdDepartures.length} Departures (today & tomorrow, regional)`);
  console.log(`  • ${ticketsSpec.length} Sample Tickets (departure-linked)`);
  console.log('  • 1 Open Cash Session');
  console.log('  • 4 Sample Controls');
  console.log('  • 4 System Config entries (departure_max_default = 45)');
  console.log('\n🔑 Test Accounts:');
  console.log('  • Superadmin: admin@smartticket.bus / admin123');
  console.log('  • Operator 1: guichet1@smartticket.bus / admin123');
  console.log('  • Operator 2: guichet2@smartticket.bus / admin123');
  console.log('  • Controller 1: control1@smartticket.bus / admin123');
  console.log('  • Controller 2: control2@smartticket.bus / admin123');
  console.log('\n🚌 Regional Lines:');
  console.log('  • L12: Dakar ↔ Mbour (2500 F)');
  console.log('  • L13: Dakar ↔ Thiès (3500 F)');
  console.log('  • L14: Dakar ↔ Saint-Louis (5000 F)');
  console.log(`\n📅 Today: ${todayStr}`);
  console.log(`📅 Tomorrow: ${tomorrowStr}`);

  await db.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed error:', e);
  process.exit(1);
});
