import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/print/ticket?id=<ticketId> — Generate a high-quality PDF ticket for printing
// Fallback from the legacy /api/tickets/[id]/pdf route, with improved error handling
export const GET = withAuth(async (req, _user) => {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ID du ticket requis' },
        { status: 400 }
      );
    }

    // Fetch ticket with all relations
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        fromZone: { select: { id: true, name: true, code: true, color: true } },
        toZone: { select: { id: true, name: true, code: true, color: true } },
        fromStop: { select: { id: true, name: true, code: true } },
        toStop: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, number: true, color: true } },
        soldBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket introuvable' },
        { status: 404 }
      );
    }

    // Dynamic import for server-side only modules
    const QRCode = (await import('qrcode')).default;
    const { jsPDF } = await import('jspdf');

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
      width: 200,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    // Create PDF — ticket format 80mm × 200mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200],
    });

    const pw = 80;
    const m = 5;
    const cw = pw - m * 2;
    let y = 0;

    // ─── HEADER ───
    doc.setFillColor(15, 76, 117);
    doc.rect(0, 0, pw, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SmartTicket', m + 2, y + 10, { align: 'left' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('BUS', m + 2, y + 15, { align: 'left' });

    // Accent dot
    doc.setFillColor(0, 184, 148);
    doc.circle(pw - m - 4, y + 10, 4, 'F');

    y += 20;

    // ─── DIVIDER ───
    doc.setDrawColor(0, 184, 148);
    doc.setLineWidth(0.5);
    doc.line(m, y, pw - m, y);
    y += 6;

    // ─── TICKET NUMBER ───
    doc.setTextColor(15, 76, 117);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('N° DE BILLET', pw / 2, y, { align: 'center' });
    y += 5;

    doc.setFillColor(240, 248, 255);
    doc.roundedRect(m + 5, y - 3.5, cw - 10, 8, 2, 2, 'F');
    doc.setDrawColor(15, 76, 117);
    doc.setLineWidth(0.3);
    doc.roundedRect(m + 5, y - 3.5, cw - 10, 8, 2, 2, 'S');

    doc.setTextColor(15, 76, 117);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.ticketNumber, pw / 2, y + 1.5, { align: 'center' });
    y += 10;

    // ─── TYPE & STATUS BADGES ───
    const typeLabel = ticket.type === 'SUBSCRIPTION' ? 'ABONNEMENT' : 'UNITÉ';
    const statusMap: Record<string, string> = { VALID: 'VALIDE', USED: 'UTILISÉ', EXPIRED: 'EXPIRÉ', CANCELLED: 'ANNULÉ', INVALID: 'INVALIDE' };
    const statusLabel = statusMap[ticket.status] || ticket.status;
    const statusColors: Record<string, [number, number, number]> = {
      VALID: [0, 128, 0], USED: [150, 150, 150], CANCELLED: [200, 50, 50], EXPIRED: [180, 120, 0], INVALID: [200, 50, 50],
    };
    const sc = statusColors[ticket.status] || [150, 150, 150];

    doc.setFillColor(15, 76, 117);
    doc.roundedRect(m + 3, y - 2.5, 22, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(typeLabel, m + 14, y + 0.3, { align: 'center' });

    doc.setFillColor(sc[0], sc[1], sc[2]);
    doc.roundedRect(m + 28, y - 2.5, 22, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel, m + 39, y + 0.3, { align: 'center' });

    if (ticket.line) {
      doc.setFillColor(241, 196, 15);
      doc.roundedRect(m + 53, y - 2.5, 17, 5, 1.5, 1.5, 'F');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(6);
      doc.text(`Ligne ${ticket.line.number}`, m + 61.5, y + 0.3, { align: 'center' });
    }
    y += 8;

    // ─── ROUTE ───
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(m, y, pw - m, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('TRAJET', m, y);
    y += 3;

    const fromLabel = ticket.fromStop?.name || ticket.fromZone?.name || 'Non défini';
    const toLabel = ticket.toStop?.name || ticket.toZone?.name || 'Non défini';

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(fromLabel, m, y + 3, { align: 'left', maxWidth: cw * 0.35 });

    doc.setFontSize(10);
    doc.setTextColor(0, 184, 148);
    doc.text('→', pw / 2, y + 3, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.text(toLabel, pw - m, y + 3, { align: 'right', maxWidth: cw * 0.35 });
    y += 9;

    if (ticket.fromZone && ticket.toZone) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ticket.fromZone.code} - ${ticket.fromZone.name}  →  ${ticket.toZone.code} - ${ticket.toZone.name}`, pw / 2, y, { align: 'center', maxWidth: cw });
      y += 4;
    }

    // ─── DETAILS ───
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pw - m, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text('DÉTAILS', m, y);
    y += 4;

    const leftCol = m + 1;
    const rightCol = pw / 2 + 2;

    const addRow = (label: string, value: string, yy: number, x: number): number => {
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x, yy);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x, yy + 3.5);
      return yy + 7;
    };

    const formatFr = (d: Date) =>
      d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    y = addRow('PASSAGER', ticket.passengerName || 'Non renseigné', y, leftCol);
    y = addRow('TÉLÉPHONE', ticket.passengerPhone || '—', y, leftCol);
    y = addRow('VENDEUR', ticket.soldBy.name, y, leftCol);

    let yr = y - 14;
    const fmtPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
    yr = addRow('PRIX', fmtPrice(ticket.price), yr, rightCol);
    yr = addRow('PAIEMENT', ticket.paymentMethod === 'cash' ? 'Espèces' : ticket.paymentMethod === 'mobile' ? 'Mobile Money' : 'Carte', yr, rightCol);

    y = Math.max(y, yr) + 2;

    // ─── VALIDITY ───
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pw - m, y);
    y += 4;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text('VALIDITÉ', m, y);
    y += 4;

    doc.setFillColor(232, 245, 233);
    doc.roundedRect(m, y - 2, cw, 8, 1.5, 1.5, 'F');

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('DU', m + 3, y + 0.8);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatFr(new Date(ticket.validFrom)), m + 10, y + 0.8);

    doc.setTextColor(0, 184, 148);
    doc.setFontSize(8);
    doc.text('→', pw / 2, y + 0.8, { align: 'center' });

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('AU', pw / 2 + 4, y + 0.8);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatFr(new Date(ticket.validTo)), pw / 2 + 10, y + 0.8);
    y += 12;

    // ─── QR CODE ───
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pw - m, y);
    y += 4;

    const qrSize = 28;
    const qrX = (pw - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 3;

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scannez ce code pour la validation', pw / 2, y, { align: 'center' });
    y += 5;

    // ─── FOOTER ───
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pw - m, y);
    y += 4;

    doc.setTextColor(140, 140, 140);
    doc.setFontSize(4.5);
    doc.text('SmartTicket Bus — Système de billetterie intelligent', pw / 2, y, { align: 'center' });
    y += 3;
    doc.text(`Émis le ${formatFr(new Date(ticket.soldAt))}`, pw / 2, y, { align: 'center' });
    y += 3;
    doc.text(`Vendeur: ${ticket.soldBy.name} (${ticket.soldBy.email})`, pw / 2, y, { align: 'center' });

    // ─── OUTER BORDER ───
    doc.setDrawColor(15, 76, 117);
    doc.setLineWidth(0.8);
    doc.roundedRect(1, 1, pw - 2, 198, 2, 2, 'S');

    // Cut line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(m, 190, pw - m, 190);
    doc.setLineDashPattern([], 0);

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(3.5);
    doc.text('— Découper ici —', pw / 2, 192, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ticket_${ticket.ticketNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating print ticket PDF:', error);

    let message = 'Erreur lors de la génération du PDF';
    if (error instanceof Error) {
      if (error.message.includes('canvas') || error.message.includes('Canvas')) {
        message = 'Module graphique manquant. Utilisez l\'impression navigateur.';
      } else {
        message = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR', 'CONTROLLER']);
