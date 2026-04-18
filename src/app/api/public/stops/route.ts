import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/stops - Public stops list (NO AUTH REQUIRED)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const zoneId = searchParams.get('zoneId');
    const search = searchParams.get('search');
    const lineId = searchParams.get('lineId');

    if (lineId) {
      // Return stops on a specific line, ordered
      const lineStops = await db.lineStop.findMany({
        where: { lineId, line: { isActive: true } },
        include: {
          fromStop: {
            include: {
              zone: { select: { id: true, name: true, code: true, color: true } },
            },
          },
          toStop: {
            include: {
              zone: { select: { id: true, name: true, code: true, color: true } },
            },
          },
        },
        orderBy: [{ direction: 'asc' }, { order: 'asc' }],
      });

      // Collect unique stops in order
      const stopsMap = new Map<string, {
        id: string;
        name: string;
        code: string;
        latitude: number | null;
        longitude: number | null;
        order: number;
        zone: { id: string; name: string; code: string; color: string } | null;
      }>();

      for (const ls of lineStops) {
        // Add from stop
        const fromKey = ls.fromStopId;
        if (!stopsMap.has(fromKey) || ls.order < (stopsMap.get(fromKey)?.order ?? Infinity)) {
          stopsMap.set(fromKey, {
            id: ls.fromStop.id,
            name: ls.fromStop.name,
            code: ls.fromStop.code,
            latitude: ls.fromStop.latitude,
            longitude: ls.fromStop.longitude,
            order: ls.order,
            zone: ls.fromStop.zone
              ? { id: ls.fromStop.zone.id, name: ls.fromStop.zone.name, code: ls.fromStop.zone.code, color: ls.fromStop.zone.color }
              : null,
          });
        }
        // Add to stop for last segment
        if (ls.direction === 'forward') {
          const toKey = ls.toStopId;
          if (!stopsMap.has(toKey)) {
            stopsMap.set(toKey, {
              id: ls.toStop.id,
              name: ls.toStop.name,
              code: ls.toStop.code,
              latitude: ls.toStop.latitude,
              longitude: ls.toStop.longitude,
              order: ls.order + 1,
              zone: ls.toStop.zone
                ? { id: ls.toStop.zone.id, name: ls.toStop.zone.name, code: ls.toStop.zone.code, color: ls.toStop.zone.color }
                : null,
            });
          }
        }
      }

      const stops = Array.from(stopsMap.values())
        .sort((a, b) => a.order - b.order)
        .map(({ order, ...rest }) => rest);

      return NextResponse.json({
        success: true,
        data: stops,
      });
    }

    // General stop listing with filters
    const where: Record<string, unknown> = { isActive: true };

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const stops = await db.stop.findMany({
      where,
      include: {
        zone: { select: { id: true, name: true, code: true, color: true } },
      },
      orderBy: { name: 'asc' },
    });

    const stopsData = stops.map(stop => ({
      id: stop.id,
      name: stop.name,
      code: stop.code,
      latitude: stop.latitude,
      longitude: stop.longitude,
      zone: stop.zone,
    }));

    return NextResponse.json({
      success: true,
      data: stopsData,
    });
  } catch (error) {
    console.error('Error getting public stops:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des arrêts' },
      { status: 500 }
    );
  }
}
