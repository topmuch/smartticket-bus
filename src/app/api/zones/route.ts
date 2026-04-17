import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/zones - List all zones (PUBLIC READ)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    // Build where clause
    const where: Prisma.ZoneWhereInput = {};

    if (active !== null && active !== '') {
      where.isActive = active === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const zones = await db.zone.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        color: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        stops: {
          select: { id: true },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    // Attach stop count to each zone
    const zonesWithCount = zones.map((zone) => ({
      ...zone,
      _count: {
        stops: zone.stops.length,
      },
    }));

    return NextResponse.json({
      success: true,
      data: zonesWithCount,
    });
  } catch (error) {
    console.error('List zones error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/zones - Create zone (SUPERADMIN only)
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { code, name, description, color, isActive } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Le code et le nom de la zone sont requis' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    // Check if zone code already exists
    const existingZone = await db.zone.findUnique({
      where: { code: trimmedCode },
    });

    if (existingZone) {
      return NextResponse.json(
        { success: false, error: 'Une zone avec ce code existe déjà' },
        { status: 409 }
      );
    }

    // Create zone
    const newZone = await db.zone.create({
      data: {
        code: trimmedCode,
        name: trimmedName,
        description: description?.trim() || null,
        color: color?.trim() || '#3b82f6',
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Zone',
        entityId: newZone.id,
        details: JSON.stringify({ code: newZone.code, name: newZone.name }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newZone,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create zone error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
