import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// GET /api/tickets/[id]/pdf - Generate a downloadable PDF ticket
export const GET = withAuth(async (_req, _user, context) => {
  try {
    const { id } = await context.params;

    // Fetch ticket with all required relations
    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        fromZone: {
          select: { id: true, name: true, code: true, color: true },
        },
        toZone: {
          select: { id: true, name: true, code: true, color: true },
        },
        fromStop: {
          select: { id: true, name: true, code: true },
        },
        toStop: {
          select: { id: true, name: true, code: true },
        },
        line: {
          select: { id: true, name: true, number: true, color: true },
        },
        soldBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket introuvable' },
        { status: 404 }
      );
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
      width: 200,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    // Create PDF - ticket size roughly 80mm x 200mm
    // jsPDF uses mm by default
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200],
    });

    const pageWidth = 80;
    const margin = 5;
    const contentWidth = pageWidth - margin * 2; // 70mm
    let y = 0;

    // ─── HEADER BACKGROUND ───
    doc.setFillColor(15, 76, 117); // Navy blue #0f4c75
    doc.rect(0, 0, pageWidth, 28, 'F');

    // ─── LOGO / BRAND TEXT ───
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SmartTicket', margin + 2, y + 10, { align: 'left' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('BUS', margin + 2, y + 15, { align: 'left' });

    // Bus icon circle (decorative)
    doc.setFillColor(0, 184, 148); // Accent green
    doc.circle(pageWidth - margin - 4, y + 10, 4, 'F');
    doc.setTextColor(15, 76, 117);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('BUS', pageWidth - margin - 4, y + 10.8, { align: 'center' });

    y += 20;

    // ─── DIVIDER ───
    doc.setDrawColor(0, 184, 148);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;

    // ─── TICKET NUMBER (prominent) ───
    doc.setTextColor(15, 76, 117);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('N° DE BILLET', pageWidth / 2, y, { align: 'center' });

    y += 5;

    // Ticket number with background highlight
    const ticketNum = ticket.ticketNumber;
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(margin + 5, y - 3.5, contentWidth - 10, 8, 2, 2, 'F');
    doc.setDrawColor(15, 76, 117);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 5, y - 3.5, contentWidth - 10, 8, 2, 2, 'S');

    doc.setTextColor(15, 76, 117);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(ticketNum, pageWidth / 2, y + 1.5, { align: 'center' });

    y += 10;

    // ─── TICKET TYPE ───
    const typeLabel = ticket.type === 'SUBSCRIPTION' ? 'ABONNEMENT' : 'UNITÉ';
    const statusLabel =
      ticket.status === 'VALID'
        ? 'VALIDE'
        : ticket.status === 'USED'
          ? 'UTILISÉ'
          : ticket.status === 'CANCELLED'
            ? 'ANNULÉ'
            : ticket.status === 'EXPIRED'
              ? 'EXPIRÉ'
              : 'INVALIDE';

    const statusColors: Record<string, [number, number, number]> = {
      VALID: [0, 128, 0],
      USED: [150, 150, 150],
      CANCELLED: [200, 50, 50],
      EXPIRED: [180, 120, 0],
      INVALID: [200, 50, 50],
    };
    const sColor = statusColors[ticket.status] || [150, 150, 150];

    // Type badge
    doc.setFillColor(15, 76, 117);
    doc.roundedRect(margin + 3, y - 2.5, 22, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(typeLabel, margin + 14, y + 0.3, { align: 'center' });

    // Status badge
    doc.setFillColor(sColor[0], sColor[1], sColor[2]);
    doc.roundedRect(margin + 28, y - 2.5, 22, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel, margin + 39, y + 0.3, { align: 'center' });

    // Line badge (if exists)
    if (ticket.line) {
      doc.setFillColor(241, 196, 15); // Gold
      doc.roundedRect(margin + 53, y - 2.5, 17, 5, 1.5, 1.5, 'F');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(6);
      doc.text(`Ligne ${ticket.line.number}`, margin + 61.5, y + 0.3, { align: 'center' });
    }

    y += 8;

    // ─── ROUTE SECTION ───
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('TRAJET', margin, y);
    y += 3;

    // Determine route display
    const fromLabel = ticket.fromStop?.name || ticket.fromZone?.name || 'Non défini';
    const toLabel = ticket.toStop?.name || ticket.toZone?.name || 'Non défini';

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(fromLabel, margin, y + 3, { align: 'left', maxWidth: contentWidth * 0.35 });

    // Arrow
    doc.setFontSize(10);
    doc.setTextColor(0, 184, 148);
    doc.text('→', pageWidth / 2, y + 3, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.text(toLabel, pageWidth - margin, y + 3, { align: 'right', maxWidth: contentWidth * 0.35 });

    y += 9;

    // Zone info (if different from stop names)
    if (ticket.fromZone && ticket.toZone) {
      const zoneText = `${ticket.fromZone.code} - ${ticket.fromZone.name}  →  ${ticket.toZone.code} - ${ticket.toZone.name}`;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(zoneText, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });
      y += 4;
    }

    // ─── DETAILS SECTION ───
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text('DÉTAILS', margin, y);
    y += 4;

    const leftCol = margin + 1;
    const rightCol = pageWidth / 2 + 2;

    const addDetailRow = (
      label: string,
      value: string,
      yPos: number,
      x: number
    ): number => {
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x, yPos);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x, yPos + 3.5);
      return yPos + 7;
    };

    // Left column
    y = addDetailRow('PASSAGER', ticket.passengerName || 'Non renseigné', y, leftCol);
    y = addDetailRow(
      'TÉLÉPHONE',
      ticket.passengerPhone ? ticket.passengerPhone : '—',
      y,
      leftCol
    );
    y = addDetailRow('VENDEUR', ticket.soldBy.name, y, leftCol);

    // Right column
    let yRight = y - 14;
    yRight = addDetailRow('PRIX', `${ticket.price.toLocaleString('fr-FR')} FCFA`, yRight, rightCol);
    yRight = addDetailRow(
      'PAIEMENT',
      ticket.paymentMethod === 'cash'
        ? 'Espèces'
        : ticket.paymentMethod === 'mobile'
          ? 'Mobile Money'
          : 'Carte',
      yRight,
      rightCol
    );

    y = Math.max(y, yRight) + 2;

    // ─── DATES SECTION ───
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text('VALIDITÉ', margin, y);
    y += 4;

    const formatDate = (date: Date) =>
      date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const validFrom = formatDate(new Date(ticket.validFrom));
    const validTo = formatDate(new Date(ticket.validTo));

    // Valid from
    doc.setFillColor(232, 245, 233); // Light green
    doc.roundedRect(margin, y - 2, contentWidth, 8, 1.5, 1.5, 'F');

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('DU', margin + 3, y + 0.8);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(validFrom, margin + 10, y + 0.8);

    // Arrow between dates
    doc.setTextColor(0, 184, 148);
    doc.setFontSize(8);
    doc.text('→', pageWidth / 2, y + 0.8, { align: 'center' });

    // Valid to
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('AU', pageWidth / 2 + 4, y + 0.8);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(validTo, pageWidth / 2 + 10, y + 0.8);

    y += 12;

    // ─── QR CODE SECTION ───
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // QR code (centered)
    const qrSize = 28;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);

    y += qrSize + 3;

    // QR label
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scannez ce code pour la validation', pageWidth / 2, y, { align: 'center' });

    y += 5;

    // ─── FOOTER ───
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setTextColor(140, 140, 140);
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'SmartTicket Bus — Système de billetterie intelligent',
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 3;
    doc.text(
      `Émis le ${formatDate(new Date(ticket.soldAt))}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 3;
    doc.text(
      `Vendeur: ${ticket.soldBy.name} (${ticket.soldBy.email})`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );

    // ─── OUTER BORDER ───
    doc.setDrawColor(15, 76, 117);
    doc.setLineWidth(0.8);
    doc.roundedRect(1, 1, pageWidth - 2, 198, 2, 2, 'S');

    // Dashed cut line near bottom
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, 190, pageWidth - margin, 190);
    doc.setLineDashPattern([], 0);

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(3.5);
    doc.text('— Découper ici —', pageWidth / 2, 192, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return PDF as downloadable response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket_${ticket.ticketNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating PDF ticket:', error);
    let message = 'Erreur lors de la génération du PDF';
    let status = 500;

    if (error instanceof Error) {
      // jsPDF often throws about missing canvas when addImage fails in Node.js
      if (error.message.includes('canvas') || error.message.includes('Canvas')) {
        message = 'Module graphique (canvas) manquant sur le serveur. Veuillez utiliser le bouton Imprimer.';
      } else if (error.message.includes('addImage')) {
        message = 'Erreur lors de l\'ajout du code QR au PDF. Veuillez utiliser le bouton Imprimer.';
      } else {
        message = error.message;
      }
    }
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
