import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/lines/[id] - Get line by ID with stops and schedules (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de ligne requis' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ success: true, data: line });
  } catch (error) {
    console.error('Get line error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/lines/[id] - Update line (SUPERADMIN only)
export const PUT = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de ligne requis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { number, name, color, isActive } = body;

    const existing = await db.line.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ligne non trouvée' },
        { status: 404 }
      );
    }

    // Check number uniqueness if changed
    if (number && number.trim() !== existing.number) {
      const duplicate = await db.line.findUnique({
        where: { number: number.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Une ligne avec ce numéro existe déjà' },
          { status: 409 }
        );
      }
    }

    const updateData: Prisma.LineUpdateInput = {};
    if (number !== undefined) updateData.number = number.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedLine = await db.line.update({
      where: { id },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Line',
        entityId: id,
        details: JSON.stringify(updateData),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: updatedLine });
  } catch (error) {
    console.error('Update line error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/lines/[id] - Delete line (SUPERADMIN only)
export const DELETE = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de ligne requis' },
        { status: 400 }
      );
    }

    const existing = await db.line.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lineStops: true,
            schedules: true,
            tickets: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ligne non trouvée' },
        { status: 404 }
      );
    }

    // Prevent deletion if there are related tickets
    if (existing._count.tickets > 0) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer une ligne avec des tickets associés' },
        { status: 400 }
      );
    }

    await db.lineStop.deleteMany({ where: { lineId: id } });
    await db.schedule.deleteMany({ where: { lineId: id } });
    await db.line.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Line',
        entityId: id,
        details: JSON.stringify({ number: existing.number, name: existing.name }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete line error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
