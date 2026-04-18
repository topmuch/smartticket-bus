import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { generateQRToken, QRPayload } from '@/lib/qr';
import { Prisma } from '@prisma/client';

// GET /api/tickets - List tickets with filters
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const soldById = searchParams.get('soldById');
    const lineId = searchParams.get('lineId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Prisma.TicketWhereInput = {};

    if (status) {
      where.status = status as any;
    }
    if (type) {
      where.type = type as any;
    }
    if (soldById) {
      where.soldById = soldById;
    }
    if (lineId) {
      where.lineId = lineId;
    }
    if (from || to) {
      where.soldAt = {};
      if (from) {
        (where.soldAt as any).gte = new Date(from);
      }
      if (to) {
        (where.soldAt as any).lte = new Date(to + 'T23:59:59.999Z');
      }
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { soldAt: 'desc' },
        include: {
          soldBy: {
            select: { id: true, name: true, email: true },
          },
          fromZone: {
            select: { id: true, name: true, code: true },
          },
          toZone: {
            select: { id: true, name: true, code: true },
          },
          fromStop: {
            select: { id: true, name: true, code: true },
          },
          toStop: {
            select: { id: true, name: true, code: true },
          },
          line: {
            select: { id: true, name: true, number: true },
          },
        },
      }),
      db.ticket.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Error listing tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des tickets' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// POST /api/tickets - Create/Sell a ticket
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();

    const {
      type,
      passengerName,
      passengerPhone,
      fromStopId,
      toStopId,
      fromZoneId,
      toZoneId,
      lineId,
      price,
      amountPaid,
      paymentMethod,
      cashSessionId,
      subscriptionData,
    } = body;

    // Validate required fields
    if (!type || !['UNIT', 'SUBSCRIPTION'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type de ticket invalide (UNIT ou SUBSCRIPTION requis)' },
        { status: 400 }
      );
    }

    if (!price || price < 0) {
      return NextResponse.json(
        { success: false, error: 'Prix invalide' },
        { status: 400 }
      );
    }

    if (amountPaid === undefined || amountPaid < 0) {
      return NextResponse.json(
        { success: false, error: 'Montant payé invalide' },
        { status: 400 }
      );
    }

    if (type === 'SUBSCRIPTION' && !passengerName) {
      return NextResponse.json(
        { success: false, error: 'Le nom du passager est obligatoire pour un abonnement' },
        { status: 400 }
      );
    }

    // Validate cash session if provided
    if (cashSessionId) {
      const cashSession = await db.cashSession.findUnique({
        where: { id: cashSessionId },
      });
      if (!cashSession) {
        return NextResponse.json(
          { success: false, error: 'Session de caisse introuvable' },
          { status: 400 }
        );
      }
      if (cashSession.status === 'CLOSED') {
        return NextResponse.json(
          { success: false, error: 'La session de caisse est déjà fermée' },
          { status: 400 }
        );
      }
    }

    // Generate sequential ticket number: TK-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TK-${dateStr}-`;

    // Find the last ticket with today's date prefix to get the next sequence
    const lastTicket = await db.ticket.findFirst({
      where: {
        ticketNumber: { startsWith: prefix },
      },
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

    // Calculate change
    const changeGiven = Math.max(0, amountPaid - price);

    // Set validity dates
    const validFrom = new Date();
    let validTo: Date;

    if (type === 'UNIT') {
      validTo = new Date(validFrom.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    } else {
      // SUBSCRIPTION
      const durationDays = subscriptionData?.durationDays || 30;
      validTo = new Date(validFrom.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // Get zone and stop names for QR payload
    let fromZoneName: string | undefined;
    let toZoneName: string | undefined;
    let fromStopName: string | undefined;
    let toStopName: string | undefined;

    if (fromZoneId) {
      const zone = await db.zone.findUnique({ where: { id: fromZoneId }, select: { name: true } });
      fromZoneName = zone?.name;
    }
    if (toZoneId) {
      const zone = await db.zone.findUnique({ where: { id: toZoneId }, select: { name: true } });
      toZoneName = zone?.name;
    }
    if (fromStopId) {
      const stop = await db.stop.findUnique({ where: { id: fromStopId }, select: { name: true } });
      fromStopName = stop?.name;
    }
    if (toStopId) {
      const stop = await db.stop.findUnique({ where: { id: toStopId }, select: { name: true } });
      toStopName = stop?.name;
    }

    // Create ticket in DB first to get the ID
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        type: type as any,
        passengerName: passengerName || null,
        passengerPhone: passengerPhone || null,
        fromStopId: fromStopId || null,
        toStopId: toStopId || null,
        fromZoneId: fromZoneId || null,
        toZoneId: toZoneId || null,
        lineId: lineId || null,
        price,
        validFrom,
        validTo,
        soldById: user.userId,
        cashSessionId: cashSessionId || null,
        amountPaid,
        changeGiven,
        paymentMethod: paymentMethod || 'cash',
        qrToken: '', // placeholder, will update below
        qrSignature: '', // placeholder
      },
      include: {
        soldBy: {
          select: { id: true, name: true, email: true },
        },
        fromZone: { select: { id: true, name: true, code: true } },
        toZone: { select: { id: true, name: true, code: true } },
        fromStop: { select: { id: true, name: true, code: true } },
        toStop: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, number: true } },
      },
    });

    // Generate QR payload with short keys (JWT)
    const qrPayload: QRPayload = {
      tid: ticket.id,
      typ: ticket.type as 'UNIT' | 'SUBSCRIPTION',
      zf: fromZoneId || undefined,
      zt: toZoneId || undefined,
      exp: Math.floor(validTo.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
      // Human-readable fields for display
      ticketNumber: ticket.ticketNumber,
      passengerName: passengerName || undefined,
      fromStop: fromStopName,
      toStop: toStopName,
      fromZone: fromZoneName,
      toZone: toZoneName,
    };

    const jwtString = generateQRToken(qrPayload);

    // Update ticket with QR data (JWT stored as qrToken, signature field empty)
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        qrToken: jwtString,
        qrSignature: '',
      },
    });

    // Create subscription if type is SUBSCRIPTION
    if (type === 'SUBSCRIPTION' && subscriptionData) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (subscriptionData.durationDays || 30) * 24 * 60 * 60 * 1000);

      await db.subscription.create({
        data: {
          ticketId: ticket.id,
          passengerName: passengerName!,
          passengerPhone: subscriptionData.passengerPhone || passengerPhone || '',
          passengerPhoto: subscriptionData.passengerPhoto || null,
          zoneId: subscriptionData.zoneId || null,
          durationDays: subscriptionData.durationDays || 30,
          startDate,
          endDate,
          isActive: true,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'SELL_TICKET',
        entity: 'Ticket',
        entityId: ticket.id,
        details: JSON.stringify({
          ticketNumber,
          type,
          price,
          amountPaid,
          paymentMethod: paymentMethod || 'cash',
          cashSessionId: cashSessionId || null,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        qrToken: jwtString,
        qrSignature: '',
        qrString: jwtString,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Conflit de numéro de ticket' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du ticket' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
