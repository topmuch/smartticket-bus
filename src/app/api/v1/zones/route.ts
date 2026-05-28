import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/zones - List all active zones (no auth required)
export async function GET() {
  try {
    const zones = await db.zone.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    // Return snake_case to match what transformResponse expects
    const data = zones.map((z) => ({
      id: z.id,
      code: z.code,
      name: z.name,
      description: z.description,
      color: z.color,
      is_active: z.isActive ? 1 : 0,
      created_at: z.createdAt.toISOString(),
      updated_at: z.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('List zones error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
