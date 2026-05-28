import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/public/info - Public app stats (no auth required)
export async function GET() {
  try {
    const [zonesCount, linesCount, stopsCount] = await Promise.all([
      db.zone.count({ where: { isActive: true } }),
      db.line.count({ where: { isActive: true } }),
      db.stop.count({ where: { isActive: true } }),
    ]);

    // Get app name from system config
    let companyName = 'SmartTicket Bus';
    let currency = 'FCFA';
    try {
      const configs = await db.systemConfig.findMany({
        where: { key: { in: ['company_name', 'currency'] } },
      });
      for (const c of configs) {
        if (c.key === 'company_name') companyName = c.value;
        if (c.key === 'currency') currency = c.value;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      data: {
        app_name: companyName,
        version: '1.0.0',
        zones_count: zonesCount,
        lines_count: linesCount,
        stops_count: stopsCount,
        currency,
        cities: ['Dakar'],
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
