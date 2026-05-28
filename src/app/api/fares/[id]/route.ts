import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/fares/[id] - Get fare by ID (SUPERADMIN, OPERATOR, CONTROLLER)
export const GET = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const fare = await db.fare.findUnique({
      where: { id },
      include: {
        fromZone: {
          select: { id: true, code: true, name: true, color: true },
        },
        toZone: {
          select: { id: true, code: true, name: true, color: true },
        },
      },
    });

    if (!fare) {
      return NextResponse.json(
        { success: false, error: 'Tarif non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fare,
    });
  } catch (error) {
    console.error('Get fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR', 'CONTROLLER']);

// PUT /api/fares/[id] - Update fare (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { price, isActive } = body;

    // Check fare exists
    const existingFare = await db.fare.findUnique({
      where: { id },
      include: {
        fromZone: { select: { name: true } },
        toZone: { select: { name: true } },
      },
    });

    if (!existingFare) {
      return NextResponse.json(
        { success: false, error: 'Tarif non trouvé' },
        { status: 404 }
      );
    }

    // Validate price if provided
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return NextResponse.json(
          { success: false, error: 'Le prix doit être un nombre positif' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.FareUpdateInput = {};
    if (price !== undefined) updateData.price = Math.round(price * 100) / 100;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedFare = await db.fare.update({
      where: { id },
      data: updateData,
      include: {
        fromZone: {
          select: { id: true, code: true, name: true, color: true },
        },
        toZone: {
          select: { id: true, code: true, name: true, color: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Fare',
        entityId: id,
        details: JSON.stringify({
          fromZone: existingFare.fromZone.name,
          toZone: existingFare.toZone.name,
          before: { price: existingFare.price, isActive: existingFare.isActive },
          after: updateData,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedFare,
    });
  } catch (error) {
    console.error('Update fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/fares/[id] - Delete fare (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    // Check fare exists
    const existingFare = await db.fare.findUnique({
      where: { id },
      include: {
        fromZone: { select: { name: true } },
        toZone: { select: { name: true } },
      },
    });

    if (!existingFare) {
      return NextResponse.json(
        { success: false, error: 'Tarif non trouvé' },
        { status: 404 }
      );
    }

    // Delete fare
    await db.fare.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Fare',
        entityId: id,
        details: JSON.stringify({
          fromZone: existingFare.fromZone.name,
          toZone: existingFare.toZone.name,
          price: existingFare.price,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Tarif supprimé avec succès' },
    });
  } catch (error) {
    console.error('Delete fare error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
