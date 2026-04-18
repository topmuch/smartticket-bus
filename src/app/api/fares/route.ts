import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/fares - List all fares (SUPERADMIN, OPERATOR, CONTROLLER)
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const fromZoneId = searchParams.get('fromZoneId');
    const toZoneId = searchParams.get('toZoneId');

    // Build where clause
    const where: Prisma.FareWhereInput = {};

    if (fromZoneId) {
      where.fromZoneId = fromZoneId;
    }

    if (toZoneId) {
      where.toZoneId = toZoneId;
    }

    const fares = await db.fare.findMany({
      where,
      include: {
        fromZone: {
          select: { id: true, code: true, name: true, color: true },
        },
        toZone: {
          select: { id: true, code: true, name: true, color: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: fares,
    });
  } catch (error) {
    console.error('List fares error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR', 'CONTROLLER']);

// POST /api/fares - Create fare (SUPERADMIN only)
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { fromZoneId, toZoneId, price, isActive } = body;

    // Validate required fields
    if (!fromZoneId || !toZoneId || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, error: 'fromZoneId, toZoneId et price sont requis' },
        { status: 400 }
      );
    }

    // Validate price is a positive number
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { success: false, error: 'Le prix doit être un nombre positif' },
        { status: 400 }
      );
    }

    // Validate that both zones exist
    const [fromZone, toZone] = await Promise.all([
      db.zone.findUnique({ where: { id: fromZoneId } }),
      db.zone.findUnique({ where: { id: toZoneId } }),
    ]);

    if (!fromZone) {
      return NextResponse.json(
        { success: false, error: 'La zone de départ n\'existe pas' },
        { status: 404 }
      );
    }

    if (!toZone) {
      return NextResponse.json(
        { success: false, error: 'La zone d\'arrivée n\'existe pas' },
        { status: 404 }
      );
    }

    // Check if fare already exists for this zone pair
    const existingFare = await db.fare.findUnique({
      where: {
        fromZoneId_toZoneId: {
          fromZoneId,
          toZoneId,
        },
      },
    });

    if (existingFare) {
      return NextResponse.json(
        { success: false, error: 'Un tarif existe déjà pour cette combinaison de zones' },
        { status: 409 }
      );
    }

    // Create fare
    const newFare = await db.fare.create({
      data: {
        fromZoneId,
        toZoneId,
        price: Math.round(price * 100) / 100, // Round to 2 decimal places
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        fromZone: {
          select: { id: true, code: true, name: true, color: true },
        },
        toZone: {
          select: { id: true, code: true, name: true, color: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Fare',
        entityId: newFare.id,
        details: JSON.stringify({
          fromZone: fromZone.name,
          toZone: toZone.name,
          price: newFare.price,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newFare,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
