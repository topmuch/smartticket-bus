import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, RouteContext } from '@/lib/middleware';
import { DepartureStatus } from '@prisma/client';

// GET /api/departures/[id] — Get single departure with full relations
export const GET = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    const departure = await db.departure.findUnique({
      where: { id },
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true, isActive: true },
        },
        originStation: {
          select: { id: true, name: true, code: true, latitude: true, longitude: true },
        },
        destinationStation: {
          select: { id: true, name: true, code: true, latitude: true, longitude: true },
        },
        zone: {
          select: { id: true, name: true, code: true, color: true },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            passengerName: true,
            passengerPhone: true,
            price: true,
            soldAt: true,
            soldBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { soldAt: 'asc' },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: departure });
  } catch (error) {
    console.error('Get departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// PUT /api/departures/[id] — Update a departure (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();

    // Fetch existing departure
    const existing = await db.departure.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }

    // Build update payload — only allow specific fields
    const updateData: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const allowedFields = [
      'status',
      'delayMinutes',
      'platform',
      'availableSeats',
      'maxSeats',
      'notes',
      'scheduledTime',
    ] as const;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Validate status if provided
        if (field === 'status') {
          if (!Object.values(DepartureStatus).includes(body.status)) {
            return NextResponse.json(
              { success: false, error: 'Statut invalide' },
              { status: 400 }
            );
          }
        }

        // Validate scheduledTime format if provided
        if (field === 'scheduledTime' && body.scheduledTime !== null) {
          if (!/^\d{2}:\d{2}$/.test(body.scheduledTime)) {
            return NextResponse.json(
              { success: false, error: 'Format de scheduledTime invalide (HH:mm)' },
              { status: 400 }
            );
          }
        }

        // Validate maxSeats / availableSeats
        if ((field === 'maxSeats' || field === 'availableSeats') && body[field] < 0) {
          return NextResponse.json(
            { success: false, error: `${field} ne peut pas être négatif` },
            { status: 400 }
          );
        }

        // Track changes for audit
        if (body[field] !== existing[field as keyof typeof existing]) {
          changes[field] = {
            from: existing[field as keyof typeof existing],
            to: body[field],
          };
        }

        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      );
    }

    // If maxSeats changed, also adjust availableSeats proportionally
    if ('maxSeats' in updateData && !('availableSeats' in updateData)) {
      const soldTickets = existing.maxSeats - existing.availableSeats;
      const newAvailable = Math.max(0, (updateData.maxSeats as number) - soldTickets);
      updateData.availableSeats = newAvailable;
      changes['availableSeats'] = { from: existing.availableSeats, to: newAvailable };
    }

    // Update the departure
    const departure = await db.departure.update({
      where: { id },
      data: updateData,
      include: {
        line: {
          select: { id: true, number: true, name: true, color: true },
        },
        originStation: {
          select: { id: true, name: true, code: true },
        },
        destinationStation: {
          select: { id: true, name: true, code: true },
        },
        zone: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Departure',
        entityId: id,
        details: JSON.stringify({
          changes,
          updatedFields: Object.keys(updateData),
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    // Additional audit entry for status changes to DEPARTED or CANCELLED
    if (updateData.status === 'DEPARTED' || updateData.status === 'CANCELLED') {
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: updateData.status === 'DEPARTED' ? 'DEPARTURE_DEPARTED' : 'DEPARTURE_CANCELLED',
          entity: 'Departure',
          entityId: id,
          details: JSON.stringify({
            previousStatus: existing.status,
            newStatus: updateData.status,
            departureDate: existing.departureDate,
            scheduledTime: existing.scheduledTime,
            lineNumber: departure.line?.number,
          }),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        },
      });
    }

    return NextResponse.json({ success: true, data: departure });
  } catch (error: any) {
    console.error('Update departure error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Conflit de contrainte unique — un départ avec ces paramètres existe déjà',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/departures/[id] — Delete a departure (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Check departure exists
    const departure = await db.departure.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true },
        },
        line: {
          select: { number: true, name: true },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }

    // Cannot delete if tickets are linked
    if (departure._count.tickets > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de supprimer : ${departure._count.tickets} ticket(s) lié(s) à ce départ`,
        },
        { status: 409 }
      );
    }

    await db.departure.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Departure',
        entityId: id,
        details: JSON.stringify({
          lineId: departure.lineId,
          lineNumber: departure.line?.number,
          direction: departure.direction,
          departureDate: departure.departureDate,
          scheduledTime: departure.scheduledTime,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Départ supprimé avec succès' },
    });
  } catch (error) {
    console.error('Delete departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
