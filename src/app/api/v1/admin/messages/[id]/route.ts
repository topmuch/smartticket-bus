import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  getMessageById,
  updateMessage,
  deleteMessage,
  getStationById,
} from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// PUT /api/v1/admin/messages/[id] — update a message
export const PUT = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { stationId, message, priority, startDate, endDate } = body;

    const updateData: Record<string, unknown> = {};
    if (stationId !== undefined) updateData.stationId = stationId || null;
    if (message !== undefined) updateData.message = String(message);
    if (priority !== undefined) updateData.priority = priority;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    const msg = updateMessage(id, updateData);
    if (!msg) {
      return NextResponse.json(
        { success: false, error: 'Message non trouvé' },
        { status: 404 }
      );
    }

    const data = {
      ...msg,
      station: msg.stationId ? getStationById(msg.stationId) || null : null,
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/v1/admin/messages/[id] — delete a message
export const DELETE = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const success = deleteMessage(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Message non trouvé' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { message: 'Message supprimé avec succès' },
    });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
