import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health/status endpoint to verify the app is working correctly.
 * Checks database connectivity and seed status.
 */
export async function GET() {
  try {
    const userCount = await db.user.count();
    const zoneCount = await db.zone.count();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      users: userCount,
      zones: zoneCount,
      seeded: userCount > 0 && zoneCount > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      seeded: false,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
