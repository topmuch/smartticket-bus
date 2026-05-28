import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// PUT /api/line-stops/[id] - Update line stop (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { fromStopId, toStopId, order, direction, duration } = body;

    const existing = await db.lineStop.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Liaison ligne-arrêt non trouvée' },
        { status: 404 }
      );
    }

    // Validate direction if provided
    if (direction && !['forward', 'backward'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'direction doit être "forward" ou "backward"' },
        { status: 400 }
      );
    }

    // Verify stops exist if changed
    if (fromStopId && fromStopId !== existing.fromStopId) {
      const stop = await db.stop.findUnique({ where: { id: fromStopId } });
      if (!stop) {
        return NextResponse.json(
          { success: false, error: 'Arrêt de départ non trouvé' },
          { status: 404 }
        );
      }
    }

    if (toStopId && toStopId !== existing.toStopId) {
      const stop = await db.stop.findUnique({ where: { id: toStopId } });
      if (!stop) {
        return NextResponse.json(
          { success: false, error: 'Arrêt d\'arrivée non trouvé' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate if unique fields are being changed
    const newFromStopId = fromStopId || existing.fromStopId;
    const newToStopId = toStopId || existing.toStopId;
    const newDirection = direction || existing.direction;

    if (fromStopId || toStopId || direction) {
      const duplicate = await db.lineStop.findFirst({
        where: {
          id: { not: id },
          lineId: existing.lineId,
          fromStopId: newFromStopId,
          toStopId: newToStopId,
          direction: newDirection,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Cette liaison existe déjà pour cette ligne et direction' },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.LineStopUpdateInput = {};
    if (fromStopId !== undefined) updateData.fromStopId = fromStopId;
    if (toStopId !== undefined) updateData.toStopId = toStopId;
    if (order !== undefined) updateData.order = parseInt(order, 10);
    if (direction !== undefined) updateData.direction = direction;
    if (duration !== undefined) updateData.duration = duration !== null ? parseInt(duration, 10) : null;

    const updatedLineStop = await db.lineStop.update({
      where: { id },
      data: updateData,
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
        fromStop: {
          include: {
            zone: {
              select: { id: true, name: true, code: true, color: true },
            },
          },
        },
        toStop: {
          include: {
            zone: {
              select: { id: true, name: true, code: true, color: true },
            },
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'LineStop',
        entityId: id,
        details: JSON.stringify(updateData),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: updatedLineStop });
  } catch (error) {
    console.error('Update line stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/line-stops/[id] - Remove line stop (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const existing = await db.lineStop.findUnique({
      where: { id },
      include: {
        line: {
          select: { number: true, name: true },
        },
        fromStop: {
          select: { name: true, code: true },
        },
        toStop: {
          select: { name: true, code: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Liaison ligne-arrêt non trouvée' },
        { status: 404 }
      );
    }

    await db.lineStop.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'LineStop',
        entityId: id,
        details: JSON.stringify({
          line: existing.line.number,
          fromStop: existing.fromStop.code,
          toStop: existing.toStop.code,
          direction: existing.direction,
          order: existing.order,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete line stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
