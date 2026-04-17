import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/info - Public system info (NO AUTH REQUIRED)
export async function GET() {
  try {
    const [zonesCount, linesCount, activeLinesCount, stopsCount] = await Promise.all([
      db.zone.count({ where: { isActive: true } }),
      db.line.count(),
      db.line.count({ where: { isActive: true } }),
      db.stop.count({ where: { isActive: true } }),
    ]);

    // Try to get company name from system config
    let companyName = 'SmartTicket Bus';
    try {
      const config = await db.systemConfig.findUnique({
        where: { key: 'company_name' },
      });
      if (config?.value) {
        companyName = config.value;
      }
    } catch {
      // SystemConfig table might not have data yet
    }

    return NextResponse.json({
      success: true,
      data: {
        companyName,
        supportedZones: zonesCount,
        linesCount,
        activeLines: activeLinesCount,
        stopsCount,
      },
    });
  } catch (error) {
    console.error('Error getting public info:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des informations' },
      { status: 500 }
    );
  }
}
