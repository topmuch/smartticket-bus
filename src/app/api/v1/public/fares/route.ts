import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/public/fares - List all active fares with zone info (no auth required)
export async function GET() {
  try {
    const fares = await db.fare.findMany({
      where: { isActive: true },
      include: {
        fromZone: {
          select: { id: true, name: true, code: true, color: true },
        },
        toZone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
      orderBy: [{ fromZoneId: 'asc' }, { toZoneId: 'asc' }],
    });

    // Return snake_case to match what transformResponse expects
    const data = fares.map((f) => ({
      id: f.id,
      from_zone_id: f.fromZoneId,
      to_zone_id: f.toZoneId,
      from_zone_name: f.fromZone.name,
      from_zone_code: f.fromZone.code,
      from_zone_color: f.fromZone.color,
      to_zone_name: f.toZone.name,
      to_zone_code: f.toZone.code,
      to_zone_color: f.toZone.color,
      price: f.price,
      ticket_type: f.ticketType,
      is_active: f.isActive ? 1 : 0,
      created_at: f.createdAt.toISOString(),
      updated_at: f.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List fares error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
