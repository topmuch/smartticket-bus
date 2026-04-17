import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { parseAndVerifyQR } from '@/lib/qr';

// POST /api/tickets/validate - Validate a ticket QR code
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { qrString } = body;

    if (!qrString || typeof qrString !== 'string') {
      return NextResponse.json(
        { success: false, error: 'QR string requise' },
        { status: 400 }
      );
    }

    // Verify QR signature
    const qrResult = parseAndVerifyQR(qrString);

    if (!qrResult.valid || !qrResult.payload) {
      // Create control record for falsified/invalid QR
      await db.control.create({
        data: {
          qrData: qrString,
          result: 'FALSIFIED',
          reason: qrResult.error || 'Signature QR invalide',
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'FALSIFIED',
        reason: qrResult.error || 'Signature QR invalide ou falsifiée',
      });
    }

    const payload = qrResult.payload;

    // Find ticket by ticketId from QR payload
    const ticket = await db.ticket.findUnique({
      where: { id: payload.ticketId },
      include: {
        soldBy: {
          select: { id: true, name: true, email: true },
        },
        fromZone: { select: { id: true, name: true, code: true } },
        toZone: { select: { id: true, name: true, code: true } },
        fromStop: { select: { id: true, name: true, code: true } },
        toStop: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, number: true } },
        subscription: true,
      },
    });

    if (!ticket) {
      // Create control record for not found
      await db.control.create({
        data: {
          qrData: qrString,
          result: 'NOT_FOUND',
          reason: `Ticket ${payload.ticketId} introuvable en base de données`,
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'NOT_FOUND',
        reason: 'Ticket introuvable en base de données',
      });
    }

    const now = new Date();

    // Check ticket status
    if (ticket.status === 'CANCELLED') {
      await db.control.create({
        data: {
          ticketId: ticket.id,
          qrData: qrString,
          result: 'INVALID',
          reason: 'Ticket annulé',
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'INVALID',
        reason: 'Ce ticket a été annulé',
        ticket,
      });
    }

    if (ticket.status === 'USED' && ticket.type === 'UNIT') {
      await db.control.create({
        data: {
          ticketId: ticket.id,
          qrData: qrString,
          result: 'ALREADY_USED',
          reason: 'Ticket unitaire déjà utilisé',
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'ALREADY_USED',
        reason: 'Ce ticket a déjà été utilisé',
        ticket,
      });
    }

    if (ticket.status === 'EXPIRED' || ticket.status === 'INVALID') {
      await db.control.create({
        data: {
          ticketId: ticket.id,
          qrData: qrString,
          result: 'EXPIRED',
          reason: `Ticket en statut: ${ticket.status}`,
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'EXPIRED',
        reason: `Ce ticket est ${ticket.status === 'EXPIRED' ? 'expiré' : 'invalide'}`,
        ticket,
      });
    }

    // Check validity dates
    if (now < ticket.validFrom) {
      await db.control.create({
        data: {
          ticketId: ticket.id,
          qrData: qrString,
          result: 'INVALID',
          reason: `Ticket non encore valide (valide à partir du ${ticket.validFrom.toISOString()})`,
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'INVALID',
        reason: 'Ticket non encore valide',
        ticket,
      });
    }

    if (now > ticket.validTo) {
      // Mark as expired
      await db.ticket.update({
        where: { id: ticket.id },
        data: { status: 'EXPIRED' },
      });

      await db.control.create({
        data: {
          ticketId: ticket.id,
          qrData: qrString,
          result: 'EXPIRED',
          reason: `Ticket expiré le ${ticket.validTo.toISOString()}`,
          controllerId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        valid: false,
        result: 'EXPIRED',
        reason: 'Ce ticket a expiré',
        ticket,
      });
    }

    // Ticket is valid!
    // For UNIT type: set status to USED
    // For SUBSCRIPTION type: keep VALID (can be used multiple times)
    if (ticket.type === 'UNIT') {
      await db.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED' },
      });
    }

    // Create control record
    await db.control.create({
      data: {
        ticketId: ticket.id,
        qrData: qrString,
        result: 'VALID',
        controllerId: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      valid: true,
      result: 'VALID',
      ticket,
    });
  } catch (error: any) {
    console.error('Error validating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la validation du ticket' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
