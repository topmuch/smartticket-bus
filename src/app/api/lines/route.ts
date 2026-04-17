import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/lines - List all lines (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');

    const where: Prisma.LineWhereInput = {};

    if (active === 'true') {
      where.isActive = true;
    }

    const lines = await db.line.findMany({
      where,
      include: {
        _count: {
          select: {
            lineStops: true,
            schedules: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: lines,
    });
  } catch (error) {
    console.error('List lines error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/lines - Create line (SUPERADMIN only)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { number, name, color, isActive } = body;

    if (!number || !name) {
      return NextResponse.json(
        { success: false, error: 'Le numéro et le nom de la ligne sont requis' },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await db.line.findUnique({
      where: { number: number.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Une ligne avec ce numéro existe déjà' },
        { status: 409 }
      );
    }

    const line = await db.line.create({
      data: {
        number: number.trim(),
        name: name.trim(),
        color: color?.trim() || '#16a34a',
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Line',
        entityId: line.id,
        details: JSON.stringify({ number: line.number, name: line.name }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: line }, { status: 201 });
  } catch (error) {
    console.error('Create line error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
