import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma, DepartureDirection, DepartureStatus } from '@prisma/client';

// GET /api/departures — List departures with pagination & filters
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get('lineId');
    const direction = searchParams.get('direction');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const where: Prisma.DepartureWhereInput = {};

    if (lineId) where.lineId = lineId;

    if (direction && Object.values(DepartureDirection).includes(direction as DepartureDirection)) {
      where.direction = direction as DepartureDirection;
    }

    if (date) {
      // Validate YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: 'Format de date invalide (YYYY-MM-DD requis)' },
          { status: 400 }
        );
      }
      where.departureDate = date;
    }

    if (status && Object.values(DepartureStatus).includes(status as DepartureStatus)) {
      where.status = status as DepartureStatus;
    }

    const skip = (page - 1) * limit;

    const [departures, total] = await Promise.all([
      db.departure.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { departureDate: 'asc' },
          { scheduledTime: 'asc' },
        ],
        include: {
          line: {
            select: { id: true, number: true, name: true, color: true },
          },
          originStation: {
            select: { id: true, name: true, code: true },
          },
          destinationStation: {
            select: { id: true, name: true, code: true },
          },
          zone: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { tickets: true },
          },
        },
      }),
      db.departure.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: departures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List departures error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// POST /api/departures — Create a departure (SUPERADMIN only)
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const {
      lineId,
      direction,
      departureDate,
      scheduledTime,
      originStationId,
      destinationStationId,
      platform,
      maxSeats,
      price,
      zoneId,
      notes,
    } = body;

    // Validate required fields
    if (!lineId) {
      return NextResponse.json(
        { success: false, error: 'lineId est requis' },
        { status: 400 }
      );
    }

    if (!direction || !Object.values(DepartureDirection).includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'direction doit être ALLER ou RETOUR' },
        { status: 400 }
      );
    }

    if (!departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return NextResponse.json(
        { success: false, error: 'departureDate requis au format YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (!scheduledTime || !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return NextResponse.json(
        { success: false, error: 'scheduledTime requis au format HH:mm' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || price < 0) {
      return NextResponse.json(
        { success: false, error: 'price est requis et doit être positif' },
        { status: 400 }
      );
    }

    // Verify the line exists
    const lineExists = await db.line.findUnique({
      where: { id: lineId },
      select: { id: true },
    });

    if (!lineExists) {
      return NextResponse.json(
        { success: false, error: 'Ligne introuvable' },
        { status: 404 }
      );
    }

    // Optional: verify stations exist
    if (originStationId) {
      const stationExists = await db.stop.findUnique({
        where: { id: originStationId },
        select: { id: true },
      });
      if (!stationExists) {
        return NextResponse.json(
          { success: false, error: 'Gare d\'origine introuvable' },
          { status: 404 }
        );
      }
    }

    if (destinationStationId) {
      const stationExists = await db.stop.findUnique({
        where: { id: destinationStationId },
        select: { id: true },
      });
      if (!stationExists) {
        return NextResponse.json(
          { success: false, error: 'Gare de destination introuvable' },
          { status: 404 }
        );
      }
    }

    const seats = maxSeats && maxSeats > 0 ? maxSeats : 45;

    // Create the departure (availableSeats = maxSeats)
    const departure = await db.departure.create({
      data: {
        lineId,
        direction: direction as DepartureDirection,
        departureDate,
        scheduledTime,
        originStationId: originStationId || null,
        destinationStationId: destinationStationId || null,
        platform: platform || null,
        maxSeats: seats,
        availableSeats: seats,
        price: Number(price),
        zoneId: zoneId || null,
        notes: notes || null,
      },
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
        originStation: {
          select: { id: true, name: true, code: true },
        },
        destinationStation: {
          select: { id: true, name: true, code: true },
        },
        zone: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Departure',
        entityId: departure.id,
        details: JSON.stringify({
          lineId,
          direction,
          departureDate,
          scheduledTime,
          maxSeats: seats,
          price: Number(price),
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: departure }, { status: 201 });
  } catch (error: any) {
    console.error('Create departure error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Un départ existe déjà pour cette ligne, direction, date et heure',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
