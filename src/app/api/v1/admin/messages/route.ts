import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getMessages, createMessage, getStationById } from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// GET /api/v1/admin/messages — list all messages
export const GET = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const messages = getMessages();
    // Enrich with station info
    const data = messages.map((m) => ({
      ...m,
      station: m.stationId ? getStationById(m.stationId) || null : null,
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// POST /api/v1/admin/messages — create a message
export const POST = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const body = await req.json();
    const { stationId, message, priority, startDate, endDate } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Le message est requis' },
        { status: 400 }
      );
    }

    const msg = createMessage({
      stationId: stationId || null,
      message: String(message),
      priority: priority || 'info',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date().toISOString(),
    });

    const data = {
      ...msg,
      station: msg.stationId ? getStationById(msg.stationId) || null : null,
    };

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
