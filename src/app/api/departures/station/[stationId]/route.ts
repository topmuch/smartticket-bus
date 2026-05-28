import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RouteContext } from '@/lib/middleware';

// Helper: add minutes to a "HH:mm" string
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Helper: get today's date as YYYY-MM-DD in Dakar timezone (UTC-1 / Africa/Dakar)
function getTodayDateString(): string {
  const now = new Date();
  // Dakar is UTC, so use UTC values directly
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: get tomorrow's date string
function getTomorrowDateString(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/departures/station/[stationId] — Public departures for a station
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { stationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    // Determine which date(s) to show
    const todayStr = getTodayDateString();
    const date = dateParam || todayStr;

    // If no date specified, check if after 18:00 to also show tomorrow
    const now = new Date();
    const currentHour = now.getUTCHours(); // UTC = Dakar
    const showTomorrow = !dateParam && currentHour >= 18;

    const dates = [date];
    if (showTomorrow) {
      const tomorrowStr = getTomorrowDateString();
      if (!dates.includes(tomorrowStr)) {
        dates.push(tomorrowStr);
      }
    }

    // Validate station exists
    const station = await db.stop.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, code: true, isActive: true },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Gare non trouvée' },
        { status: 404 }
      );
    }

    // Fetch departures where station is origin or destination
    const departures = await db.departure.findMany({
      where: {
        departureDate: { in: dates },
        status: { notIn: ['DEPARTED', 'CANCELLED'] },
        availableSeats: { gt: 0 },
        AND: [
          {
            OR: [
              { originStationId: stationId },
              { destinationStationId: stationId },
            ],
          },
        ],
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
        originStation: {
          select: { id: true, name: true, code: true },
        },
        destinationStation: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Transform to public response format
    const result = departures.map((d) => {
      // Determine destination name:
      // - If the user's station is origin, show destination station name
      // - If the user's station is destination, show origin station name (reversed perspective)
      const isOrigin = d.originStationId === stationId;
      const destinationName = isOrigin
        ? d.destinationStation?.name || d.line.originStation || 'Destination'
        : d.originStation?.name || d.line.destinationStation || 'Origine';

      return {
        id: d.id,
        lineNumber: d.line.number,
        lineName: d.line.name,
        lineColor: d.line.color,
        direction: d.direction,
        destination: destinationName,
        scheduledTime: d.scheduledTime,
        actualTime: addMinutesToTime(d.scheduledTime, d.delayMinutes),
        platform: d.platform || null,
        status: d.status,
        availableSeats: d.availableSeats,
        price: d.price,
        departureDate: d.departureDate,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        station: { id: station.id, name: station.name, code: station.code },
        dates,
        showTomorrow,
      },
    });
  } catch (error) {
    console.error('Station departures error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
