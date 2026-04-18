import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/zones/[id] - Get zone by ID (SUPERADMIN, OPERATOR, CONTROLLER)
export const GET = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const zone = await db.zone.findUnique({
      where: { id },
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
    });

    if (!zone) {
      return NextResponse.json(
        { success: false, error: 'Zone non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...zone,
        _count: {
          stops: zone.stops.length,
        },
      },
    });
  } catch (error) {
    console.error('Get zone error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR', 'CONTROLLER']);

// PUT /api/zones/[id] - Update zone (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { code, name, description, color, isActive } = body;

    // Check zone exists
    const existingZone = await db.zone.findUnique({
      where: { id },
    });

    if (!existingZone) {
      return NextResponse.json(
        { success: false, error: 'Zone non trouvée' },
        { status: 404 }
      );
    }

    // Check code uniqueness if being changed
    if (code && code.trim() !== existingZone.code) {
      const codeExists = await db.zone.findUnique({
        where: { code: code.trim() },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Une autre zone utilise déjà ce code' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.ZoneUpdateInput = {};
    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedZone = await db.zone.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Zone',
        entityId: id,
        details: JSON.stringify({
          before: { code: existingZone.code, name: existingZone.name },
          after: updateData,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedZone,
    });
  } catch (error) {
    console.error('Update zone error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/zones/[id] - Delete zone (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    // Check zone exists
    const existingZone = await db.zone.findUnique({
      where: { id },
      include: {
        stops: { select: { id: true } },
        faresFrom: { select: { id: true } },
        faresTo: { select: { id: true } },
        subscriptions: { select: { id: true } },
      },
    });

    if (!existingZone) {
      return NextResponse.json(
        { success: false, error: 'Zone non trouvée' },
        { status: 404 }
      );
    }

    // Check for related records
    const relatedRecords: string[] = [];
    if (existingZone.stops.length > 0) {
      relatedRecords.push(`${existingZone.stops.length} arrêt(s)`);
    }
    if (existingZone.faresFrom.length > 0 || existingZone.faresTo.length > 0) {
      relatedRecords.push(`${existingZone.faresFrom.length + existingZone.faresTo.length} tarif(s)`);
    }
    if (existingZone.subscriptions.length > 0) {
      relatedRecords.push(`${existingZone.subscriptions.length} abonnement(s)`);
    }

    if (relatedRecords.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de supprimer cette zone. Des enregistrements liés existent : ${relatedRecords.join(', ')}`,
        },
        { status: 409 }
      );
    }

    // Delete zone
    await db.zone.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Zone',
        entityId: id,
        details: JSON.stringify({ code: existingZone.code, name: existingZone.name }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Zone supprimée avec succès' },
    });
  } catch (error) {
    console.error('Delete zone error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
