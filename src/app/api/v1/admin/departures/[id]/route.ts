import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  getDepartureById,
  updateDeparture,
  deleteDeparture,
} from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// GET /api/v1/admin/departures/[id] — get a single departure
export const GET = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const departure = getDepartureById(id);
    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: departure });
  } catch (error) {
    console.error('Get departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// PUT /api/v1/admin/departures/[id] — update a departure
export const PUT = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { stationId, lineId, scheduledTime, platform, scheduleType, dayOfWeek, destination } = body;

    const updateData: Record<string, unknown> = {};
    if (stationId !== undefined) updateData.stationId = stationId;
    if (lineId !== undefined) updateData.lineId = lineId;
    if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
    if (platform !== undefined) updateData.platform = platform;
    if (scheduleType !== undefined) updateData.scheduleType = scheduleType;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = Number(dayOfWeek);
    if (destination !== undefined) updateData.destination = destination;

    const departure = updateDeparture(id, updateData);
    if (!departure) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: departure });
  } catch (error) {
    console.error('Update departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/v1/admin/departures/[id] — delete a departure
export const DELETE = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const success = deleteDeparture(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Départ non trouvé' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { message: 'Départ supprimé avec succès' },
    });
  } catch (error) {
    console.error('Delete departure error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
