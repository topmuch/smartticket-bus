import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';
import { ControlResult } from '@prisma/client';

interface ControlData {
  qrString: string;
  result: ControlResult;
  reason?: string;
  latitude?: number;
  longitude?: number;
  batchId?: string;
  scannedAt?: string;
}

// POST /api/controls/sync - Sync batch of offline controls
export const POST = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const body = await req.json();
    const { controls } = body as { controls: ControlData[] };

    if (!controls || !Array.isArray(controls) || controls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Liste de contrôles requise' },
        { status: 400 }
      );
    }

    if (controls.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Maximum 500 contrôles par synchronisation' },
        { status: 400 }
      );
    }

    // Validate all controls
    for (const ctrl of controls) {
      if (!ctrl.qrString || !ctrl.result) {
        return NextResponse.json(
          { success: false, error: 'Chaque contrôle doit avoir qrString et result' },
          { status: 400 }
        );
      }
      if (!Object.values(ControlResult).includes(ctrl.result)) {
        return NextResponse.json(
          { success: false, error: `Résultat invalide: ${ctrl.result}` },
          { status: 400 }
        );
      }
    }

    // Pre-fetch all unique QR strings to find ticket mappings
    const qrStrings = [...new Set(controls.map(c => c.qrString))];
    const tickets = await db.ticket.findMany({
      where: {
        OR: [
          { qrToken: { in: qrStrings } },
          { ticketNumber: { in: qrStrings } },
          { id: { in: qrStrings } },
        ],
      },
      select: { id: true, qrToken: true, ticketNumber: true },
    });

    const ticketMap = new Map<string, string>();
    for (const ticket of tickets) {
      if (ticket.qrToken) ticketMap.set(ticket.qrToken, ticket.id);
      if (ticket.ticketNumber) ticketMap.set(ticket.ticketNumber, ticket.id);
      ticketMap.set(ticket.id, ticket.id);
    }

    const now = new Date();
    const syncBatchId = `sync-${user.userId}-${now.toISOString()}`;

    const controlRecords = controls.map(ctrl => {
      const ticketId = ticketMap.get(ctrl.qrString) || null;
      return {
        ticketId,
        qrData: ctrl.qrString,
        result: ctrl.result as ControlResult,
        reason: ctrl.reason || null,
        controllerId: user.userId,
        latitude: ctrl.latitude ?? null,
        longitude: ctrl.longitude ?? null,
        batchId: ctrl.batchId || syncBatchId,
        synced: true,
        syncedAt: now,
        scannedAt: ctrl.scannedAt ? new Date(ctrl.scannedAt) : now,
      };
    });

    const result = await db.$transaction(async (tx) => {
      const created = await tx.control.createMany({
        data: controlRecords,
      });
      return created.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedCount: result,
        batchId: syncBatchId,
      },
    });
  } catch (error) {
    console.error('Error syncing controls:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la synchronisation des contrôles' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
