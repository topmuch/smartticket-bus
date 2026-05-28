import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/print/receipt?sessionId=<cashSessionId> — Generate a receipt PDF for cash session close
export const GET = withAuth(async (req, _user) => {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'ID de session de caisse requis' },
        { status: 400 }
      );
    }

    // Fetch cash session with all ticket data
    const session = await db.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        operator: { select: { id: true, name: true, email: true } },
        tickets: {
          orderBy: { soldAt: 'asc' },
          include: {
            fromZone: { select: { name: true } },
            toZone: { select: { name: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session de caisse introuvable' },
        { status: 404 }
      );
    }

    // Dynamic import
    const { jsPDF } = await import('jspdf');

    const fmtPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // A4 format
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210;
    const m = 15;
    const cw = pw - m * 2;
    let y = 20;

    // ─── HEADER ───
    doc.setFillColor(15, 76, 117);
    doc.rect(0, 0, pw, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SmartTicket Bus', m, y + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('REÇU DE CLÔTURE DE CAISSE', m, y + 13);

    const dateStr = new Date(session.openedAt).toISOString().slice(0, 10).replace(/-/g, '');
    doc.setFontSize(8);
    doc.text(`RC-${dateStr}`, m, y + 19);

    y = 42;

    // ─── SESSION INFO ───
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations de la Session', m, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const infoPairs: [string, string][] = [
      ['Opérateur', session.operator.name],
      ['Date d\'ouverture', fmtDate(new Date(session.openedAt))],
      ['Date de clôture', session.closedAt ? fmtDate(new Date(session.closedAt)) : 'En cours'],
      ['Fond de caisse', fmtPrice(session.openingBalance)],
    ];

    for (const [label, value] of infoPairs) {
      doc.setTextColor(130, 130, 130);
      doc.text(label + ' :', m + 2, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(value, m + 50, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
    }

    y += 4;

    // ─── FINANCIAL SUMMARY ───
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(m, y, pw - m, y);
    y += 6;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé Financier', m, y);
    y += 8;

    // Summary grid
    const totalCash = session.tickets.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.amountPaid, 0);
    const totalMobile = session.tickets.filter(t => t.paymentMethod === 'mobile').reduce((s, t) => s + t.price, 0);
    const totalCard = session.tickets.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.price, 0);
    const totalChange = session.tickets.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.changeGiven, 0);

    const summaryItems: [string, number, string][] = [
      ['Total tickets vendus', session.totalSales, 'text'],
      ['Chiffre d\'affaires total', session.totalRevenue, 'green'],
      ['Encaissement espèces', totalCash, 'text'],
      ['Mobile Money', totalMobile, 'text'],
      ['Carte bancaire', totalCard, 'text'],
      ['Monnaie rendue', totalChange, 'text'],
    ];

    for (const [label, value, color] of summaryItems) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(m, y - 3, cw, 8, 1, 1, 'F');

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(label, m + 3, y + 1.5);

      if (color === 'green') {
        doc.setTextColor(0, 128, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
      } else if (typeof value === 'number' && value >= 1000) {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(fmtPrice(value), pw - m - 3, y + 1.5, { align: 'right' });
        y += 10;
        continue;
      } else {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
      }

      doc.text(typeof value === 'number' && value >= 1000 ? fmtPrice(value) : String(value), pw - m - 3, y + 1.5, { align: 'right' });
      y += 10;
    }

    y += 2;

    // Actual cash and difference (if available)
    if (session.actualCash !== null && session.actualCash !== undefined) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(m, y - 3, cw, 8, 1, 1, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Caisse réelle', m + 3, y + 1.5);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtPrice(session.actualCash), pw - m - 3, y + 1.5, { align: 'right' });
      y += 10;

      const diff = session.actualCash - ((session.openingBalance || 0) + totalCash - totalChange);
      doc.setFillColor(diff >= 0 ? 232 : 254, diff >= 0 ? 245 : 242, diff >= 0 ? 233 : 242);
      doc.roundedRect(m, y - 3, cw, 8, 1, 1, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Écart', m + 3, y + 1.5);
      doc.setTextColor(diff >= 0 ? 0 : 200, diff >= 0 ? 128 : 50, diff >= 0 ? 0 : 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${diff >= 0 ? '+' : ''}${fmtPrice(diff)}`, pw - m - 3, y + 1.5, { align: 'right' });
      y += 12;
    }

    y += 4;

    // ─── TICKET DETAILS TABLE ───
    doc.setDrawColor(200, 200, 200);
    doc.line(m, y, pw - m, y);
    y += 6;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Détail des Tickets (${session.tickets.length})`, m, y);
    y += 8;

    // Table header
    doc.setFillColor(15, 76, 117);
    doc.rect(m, y - 3, cw, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const colWidths = [10, 55, 35, 25, 30, 35];
    const colX = [m];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }

    const headers = ['#', 'Trajet', 'Passager', 'Prix', 'Paiement', 'Heure'];
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 2, y + 1);
    });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    session.tickets.forEach((t, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(m, y - 3, cw, 7, 'F');
      }

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(6.5);
      doc.text(String(idx + 1), colX[0] + 2, y + 1);
      doc.text(`${t.fromZone?.name || '?'} → ${t.toZone?.name || '?'}`, colX[1] + 2, y + 1, { maxWidth: 50 });
      doc.text(t.passengerName || 'Anonyme', colX[2] + 2, y + 1, { maxWidth: 30 });

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtPrice(t.price), colX[3] + 2, y + 1);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const pmLabel = t.paymentMethod === 'cash' ? 'Espèces' : t.paymentMethod === 'mobile' ? 'Mobile' : 'Carte';
      doc.text(pmLabel, colX[4] + 2, y + 1);
      doc.text(fmtDate(new Date(t.soldAt)), colX[5] + 2, y + 1);

      y += 7;
    });

    // Total row
    y += 2;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(m, y, pw - m, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text('TOTAL', m + 2, y + 1);
    doc.setTextColor(0, 128, 0);
    doc.setFontSize(11);
    doc.text(fmtPrice(session.totalRevenue), pw - m - 3, y + 1, { align: 'right' });
    y += 12;

    // ─── SIGNATURES ───
    y += 10;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.3);

    const sigY = y + 15;
    doc.line(m + 10, sigY, m + 80, sigY);
    doc.line(pw - m - 80, sigY, pw - m - 10, sigY);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Opérateur', m + 35, sigY + 5, { align: 'center' });
    doc.text('Responsable', pw - m - 35, sigY + 5, { align: 'center' });

    // ─── FOOTER ───
    const footerY = 285;
    doc.setDrawColor(200, 200, 200);
    doc.line(m, footerY, pw - m, footerY);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text('SmartTicket Bus — Reçu de clôture de caisse', pw / 2, footerY + 4, { align: 'center' });
    doc.text(`Généré le ${fmtDate(new Date())}`, pw / 2, footerY + 9, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recu_caisse_RC-${dateStr}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating receipt PDF:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la génération du reçu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}, ['SUPERADMIN', 'OPERATOR']);
