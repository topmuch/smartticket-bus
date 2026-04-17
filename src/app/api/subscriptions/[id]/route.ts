import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/subscriptions/[id] - Get subscription by ID with full details
export const GET = withAuth(async (req) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de l\'abonnement requis' },
        { status: 400 }
      );
    }

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        ticket: {
          include: {
            soldBy: {
              select: { id: true, name: true, email: true },
            },
            fromZone: { select: { id: true, name: true, code: true } },
            toZone: { select: { id: true, name: true, code: true } },
            line: { select: { id: true, name: true, number: true } },
            controls: {
              include: {
                controller: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { scannedAt: 'desc' },
            },
          },
        },
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Abonnement introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN']);

// PUT /api/subscriptions/[id] - Update subscription (deactivate)
export const PUT = withAuth(async (req, user) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de l\'abonnement requis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { isActive, passengerName, passengerPhone, passengerPhoto } = body;

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        ticket: {
          select: { id: true, ticketNumber: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Abonnement introuvable' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (passengerName !== undefined) {
      updateData.passengerName = passengerName;
    }
    if (passengerPhone !== undefined) {
      updateData.passengerPhone = passengerPhone;
    }
    if (passengerPhoto !== undefined) {
      updateData.passengerPhoto = passengerPhoto;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updatedSubscription = await db.subscription.update({
      where: { id },
      data: updateData,
      include: {
        ticket: {
          include: {
            soldBy: { select: { id: true, name: true } },
          },
        },
        zone: { select: { id: true, name: true, code: true } },
      },
    });

    // If deactivating, also cancel the linked ticket
    if (isActive === false) {
      await db.ticket.update({
        where: { id: subscription.ticketId },
        data: { status: 'CANCELLED' },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_SUBSCRIPTION',
        entity: 'Subscription',
        entityId: id,
        details: JSON.stringify({
          ticketNumber: subscription.ticket.ticketNumber,
          changes: updateData,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'abonnement' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN']);
