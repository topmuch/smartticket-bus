import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/v1/pricing/calculate - Calculate price between zones (no auth required for portal)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from_zone_id, to_zone_id } = body;

    // Also accept camelCase from frontend (transformRequestBody may not have converted yet)
    const fromZoneId = from_zone_id || body.fromZoneId;
    const toZoneId = to_zone_id || body.toZoneId;

    if (!fromZoneId || !toZoneId) {
      return NextResponse.json(
        { success: false, error: 'from_zone_id et to_zone_id sont requis' },
        { status: 400 }
      );
    }

    // Validate zones exist
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
        { success: false, error: "La zone de départ n'existe pas" },
        { status: 404 }
      );
    }

    if (!toZone) {
      return NextResponse.json(
        { success: false, error: "La zone d'arrivée n'existe pas" },
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
          id: fare.id,
          from_zone_id: fromZoneId,
          to_zone_id: toZoneId,
          from_zone_name: fromZone.name,
          to_zone_name: toZone.name,
          price: fare.price,
        },
      });
    }

    // No direct fare found — return 0 price
    return NextResponse.json({
      success: true,
      data: {
        id: null,
        from_zone_id: fromZoneId,
        to_zone_id: toZoneId,
        from_zone_name: fromZone.name,
        to_zone_name: toZone.name,
        price: 0,
      },
    });
  } catch (error) {
    console.error('Calculate fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
