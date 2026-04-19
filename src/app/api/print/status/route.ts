import { NextResponse } from 'next/server';
import { printQueue } from '@/lib/print/print-queue';
import { printService } from '@/lib/print/print-service';

// GET /api/print/status — Get print queue status and logs
export async function GET() {
  try {
    const queueState = printQueue.getState();
    const logs = printService.getLogs();

    // Get recent logs (last 50)
    const recentLogs = logs.slice(-50);

    return NextResponse.json({
      success: true,
      data: {
        queue: queueState,
        logs: recentLogs,
      },
    });
  } catch (error: unknown) {
    console.error('Error getting print status:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du statut d\'impression' },
      { status: 500 }
    );
  }
}

// POST /api/print/status — Clean up old print jobs
export async function POST() {
  try {
    const removed = printQueue.cleanup(3600000); // Remove jobs older than 1 hour
    return NextResponse.json({
      success: true,
      data: { removed },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: 'Erreur lors du nettoyage' },
      { status: 500 }
    );
  }
}
