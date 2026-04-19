import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/lines/[id] - Line detail with stops and schedules (no auth required)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const line = await db.line.findUnique({
      where: { id },
      include: {
        lineStops: {
          include: {
            fromStop: {
              include: { zone: true },
            },
            toStop: {
              include: { zone: true },
            },
          },
          orderBy: [{ direction: 'asc' }, { order: 'asc' }],
        },
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!line) {
      return NextResponse.json(
        { success: false, error: 'Ligne non trouvée' },
        { status: 404 }
      );
    }

    // Return snake_case to match what transformResponse expects
    const lineStops = line.lineStops.map((ls) => ({
      id: ls.id,
      line_id: ls.lineId,
      from_stop_id: ls.fromStopId,
      to_stop_id: ls.toStopId,
      order: ls.order,
      direction: ls.direction,
      duration: ls.duration,
      // Flatten stop info for the transformResponse handler
      stop_name: ls.toStop.name,
      stop_code: ls.toStop.code,
      stop_order: ls.order,
      zone_id: ls.toStop.zoneId,
      zone_name: ls.toStop.zone.name,
      zone_code: ls.toStop.zone.code,
      zone_color: ls.toStop.zone.color,
      latitude: ls.toStop.latitude,
      longitude: ls.toStop.longitude,
    }));

    const schedules = line.schedules.map((s) => ({
      id: s.id,
      line_id: s.lineId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      frequency: s.frequency,
      is_active: s.isActive ? 1 : 0,
    }));

    const data = {
      id: line.id,
      number: line.number,
      name: line.name,
      description: line.description || '',
      color: line.color,
      is_active: line.isActive ? 1 : 0,
      stops_count: line.lineStops.length,
      schedule_count: line.schedules.length,
      lineStops,
      schedules,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get line detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
