import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';

function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/reports/export - Export data as CSV
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'revenue'; // revenue | controls | tickets
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const format = searchParams.get('format') || 'csv';

    if (format !== 'csv') {
      return NextResponse.json(
        { success: false, error: 'Seul le format CSV est supporté' },
        { status: 400 }
      );
    }

    let csvContent = '';
    let filename = '';

    if (type === 'revenue') {
      filename = `rapport_revenus_${new Date().toISOString().split('T')[0]}.csv`;

      const where: Record<string, unknown> = {
        status: { not: 'CANCELLED' },
      };
      if (from || to) {
        where.soldAt = {};
        if (from) (where.soldAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.soldAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z');
      }

      const tickets = await db.ticket.findMany({
        where,
        include: {
          soldBy: { select: { name: true } },
          line: { select: { name: true, number: true } },
          fromStop: { select: { name: true } },
          toStop: { select: { name: true } },
          fromZone: { select: { name: true } },
          toZone: { select: { name: true } },
        },
        orderBy: { soldAt: 'asc' },
      });

      const headers = [
        'Date de vente', 'N° Billet', 'Type', 'Passager', 'Ligne',
        'Arrêt Départ', 'Arrêt Arrivée', 'Zone Départ', 'Zone Arrivée',
        'Prix', 'Montant Payé', 'Monnaie', 'Méthode Paiement',
        'Statut', 'Vendeur',
      ];

      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const t of tickets) {
        const row = [
          t.soldAt.toISOString(),
          t.ticketNumber,
          t.type,
          t.passengerName || '',
          t.line ? `${t.line.number} - ${t.line.name}` : '',
          t.fromStop?.name || '',
          t.toStop?.name || '',
          t.fromZone?.name || '',
          t.toZone?.name || '',
          t.price,
          t.amountPaid,
          t.changeGiven,
          t.paymentMethod,
          t.status,
          t.soldBy?.name || '',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }

    } else if (type === 'controls') {
      filename = `rapport_controles_${new Date().toISOString().split('T')[0]}.csv`;

      const where: Record<string, unknown> = {};
      if (from || to) {
        where.scannedAt = {};
        if (from) (where.scannedAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.scannedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z');
      }

      const controls = await db.control.findMany({
        where,
        include: {
          controller: { select: { name: true } },
          ticket: {
            select: {
              ticketNumber: true,
              type: true,
              passengerName: true,
              line: { select: { name: true, number: true } },
            },
          },
        },
        orderBy: { scannedAt: 'asc' },
      });

      const headers = [
        'Date Scan', 'Contrôleur', 'Résultat', 'Motif',
        'N° Billet', 'Type Billet', 'Passager', 'Ligne',
        'Latitude', 'Longitude', 'Synchronisé',
      ];

      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const c of controls) {
        const row = [
          c.scannedAt.toISOString(),
          c.controller?.name || '',
          c.result,
          c.reason || '',
          c.ticket?.ticketNumber || '',
          c.ticket?.type || '',
          c.ticket?.passengerName || '',
          c.ticket?.line ? `${c.ticket.line.number} - ${c.ticket.line.name}` : '',
          c.latitude ?? '',
          c.longitude ?? '',
          c.synced ? 'Oui' : 'Non',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }

    } else if (type === 'tickets') {
      filename = `rapport_billets_${new Date().toISOString().split('T')[0]}.csv`;

      const where: Record<string, unknown> = {};
      if (from || to) {
        where.soldAt = {};
        if (from) (where.soldAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.soldAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z');
      }

      const tickets = await db.ticket.findMany({
        where,
        include: {
          soldBy: { select: { name: true } },
          line: { select: { name: true, number: true } },
          fromStop: { select: { name: true } },
          toStop: { select: { name: true } },
          subscription: { select: { startDate: true, endDate: true, isActive: true } },
        },
        orderBy: { soldAt: 'asc' },
      });

      const headers = [
        'N° Billet', 'Type', 'Statut', 'Passager', 'Téléphone',
        'Ligne', 'Départ', 'Arrivée', 'Prix',
        'Début Validité', 'Fin Validité', 'Vendeur', 'Date Vente',
        'Début Abonnement', 'Fin Abonnement', 'Abonnement Actif',
      ];

      csvContent = headers.map(escapeCSV).join(',') + '\n';

      for (const t of tickets) {
        const row = [
          t.ticketNumber,
          t.type,
          t.status,
          t.passengerName || '',
          t.passengerPhone || '',
          t.line ? `${t.line.number} - ${t.line.name}` : '',
          t.fromStop?.name || '',
          t.toStop?.name || '',
          t.price,
          t.validFrom.toISOString(),
          t.validTo.toISOString(),
          t.soldBy?.name || '',
          t.soldAt.toISOString(),
          t.subscription?.startDate?.toISOString() || '',
          t.subscription?.endDate?.toISOString() || '',
          t.subscription?.isActive ? 'Oui' : (t.subscription ? 'Non' : ''),
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      }

    } else {
      return NextResponse.json(
        { success: false, error: 'Type d\'export invalide. Choisissez: revenue, controls, tickets' },
        { status: 400 }
      );
    }

    // Add BOM for proper UTF-8 display in Excel
    const bom = '\uFEFF';

    return new NextResponse(bom + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
