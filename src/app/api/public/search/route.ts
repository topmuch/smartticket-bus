import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/search - Search public info (NO AUTH REQUIRED)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // line | stop | all

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Paramètre de recherche "q" requis' },
        { status: 400 }
      );
    }

    const query = q.trim();
    const results: { lines: unknown[]; stops: unknown[] } = { lines: [], stops: [] };

    if (type === 'line' || type === 'all') {
      const lines = await db.line.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { number: { contains: query } },
          ],
        },
        select: {
          id: true,
          number: true,
          name: true,
          color: true,
          _count: {
            select: {
              lineStops: true,
              schedules: true,
            },
          },
        },
        take: 20,
        orderBy: { number: 'asc' },
      });

      results.lines = lines;
    }

    if (type === 'stop' || type === 'all') {
      const stops = await db.stop.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query } },
            { code: { contains: query } },
          ],
        },
        include: {
          zone: { select: { id: true, name: true, code: true, color: true } },
        },
        take: 20,
        orderBy: { name: 'asc' },
      });

      results.stops = stops.map(stop => ({
        id: stop.id,
        name: stop.name,
        code: stop.code,
        latitude: stop.latitude,
        longitude: stop.longitude,
        zone: stop.zone,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        ...results,
        totalResults: results.lines.length + results.stops.length,
      },
    });
  } catch (error) {
    console.error('Error searching public info:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}
