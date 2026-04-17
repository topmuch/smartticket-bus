import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import QRCode from 'qrcode';

// POST /api/tickets/generate-qr - Generate QR code image for a ticket
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { ticketId } = body;

    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID du ticket requis' },
        { status: 400 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        type: true,
        qrToken: true,
        qrSignature: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket introuvable' },
        { status: 404 }
      );
    }

    if (!ticket.qrToken || !ticket.qrSignature) {
      return NextResponse.json(
        { success: false, error: 'Token QR non disponible pour ce ticket' },
        { status: 400 }
      );
    }

    // Build full QR string: token.signature
    const qrString = `${ticket.qrToken}.${ticket.qrSignature}`;

    // Generate QR code image
    const qrImage = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        qrImage,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
      },
    });
  } catch (error: any) {
    console.error('Error generating QR image:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du code QR' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
