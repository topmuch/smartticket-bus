import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/stops - List all stops (public + authenticated)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get('zoneId');
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    const where: Prisma.StopWhereInput = {};

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (active === 'true') {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const stops = await db.stop.findMany({
      where,
      include: {
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: stops,
    });
  } catch (error) {
    console.error('List stops error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/stops - Create stop (SUPERADMIN only)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { name, code, zoneId, latitude, longitude, isActive } = body;

    if (!name || !code || !zoneId) {
      return NextResponse.json(
        { success: false, error: 'Le nom, le code et la zone sont requis' },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await db.stop.findUnique({
      where: { code: code.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un arrêt avec ce code existe déjà' },
        { status: 409 }
      );
    }

    // Verify zone exists
    const zone = await db.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return NextResponse.json(
        { success: false, error: 'Zone non trouvée' },
        { status: 404 }
      );
    }

    const stop = await db.stop.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        zoneId,
        latitude: latitude !== undefined ? parseFloat(latitude) : null,
        longitude: longitude !== undefined ? parseFloat(longitude) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Stop',
        entityId: stop.id,
        details: JSON.stringify({ name: stop.name, code: stop.code, zoneId }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({ success: true, data: stop }, { status: 201 });
  } catch (error) {
    console.error('Create stop error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
