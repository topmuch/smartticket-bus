import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  getStationById,
  updateStation,
  deleteStation,
  countDeparturesForStation,
  countMessagesForStation,
} from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// GET /api/v1/admin/stations/[id] — get a single station
export const GET = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const station = getStationById(id);
    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Gare non trouvée' },
        { status: 404 }
      );
    }
    const data = {
      ...station,
      departuresCount: countDeparturesForStation(station.id),
      messagesCount: countMessagesForStation(station.id),
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get station error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// PUT /api/v1/admin/stations/[id] — update a station
export const PUT = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, city, timezone, slug, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (city !== undefined) updateData.city = String(city).trim();
    if (timezone !== undefined) updateData.timezone = String(timezone);
    if (slug !== undefined) updateData.slug = String(slug).trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const station = updateStation(id, updateData);
    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Gare non trouvée' },
        { status: 404 }
      );
    }

    const data = {
      ...station,
      departuresCount: countDeparturesForStation(station.id),
      messagesCount: countMessagesForStation(station.id),
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update station error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/v1/admin/stations/[id] — delete a station
export const DELETE = withAuth(async (req, _user, context: RouteContext) => {
  try {
    const { id } = await context.params;
    const success = deleteStation(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Gare non trouvée' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { message: 'Gare supprimée avec succès' },
    });
  } catch (error) {
    console.error('Delete station error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
