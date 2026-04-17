import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// POST /api/fares/calculate - Calculate price for a journey (all authenticated roles)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { fromZoneId, toZoneId } = body;

    // Validate required fields
    if (!fromZoneId || !toZoneId) {
      return NextResponse.json(
        { success: false, error: 'fromZoneId et toZoneId sont requis' },
        { status: 400 }
      );
    }

    // Validate that both zones exist
    const [fromZone, toZone] = await Promise.all([
      db.zone.findUnique({
        where: { id: fromZoneId },
        select: { id: true, code: true, name: true, isActive: true },
      }),
      db.zone.findUnique({
        where: { id: toZoneId },
        select: { id: true, code: true, name: true, isActive: true },
      }),
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

    // Look up the fare
    const fare = await db.fare.findFirst({
      where: {
        fromZoneId,
        toZoneId,
        isActive: true,
      },
    });

    if (fare) {
      return NextResponse.json({
        success: true,
        data: {
          fromZoneId,
          toZoneId,
          fromZoneName: fromZone.name,
          toZoneName: toZone.name,
          price: fare.price,
          fareId: fare.id,
          message: 'Tarif trouvé',
        },
      });
    }

    // No direct fare found
    return NextResponse.json({
      success: true,
      data: {
        fromZoneId,
        toZoneId,
        fromZoneName: fromZone.name,
        toZoneName: toZone.name,
        price: 0,
        fareId: null,
        message: 'Aucun tarif trouvé pour cette combinaison de zones',
      },
    });
  } catch (error) {
    console.error('Calculate fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR', 'CONTROLLER']);
