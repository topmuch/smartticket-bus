import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/schedules - Public schedules (NO AUTH REQUIRED)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lineId = searchParams.get('lineId');
    const dayOfWeekParam = searchParams.get('dayOfWeek');

    // Use current day of week if not provided (0=Sunday, 6=Saturday)
    const now = new Date();
    const currentDayOfWeek = dayOfWeekParam !== null
      ? parseInt(dayOfWeekParam, 10)
      : now.getDay();

    if (isNaN(currentDayOfWeek) || currentDayOfWeek < 0 || currentDayOfWeek > 6) {
      return NextResponse.json(
        { success: false, error: 'dayOfWeek doit être entre 0 (Dimanche) et 6 (Samedi)' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {
      dayOfWeek: currentDayOfWeek,
      isActive: true,
    };

    if (lineId) {
      where.lineId = lineId;
    }

    const schedules = await db.schedule.findMany({
      where,
      include: {
        line: {
          select: { id: true, name: true, number: true, color: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Generate next passages based on current time and frequency
    const schedulesWithPassages = schedules.map(schedule => {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Current time in minutes
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Generate all passage times for today
      const passages: string[] = [];
      if (nowMinutes <= endMinutes) {
        let time = Math.max(startMinutes, nowMinutes);
        while (time <= endMinutes) {
          const h = Math.floor(time / 60);
          const m = time % 60;
          passages.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          time += schedule.frequency;
        }
      }

      return {
        id: schedule.id,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        frequency: schedule.frequency,
        dayOfWeek: schedule.dayOfWeek,
        line: schedule.line,
        nextPassages: passages,
        isCurrentlyActive: nowMinutes >= startMinutes && nowMinutes <= endMinutes,
      };
    });

    // Day names in French
    const dayNames = [
      'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
      'Jeudi', 'Vendredi', 'Samedi',
    ];

    return NextResponse.json({
      success: true,
      data: {
        dayOfWeek: currentDayOfWeek,
        dayName: dayNames[currentDayOfWeek],
        schedules: schedulesWithPassages,
      },
    });
  } catch (error) {
    console.error('Error getting public schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des horaires' },
      { status: 500 }
    );
  }
}
