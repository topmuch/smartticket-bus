import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { updateDepartureDelay } from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// PUT /api/v1/admin/departures/[id]/delay — update departure delay
export const PUT = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { delayMinutes, status } = body;

    const depDelay = delayMinutes != null ? Number(delayMinutes) : 0;
    const depStatus = status || (depDelay > 0 ? 'delayed' : 'on_time');

    const departure = updateDepartureDelay(id, depDelay, depStatus);
    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: departure });
  } catch (error) {
    console.error('Update departure delay error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
