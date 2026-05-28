import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { generateQRToken, QRPayload } from '@/lib/qr';

// POST /api/tickets/sell — Sell a ticket linked to a specific departure
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const {
      departureId,
      passengerName,
      passengerPhone,
      paymentMethod,
      amountPaid,
      cashSessionId,
    } = body;

    // ── 1. Validate required departureId ──
    if (!departureId) {
      return NextResponse.json(
        { success: false, error: 'Le champ departureId est requis' },
        { status: 400 }
      );
    }

    const departure = await db.departure.findUnique({
      where: { id: departureId },
      include: {
        line: { select: { id: true, name: true, number: true } },
        originStation: { select: { id: true, name: true, code: true } },
        destinationStation: { select: { id: true, name: true, code: true } },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ introuvable' },
        { status: 404 }
      );
    }

    // ── 2. Check departure status ──
    if (departure.status === 'DEPARTED') {
      return NextResponse.json(
        { success: false, error: 'Ce départ a déjà eu lieu — vente impossible' },
        { status: 400 }
      );
    }

    if (departure.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Ce départ a été annulé' },
        { status: 400 }
      );
    }

    // ── 3. Check available seats ──
    if (departure.availableSeats <= 0) {
      return NextResponse.json(
        { success: false, error: 'Complet — plus de places disponibles pour ce départ' },
        { status: 400 }
      );
    }

    // ── 4. Validate cash session ──
    if (!cashSessionId) {
      return NextResponse.json(
        { success: false, error: 'Le champ cashSessionId est requis' },
        { status: 400 }
      );
    }

    const cashSession = await db.cashSession.findUnique({
      where: { id: cashSessionId },
    });

    if (!cashSession) {
      return NextResponse.json(
        { success: false, error: 'Session de caisse introuvable' },
        { status: 400 }
      );
    }

    if (cashSession.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'La session de caisse est déjà fermée' },
        { status: 400 }
      );
    }

    // ── 5. Get departure price ──
    const price = departure.price;

    // Validate amountPaid
    if (amountPaid === undefined || amountPaid < 0) {
      return NextResponse.json(
        { success: false, error: 'Montant payé invalide' },
        { status: 400 }
      );
    }

    // ── 6. Generate sequential ticket number TK-YYYYMMDD-XXXX ──
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TK-${dateStr}-`;

    const lastTicket = await db.ticket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    let seq = 1;
    if (lastTicket) {
      const lastSeq = parseInt(lastTicket.ticketNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
    const ticketNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    // ── 8. Set validity dates ──
    const validFrom = new Date();
    // validTo = departure date + 1 day at 23:59:59
    const departureDateObj = new Date(departure.departureDate + 'T00:00:00.000Z');
    departureDateObj.setDate(departureDateObj.getDate() + 1);
    departureDateObj.setHours(23, 59, 59, 0);
    const validTo = departureDateObj;

    // Calculate change
    const changeGiven = Math.max(0, amountPaid - price);

    // ── 9. Create ticket record ──
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        passengerName: passengerName || null,
        passengerPhone: passengerPhone || null,
        departureId,
        fromStopId: departure.originStationId || null,
        toStopId: departure.destinationStationId || null,
        lineId: departure.lineId,
        price,
        validFrom,
        validTo,
        soldById: user.userId,
        cashSessionId,
        amountPaid,
        changeGiven,
        paymentMethod: paymentMethod || 'cash',
        qrToken: '',       // placeholder — updated after QR generation
        qrSignature: '',   // placeholder
      },
      include: {
        soldBy: { select: { id: true, name: true, email: true } },
        departure: {
          include: {
            line: { select: { id: true, name: true, number: true } },
            originStation: { select: { id: true, name: true, code: true } },
            destinationStation: { select: { id: true, name: true, code: true } },
          },
        },
        fromStop: { select: { id: true, name: true, code: true } },
        toStop: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, number: true } },
      },
    });

    // ── 7. Generate QR token ──
    const qrPayload: QRPayload = {
      tid: ticket.id,
      typ: 'UNIT',
      departureId: departureId,
      lineId: departure.lineId,
      scheduledTime: departure.scheduledTime,
      departureDate: departure.departureDate,
      passengerName: passengerName || undefined,
      validFrom: Math.floor(validFrom.getTime() / 1000),
      validTo: Math.floor(validTo.getTime() / 1000),
      exp: Math.floor(validTo.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
      ticketNumber: ticket.ticketNumber,
      fromStop: departure.originStation?.name,
      toStop: departure.destinationStation?.name,
    };

    const jwtString = generateQRToken(qrPayload);

    // Update ticket with QR data
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        qrToken: jwtString,
        qrSignature: '',
      },
    });

    // ── 10. Atomic decrement availableSeats ──
    await db.departure.update({
      where: { id: departureId },
      data: { availableSeats: { decrement: 1 } },
    });

    // ── 11. Update cash session ──
    await db.cashSession.update({
      where: { id: cashSessionId },
      data: {
        totalSales: { increment: 1 },
        totalRevenue: { increment: price },
      },
    });

    // ── 12. Create audit log ──
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'SELL_TICKET',
        entity: 'Ticket',
        entityId: ticket.id,
        details: JSON.stringify({
          ticketNumber,
          departureId,
          lineId: departure.lineId,
          lineName: departure.line.name,
          direction: departure.direction,
          departureDate: departure.departureDate,
          scheduledTime: departure.scheduledTime,
          price,
          amountPaid,
          paymentMethod: paymentMethod || 'cash',
          cashSessionId,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    // ── 13. Return ticket data ──
    return NextResponse.json(
      {
        success: true,
        data: {
          ...ticket,
          qrToken: jwtString,
          qrSignature: '',
          qrString: jwtString,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error selling ticket:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Conflit de numéro de ticket' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vente du ticket' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
