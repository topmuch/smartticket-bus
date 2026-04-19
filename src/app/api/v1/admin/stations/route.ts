import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  getStations,
  createStation,
  countDeparturesForStation,
  countMessagesForStation,
} from '@/lib/station-db';
import type { RouteContext } from '@/lib/middleware';

// GET /api/v1/admin/stations — list all stations with counts
export const GET = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const stations = getStations();
    const data = stations.map((s) => ({
      ...s,
      departuresCount: countDeparturesForStation(s.id),
      messagesCount: countMessagesForStation(s.id),
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List stations error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// POST /api/v1/admin/stations — create a station
export const POST = withAuth(async (req, _user, _context: RouteContext) => {
  try {
    const body = await req.json();
    const { name, city, timezone, slug } = body;

    if (!name || !city || !slug) {
      return NextResponse.json(
        { success: false, error: 'Le nom, la ville et le slug sont requis' },
        { status: 400 }
      );
    }

    const station = createStation({
      name: name.trim(),
      city: city.trim(),
      timezone: timezone || 'Africa/Dakar',
      slug: slug.trim(),
      isActive: true,
    });

    const data = {
      ...station,
      departuresCount: 0,
      messagesCount: 0,
    };

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Create station error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
