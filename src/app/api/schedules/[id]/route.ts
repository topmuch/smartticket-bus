import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/schedules/[id] - Get schedule by ID (public + authenticated)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const schedule = await db.schedule.findUnique({
      where: { id },
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Horaire non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update schedule (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { lineId, dayOfWeek, startTime, endTime, frequency, isActive } = body;

    const existing = await db.schedule.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Horaire non trouvé' },
        { status: 404 }
      );
    }

    // Validate dayOfWeek if provided
    if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return NextResponse.json(
        { success: false, error: 'dayOfWeek doit être entre 0 (Dimanche) et 6 (Samedi)' },
        { status: 400 }
      );
    }

    // Validate time format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (startTime && !timeRegex.test(startTime)) {
      return NextResponse.json(
        { success: false, error: 'Format startTime invalide. Utilisez HH:mm' },
        { status: 400 }
      );
    }

    if (endTime && !timeRegex.test(endTime)) {
      return NextResponse.json(
        { success: false, error: 'Format endTime invalide. Utilisez HH:mm' },
        { status: 400 }
      );
    }

    // Verify line exists if changed
    if (lineId && lineId !== existing.lineId) {
      const line = await db.line.findUnique({ where: { id: lineId } });
      if (!line) {
        return NextResponse.json(
          { success: false, error: 'Ligne non trouvée' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate if unique fields are being changed
    const newLineId = lineId || existing.lineId;
    const newDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : existing.dayOfWeek;
    const newStartTime = startTime || existing.startTime;

    if (lineId || dayOfWeek !== undefined || startTime) {
      const duplicate = await db.schedule.findFirst({
        where: {
          id: { not: id },
          lineId: newLineId,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Un horaire existe déjà pour cette ligne, ce jour et cette heure de début' },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.ScheduleUpdateInput = {};
    if (lineId !== undefined) updateData.lineId = lineId;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (frequency !== undefined) updateData.frequency = parseInt(frequency, 10);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedSchedule = await db.schedule.update({
      where: { id },
      data: updateData,
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Schedule',
        entityId: id,
        details: JSON.stringify(updateData),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: updatedSchedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/schedules/[id] - Delete schedule (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const existing = await db.schedule.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Horaire non trouvé' },
        { status: 404 }
      );
    }

    await db.schedule.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Schedule',
        entityId: id,
        details: JSON.stringify({
          lineId: existing.lineId,
          dayOfWeek: existing.dayOfWeek,
          startTime: existing.startTime,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
