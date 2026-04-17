import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/offline/data - Download blacklist & whitelist for offline validation
// Requires CONTROLLER or SUPERADMIN role
export const GET = withAuth(async (req, user) => {
  try {
    // 1. Blacklist: cancelled/revoked ticket IDs
    const cancelledTickets = await db.ticket.findMany({
      where: {
        status: { in: ['CANCELLED', 'INVALID'] },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const blacklist = cancelledTickets.map((t) => ({
      ticketId: t.id,
      reason: t.status === 'CANCELLED' ? 'Ticket annulé' : 'Ticket invalide',
    }));

    // 2. Whitelist: active subscription tickets that are not expired
    const activeSubscriptions = await db.ticket.findMany({
      where: {
        type: 'SUBSCRIPTION',
        status: 'VALID',
        validTo: { gte: new Date() },
      },
      select: {
        id: true,
        validTo: true,
      },
    });

    const whitelist = activeSubscriptions.map((t) => ({
      ticketId: t.id,
      expiresAt: t.validTo.getTime(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        blacklist,
        whitelist,
        downloadedAt: new Date().toISOString(),
        downloadedBy: user.userId,
      },
    });
  } catch (error) {
    console.error('Error fetching offline data:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du téléchargement des données hors-ligne' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
