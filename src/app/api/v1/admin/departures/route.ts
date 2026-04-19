import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getDepartures, createDeparture } from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// GET /api/v1/admin/departures — list departures with filters
export const GET = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('station_id');
    const dayOfWeek = searchParams.get('day_of_week');

    const filters: { stationId?: string; dayOfWeek?: number } = {};
    if (stationId) filters.stationId = stationId;
    if (dayOfWeek !== null && dayOfWeek !== '') {
      const parsed = parseInt(dayOfWeek, 10);
      if (!isNaN(parsed)) filters.dayOfWeek = parsed;
    }

    const departures = getDepartures(filters);
    return NextResponse.json({ success: true, data: departures });
  } catch (error) {
    console.error('List departures error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// POST /api/v1/admin/departures — create a departure
export const POST = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const body = await req.json();
    const { stationId, lineId, scheduledTime, platform, scheduleType, dayOfWeek, destination } = body;

    if (!stationId || !scheduledTime || !destination) {
      return NextResponse.json(
        { success: false, error: 'La gare, l\'heure et la destination sont requises' },
        { status: 400 }
      );
    }

    const departure = createDeparture({
      stationId,
      lineId: lineId || '',
      scheduledTime,
      platform: platform != null ? platform : 0,
      scheduleType: scheduleType || 'departure',
      dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : 1,
      destination,
      delayMinutes: 0,
      status: 'on_time',
    });

    return NextResponse.json({ success: true, data: departure }, { status: 201 });
  } catch (error) {
    console.error('Create departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
