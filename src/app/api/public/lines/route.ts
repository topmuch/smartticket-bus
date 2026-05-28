import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/lines - Public lines list (NO AUTH REQUIRED)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lineId = searchParams.get('lineId');

    if (lineId) {
      // Get specific line details with stops
      const line = await db.line.findUnique({
        where: { id: lineId, isActive: true },
        include: {
          lineStops: {
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
          },
          schedules: {
            where: { isActive: true },
            orderBy: { startTime: 'asc' },
          },
        },
      });

      if (!line) {
        return NextResponse.json(
          { success: false, error: 'Ligne non trouvée' },
          { status: 404 }
        );
      }

      // Extract unique ordered stops
      const stopsMap = new Map<string, {
        id: string;
        name: string;
        code: string;
        order: number;
        zone: { id: string; name: string; code: string; color: string } | null;
      }>();

      for (const ls of line.lineStops) {
        const fromKey = ls.fromStopId;
        if (!stopsMap.has(fromKey) || ls.order < (stopsMap.get(fromKey)?.order ?? Infinity)) {
          stopsMap.set(fromKey, {
            id: ls.fromStop.id,
            name: ls.fromStop.name,
            code: ls.fromStop.code,
            order: ls.order,
            zone: ls.fromStop.zone
              ? { id: ls.fromStop.zone.id, name: ls.fromStop.zone.name, code: ls.fromStop.zone.code, color: ls.fromStop.zone.color }
              : null,
          });
        }
        // Also add the toStop of last segment
        if (ls.direction === 'forward') {
          const toKey = ls.toStopId;
          if (!stopsMap.has(toKey)) {
            stopsMap.set(toKey, {
              id: ls.toStop.id,
              name: ls.toStop.name,
              code: ls.toStop.code,
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
        data: {
          id: line.id,
          number: line.number,
          name: line.name,
          color: line.color,
          stops,
          schedules: line.schedules,
        },
      });
    }

    // Get all active lines with basic info
    const lines = await db.line.findMany({
      where: { isActive: true },
      include: {
        lineStops: {
          include: {
            fromStop: {
              include: {
                zone: { select: { id: true, name: true, code: true, color: true } },
              },
            },
          },
          orderBy: [{ direction: 'asc' }, { order: 'asc' }],
          take: 1, // Just to know if line has stops
        },
        _count: {
          select: {
            lineStops: true,
            schedules: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    const linesData = lines.map(line => ({
      id: line.id,
      number: line.number,
      name: line.name,
      color: line.color,
      stopsCount: line._count.lineStops,
      schedulesCount: line._count.schedules,
    }));

    return NextResponse.json({
      success: true,
      data: linesData,
    });
  } catch (error) {
    console.error('Error getting public lines:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des lignes' },
      { status: 500 }
    );
  }
}
