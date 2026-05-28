import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/stops - List all active stops with zone info (no auth required)
export async function GET() {
  try {
    const stops = await db.stop.findMany({
      where: { isActive: true },
      include: {
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Return snake_case to match what transformResponse expects
    const data = stops.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      zone_id: s.zoneId,
      zone_name: s.zone.name,
      zone_code: s.zone.code,
      zone_color: s.zone.color,
      latitude: s.latitude,
      longitude: s.longitude,
      is_active: s.isActive ? 1 : 0,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List stops error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
