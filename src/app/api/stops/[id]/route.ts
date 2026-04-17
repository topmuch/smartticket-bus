import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/stops/[id] - Get stop by ID with zone info and lines (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID d\'arrêt requis' },
        { status: 400 }
      );
    }

    const stop = await db.stop.findUnique({
      where: { id },
      include: {
        zone: true,
        lineStopsFrom: {
          include: {
            line: true,
            toStop: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        lineStopsTo: {
          include: {
            line: true,
            fromStop: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!stop) {
      return NextResponse.json(
        { success: false, error: 'Arrêt non trouvé' },
        { status: 404 }
      );
    }

    // Extract unique lines passing through this stop
    const linesMap = new Map<string, any>();
    for (const ls of stop.lineStopsFrom) {
      if (!linesMap.has(ls.line.id)) {
        linesMap.set(ls.line.id, {
          id: ls.line.id,
          number: ls.line.number,
          name: ls.line.name,
          color: ls.line.color,
          direction: ls.direction,
          order: ls.order,
        });
      }
    }
    for (const ls of stop.lineStopsTo) {
      if (!linesMap.has(ls.line.id)) {
        linesMap.set(ls.line.id, {
          id: ls.line.id,
          number: ls.line.number,
          name: ls.line.name,
          color: ls.line.color,
          direction: ls.direction,
          order: ls.order,
        });
      }
    }

    const result = {
      ...stop,
      lines: Array.from(linesMap.values()),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/stops/[id] - Update stop (SUPERADMIN only)
export const PUT = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID d\'arrêt requis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, code, zoneId, latitude, longitude, isActive } = body;

    const existing = await db.stop.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Arrêt non trouvé' },
        { status: 404 }
      );
    }

    // Check code uniqueness if changed
    if (code && code.trim() !== existing.code) {
      const duplicate = await db.stop.findUnique({
        where: { code: code.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Un arrêt avec ce code existe déjà' },
          { status: 409 }
        );
      }
    }

    // Verify zone exists if changed
    if (zoneId && zoneId !== existing.zoneId) {
      const zone = await db.zone.findUnique({ where: { id: zoneId } });
      if (!zone) {
        return NextResponse.json(
          { success: false, error: 'Zone non trouvée' },
          { status: 404 }
        );
      }
    }

    const updateData: Prisma.StopUpdateInput = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim();
    if (zoneId !== undefined) updateData.zoneId = zoneId;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStop = await db.stop.update({
      where: { id },
      data: updateData,
      include: {
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Stop',
        entityId: id,
        details: JSON.stringify(updateData),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: updatedStop });
  } catch (error) {
    console.error('Update stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/stops/[id] - Delete stop (SUPERADMIN only)
export const DELETE = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID d\'arrêt requis' },
        { status: 400 }
      );
    }

    const existing = await db.stop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lineStopsFrom: true,
            lineStopsTo: true,
            ticketsFrom: true,
            ticketsTo: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Arrêt non trouvé' },
        { status: 404 }
      );
    }

    const totalLineStops = existing._count.lineStopsFrom + existing._count.lineStopsTo;
    const totalTickets = existing._count.ticketsFrom + existing._count.ticketsTo;

    if (totalLineStops > 0) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer un arrêt avec des lignes associées. Supprimez d\'abord les liaisons ligne-arrêt.' },
        { status: 400 }
      );
    }

    if (totalTickets > 0) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer un arrêt avec des tickets associés' },
        { status: 400 }
      );
    }

    await db.stop.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Stop',
        entityId: id,
        details: JSON.stringify({ name: existing.name, code: existing.code }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
