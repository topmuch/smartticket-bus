import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/tickets/[id] - Get ticket by ID with full details
export const GET = withAuth(async (req, _user) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID du ticket requis' },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        soldBy: {
          select: { id: true, name: true, email: true },
        },
        fromZone: {
          select: { id: true, name: true, code: true },
        },
        toZone: {
          select: { id: true, name: true, code: true },
        },
        fromStop: {
          select: { id: true, name: true, code: true, latitude: true, longitude: true },
        },
        toStop: {
          select: { id: true, name: true, code: true, latitude: true, longitude: true },
        },
        line: {
          select: { id: true, name: true, number: true, color: true },
        },
        cashSession: {
          select: { id: true, openingBalance: true, status: true },
        },
        subscription: {
          include: {
            zone: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        controls: {
          include: {
            controller: {
              select: { id: true, name: true },
            },
          },
          orderBy: { scannedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du ticket' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// PUT /api/tickets/[id] - Cancel ticket (SUPERADMIN only)
export const PUT = withAuth(async (req, user) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID du ticket requis' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Only support cancelling tickets via this endpoint
    if (body.status !== 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Seule l\'annulation de ticket est supportée' },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket introuvable' },
        { status: 404 }
      );
    }

    if (ticket.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Ce ticket est déjà annulé' },
        { status: 400 }
      );
    }

    if (ticket.status === 'USED') {
      return NextResponse.json(
        { success: false, error: 'Impossible d\'annuler un ticket déjà utilisé' },
        { status: 400 }
      );
    }

    const updatedTicket = await db.ticket.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        soldBy: {
          select: { id: true, name: true, email: true },
        },
        fromZone: { select: { id: true, name: true, code: true } },
        toZone: { select: { id: true, name: true, code: true } },
        fromStop: { select: { id: true, name: true, code: true } },
        toStop: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, number: true } },
      },
    });

    // Deactivate linked subscription if exists
    if (ticket.type === 'SUBSCRIPTION') {
      await db.subscription.updateMany({
        where: { ticketId: id },
        data: { isActive: false },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CANCEL_TICKET',
        entity: 'Ticket',
        entityId: id,
        details: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          previousStatus: ticket.status,
          newStatus: 'CANCELLED',
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTicket,
    });
  } catch (error: any) {
    console.error('Error cancelling ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'annulation du ticket' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN']);
