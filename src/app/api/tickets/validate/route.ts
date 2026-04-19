import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { parseAndVerifyQR } from '@/lib/qr';

// POST /api/tickets/validate - Validate a ticket QR code or ticket number
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { qrString } = body;

    if (!qrString || typeof qrString !== 'string') {
      return NextResponse.json(
        { success: false, error: 'QR string ou numéro de ticket requis' },
        { status: 400 }
      );
    }

    const trimmed = qrString.trim();

    // ── TICKET NUMBER LOOKUP (TK-XXXXXXXX-XXXX) ──────────
    // If input starts with TK-, look up ticket directly by number
    if (/^TK-\d{8}-\d{4}$/i.test(trimmed)) {
      const ticket = await db.ticket.findUnique({
        where: { ticketNumber: trimmed.toUpperCase() },
        include: {
          soldBy: { select: { id: true, name: true, email: true } },
          fromZone: { select: { id: true, name: true, code: true } },
          toZone: { select: { id: true, name: true, code: true } },
          fromStop: { select: { id: true, name: true, code: true } },
          toStop: { select: { id: true, name: true, code: true } },
          line: { select: { id: true, name: true, number: true } },
          subscription: true,
        },
      });

      if (!ticket) {
        await db.control.create({
          data: {
            qrData: trimmed,
            result: 'NOT_FOUND',
            reason: `Ticket ${trimmed} introuvable en base`,
            controllerId: user.userId,
          },
        });
        return NextResponse.json({
          success: true,
          valid: false,
          result: 'NOT_FOUND',
          reason: `Ticket ${trimmed} introuvable en base de données`,
        });
      }

      // Validate status
      if (ticket.status === 'CANCELLED') {
        await db.control.create({
          data: { ticketId: ticket.id, qrData: trimmed, result: 'INVALID', reason: 'Ticket annulé', controllerId: user.userId },
        });
        return NextResponse.json({ success: true, valid: false, result: 'INVALID', reason: 'Ce ticket a été annulé', ticket });
      }
      if (ticket.status === 'USED' && ticket.type === 'UNIT') {
        await db.control.create({
          data: { ticketId: ticket.id, qrData: trimmed, result: 'ALREADY_USED', reason: 'Ticket unitaire déjà utilisé', controllerId: user.userId },
        });
        return NextResponse.json({ success: true, valid: false, result: 'ALREADY_USED', reason: 'Ce ticket a déjà été utilisé', ticket });
      }
      if (ticket.status === 'EXPIRED' || ticket.status === 'INVALID') {
        await db.control.create({
          data: { ticketId: ticket.id, qrData: trimmed, result: 'EXPIRED', reason: `Ticket en statut: ${ticket.status}`, controllerId: user.userId },
        });
        return NextResponse.json({ success: true, valid: false, result: 'EXPIRED', reason: `Ce ticket est ${ticket.status === 'EXPIRED' ? 'expiré' : 'invalide'}`, ticket });
      }

      const now = new Date();
      if (now > ticket.validTo) {
        await db.ticket.update({ where: { id: ticket.id }, data: { status: 'EXPIRED' } });
        await db.control.create({
          data: { ticketId: ticket.id, qrData: trimmed, result: 'EXPIRED', reason: `Ticket expiré le ${ticket.validTo.toISOString()}`, controllerId: user.userId },
        });
        return NextResponse.json({ success: true, valid: false, result: 'EXPIRED', reason: 'Ce ticket a expiré', ticket });
      }

      // Mark as used if unit ticket
      if (ticket.type === 'UNIT') {
        await db.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } });
      }

      await db.control.create({
        data: { ticketId: ticket.id, qrData: trimmed, result: 'VALID', controllerId: user.userId },
      });

      return NextResponse.json({ success: true, valid: true, result: 'VALID', ticket });
    }

    // ── JWT QR CODE VALIDATION ──────────────────────────
    // Verify QR signature
    const qrResult = parseAndVerifyQR(trimmed);

    if (!qrResult.valid || !qrResult.payload) {
      // Create control record for falsified/invalid QR
      await db.control.create({
        data: {
          qrData: trimmed,
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

    // Find ticket by tid (ticket ID) from JWT QR payload
    const ticket = await db.ticket.findUnique({
      where: { id: payload.tid },
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
          reason: `Ticket ${payload.tid} introuvable en base de données`,
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
      { success: false, error: 'Erreur lors de la validation du ticket', debug: error?.message, stack: error?.stack?.slice(0, 300) },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
