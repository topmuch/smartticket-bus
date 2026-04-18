import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/controls/stats - Controller statistics
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const controllerId = searchParams.get('controllerId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {};

    // CONTROLLER can only see their own stats
    if (user.role === 'CONTROLLER') {
      where.controllerId = user.userId;
    } else if (controllerId) {
      where.controllerId = controllerId;
    }

    if (from || to) {
      where.scannedAt = {};
      if (from) {
        (where.scannedAt as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.scannedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z');
      }
    }

    // Total counts
    const [totalScans, validCount, invalidCount] = await Promise.all([
      db.control.count({ where }),
      db.control.count({ where: { ...where, result: 'VALID' } }),
      db.control.count({
        where: {
          ...where,
          result: { not: 'VALID' },
        },
      }),
    ]);

    // Breakdown by result type
    const breakdownRaw = await db.control.groupBy({
      by: ['result'],
      where,
      _count: { result: true },
    });

    const breakdown: Record<string, number> = {};
    for (const item of breakdownRaw) {
      breakdown[item.result] = item._count.result;
    }

    // Daily scan counts
    const dailyScansRaw = await db.control.groupBy({
      by: ['scannedAt'],
      where,
      _count: { scannedAt: true },
      orderBy: { scannedAt: 'asc' },
    });

    // Group by date (not datetime) for daily counts
    const dailyCounts: Record<string, number> = {};
    for (const item of dailyScansRaw) {
      const dateKey = item.scannedAt.toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + item._count.scannedAt;
    }

    const dailyScanCounts = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        totalScans,
        validCount,
        invalidCount,
        validRate: totalScans > 0 ? ((validCount / totalScans) * 100).toFixed(1) : '0',
        breakdown,
        dailyScanCounts,
      },
    });
  } catch (error) {
    console.error('Error getting control stats:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
