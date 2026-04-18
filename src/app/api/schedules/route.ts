import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/schedules - List schedules (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get('lineId');
    const dayOfWeek = searchParams.get('dayOfWeek');

    const where: Prisma.ScheduleWhereInput = {};

    if (lineId) {
      where.lineId = lineId;
    }

    if (dayOfWeek !== null) {
      where.dayOfWeek = parseInt(dayOfWeek, 10);
    }

    const schedules = await db.schedule.findMany({
      where,
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
      },
      orderBy: [
        { line: { number: 'asc' } },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('List schedules error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create schedule (SUPERADMIN only)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { lineId, dayOfWeek, startTime, endTime, frequency, isActive } = body;

    if (!lineId || dayOfWeek === undefined || !startTime || !endTime || !frequency) {
      return NextResponse.json(
        { success: false, error: 'lineId, dayOfWeek, startTime, endTime et frequency sont requis' },
        { status: 400 }
      );
    }

    // Validate dayOfWeek
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { success: false, error: 'dayOfWeek doit être entre 0 (Dimanche) et 6 (Samedi)' },
        { status: 400 }
      );
    }

    // Validate time format HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      return NextResponse.json(
        { success: false, error: 'Format startTime invalide. Utilisez HH:mm (ex: 06:00)' },
        { status: 400 }
      );
    }

    if (!timeRegex.test(endTime)) {
      return NextResponse.json(
        { success: false, error: 'Format endTime invalide. Utilisez HH:mm (ex: 22:00)' },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { success: false, error: 'startTime doit être antérieur à endTime' },
        { status: 400 }
      );
    }

    if (frequency < 1) {
      return NextResponse.json(
        { success: false, error: 'La fréquence doit être d\'au moins 1 minute' },
        { status: 400 }
      );
    }

    // Verify line exists
    const line = await db.line.findUnique({ where: { id: lineId } });
    if (!line) {
      return NextResponse.json(
        { success: false, error: 'Ligne non trouvée' },
        { status: 404 }
      );
    }

    // Check for duplicate (unique constraint: lineId + dayOfWeek + startTime)
    const existing = await db.schedule.findFirst({
      where: {
        lineId,
        dayOfWeek,
        startTime,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un horaire existe déjà pour cette ligne, ce jour et cette heure de début' },
        { status: 409 }
      );
    }

    const schedule = await db.schedule.create({
      data: {
        lineId,
        dayOfWeek,
        startTime,
        endTime,
        frequency: parseInt(frequency, 10),
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Schedule',
        entityId: schedule.id,
        details: JSON.stringify({
          lineId,
          dayOfWeek,
          startTime,
          endTime,
          frequency,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
