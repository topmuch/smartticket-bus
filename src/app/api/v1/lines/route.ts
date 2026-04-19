import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/lines - List all active lines with counts (no auth required)
export async function GET() {
  try {
    const lines = await db.line.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            lineStops: true,
            schedules: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    // Return snake_case to match what transformResponse expects
    const data = lines.map((l) => ({
      id: l.id,
      number: l.number,
      name: l.name,
      color: l.color,
      is_active: l.isActive ? 1 : 0,
      stops_count: l._count.lineStops,
      schedule_count: l._count.schedules,
      created_at: l.createdAt.toISOString(),
      updated_at: l.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List lines error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
