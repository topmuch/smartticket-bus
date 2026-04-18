import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/line-stops - List line stops (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineId = searchParams.get('lineId');
    const direction = searchParams.get('direction');

    const where: Prisma.LineStopWhereInput = {};

    if (lineId) {
      where.lineId = lineId;
    }

    if (direction) {
      where.direction = direction;
    }

    const lineStops = await db.lineStop.findMany({
      where,
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
      orderBy: [
        { line: { number: 'asc' } },
        { direction: 'asc' },
        { order: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: lineStops,
    });
  } catch (error) {
    console.error('List line stops error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/line-stops - Add a stop to a line (SUPERADMIN only)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { lineId, fromStopId, toStopId, order, direction, duration } = body;

    if (!lineId || !fromStopId || !toStopId || order === undefined || !direction) {
      return NextResponse.json(
        { success: false, error: 'lineId, fromStopId, toStopId, order et direction sont requis' },
        { status: 400 }
      );
    }

    // Validate direction
    if (!['forward', 'backward'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'direction doit être "forward" ou "backward"' },
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

    // Verify stops exist
    const [fromStop, toStop] = await Promise.all([
      db.stop.findUnique({ where: { id: fromStopId } }),
      db.stop.findUnique({ where: { id: toStopId } }),
    ]);

    if (!fromStop) {
      return NextResponse.json(
        { success: false, error: 'Arrêt de départ non trouvé' },
        { status: 404 }
      );
    }

    if (!toStop) {
      return NextResponse.json(
        { success: false, error: 'Arrêt d\'arrivée non trouvé' },
        { status: 404 }
      );
    }

    // Check for duplicate (unique constraint)
    const existing = await db.lineStop.findFirst({
      where: {
        lineId,
        fromStopId,
        toStopId,
        direction,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Cette liaison existe déjà pour cette ligne et direction' },
        { status: 409 }
      );
    }

    const lineStop = await db.lineStop.create({
      data: {
        lineId,
        fromStopId,
        toStopId,
        order: parseInt(order, 10),
        direction,
        duration: duration !== undefined ? parseInt(duration, 10) : null,
      },
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
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'LineStop',
        entityId: lineStop.id,
        details: JSON.stringify({
          lineId,
          fromStopId,
          toStopId,
          order: lineStop.order,
          direction,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: lineStop }, { status: 201 });
  } catch (error) {
    console.error('Create line stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
