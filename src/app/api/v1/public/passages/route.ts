import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DAY_NAMES = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
  'Jeudi', 'Vendredi', 'Samedi',
];

// GET /api/v1/public/passages?line_id=xxx&day_of_week=xxx
// Returns next bus passages for a given line and day
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get('line_id');
    const dayOfWeekParam = searchParams.get('day_of_week');

    if (!lineId) {
      return NextResponse.json(
        { success: false, error: 'line_id est requis' },
        { status: 400 }
      );
    }

    // Default to today if not specified
    const effectiveDay = dayOfWeekParam !== null && dayOfWeekParam !== ''
      ? parseInt(dayOfWeekParam, 10)
      : new Date().getDay();

    if (isNaN(effectiveDay) || effectiveDay < 0 || effectiveDay > 6) {
      return NextResponse.json(
        { success: false, error: 'day_of_week doit être entre 0 et 6' },
        { status: 400 }
      );
    }

    // Fetch line with schedules and stops
    const line = await db.line.findUnique({
      where: { id: lineId },
      include: {
        schedules: {
          where: {
            dayOfWeek: effectiveDay,
            isActive: true,
          },
          orderBy: { startTime: 'asc' },
        },
        lineStops: {
          include: {
            toStop: {
              include: { zone: true },
            },
          },
          orderBy: [{ direction: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!line) {
      return NextResponse.json(
        {
          success: true,
          data: {
            line: null,
            day_of_week: effectiveDay,
            day_name: DAY_NAMES[effectiveDay],
            current_time: new Date().toLocaleTimeString('fr-FR'),
            is_service_ended: false,
            passages: [],
            stops: [],
          },
        },
        { status: 200 }
      );
    }

    // Build unique stops list in order
    const uniqueStops: Map<string, any> = new Map();
    for (const ls of line.lineStops) {
      const stop = ls.toStop;
      if (!uniqueStops.has(stop.id)) {
        uniqueStops.set(stop.id, {
          stop_id: stop.id,
          stop_name: stop.name,
          stop_code: stop.code,
          zone_name: stop.zone.name,
          zone_color: stop.zone.color,
        });
      }
    }
    const stopsList = Array.from(uniqueStops.values());

    // Get current time in HH:MM format
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate passages based on schedules and frequency
    const passages: any[] = [];
    for (const schedule of line.schedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes > endMinutes) continue; // Service ended for this schedule

      const firstDeparture = Math.max(startMinutes, currentMinutes);
      // Generate up to 10 next departures
      let departureMinutes = firstDeparture;
      let count = 0;
      while (departureMinutes <= endMinutes && count < 10) {
        const h = String(Math.floor(departureMinutes / 60)).padStart(2, '0');
        const m = String(departureMinutes % 60).padStart(2, '0');
        passages.push({
          departure_time: `${h}:${m}`,
          start_time: schedule.startTime,
          end_time: schedule.endTime,
          frequency: schedule.frequency,
          stops: stopsList,
        });
        departureMinutes += schedule.frequency;
        count++;
      }
    }

    // Sort passages by departure time
    passages.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

    // Check if service has ended (no more departures and past last end time)
    const isServiceEnded = line.schedules.length === 0 ||
      (passages.length === 0 && currentMinutes > 0);

    const data = {
      line: {
        id: line.id,
        number: line.number,
        name: line.name,
        color: line.color,
      },
      day_of_week: effectiveDay,
      day_name: DAY_NAMES[effectiveDay],
      current_time: currentTimeStr,
      is_service_ended: isServiceEnded ? true : false,
      passages,
      stops: stopsList,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get passages error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
