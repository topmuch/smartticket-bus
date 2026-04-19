import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';

function getPeriodRange(period: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'week': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() + 1); // Monday
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    default: {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// GET /api/reports/dashboard - Dashboard summary stats
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';

    const { start, end } = getPeriodRange(period);

    // Total revenue and tickets sold in period
    const ticketStats = await db.ticket.aggregate({
      where: {
        soldAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      _sum: { price: true },
      _count: true,
    });

    const totalRevenue = ticketStats._sum.price || 0;
    const totalTicketsSold = ticketStats._count;

    // Total controls in period
    const totalControls = await db.control.count({
      where: {
        scannedAt: { gte: start, lte: end },
      },
    });

    // Valid controls
    const validControls = await db.control.count({
      where: {
        scannedAt: { gte: start, lte: end },
        result: 'VALID',
      },
    });

    const validControlRate = totalControls > 0
      ? Math.round((validControls / totalControls) * 1000) / 10
      : 0;

    // Revenue by day (last 7 or 30 days)
    const daysBack = period === 'today' ? 1 : period === 'week' ? 7 : 30;
    const revenueByDayStart = new Date(start);
    revenueByDayStart.setDate(revenueByDayStart.getDate() - daysBack);

    const revenueByDayRaw = await db.ticket.groupBy({
      by: ['soldAt'],
      where: {
        soldAt: { gte: revenueByDayStart, lte: end },
        status: { not: 'CANCELLED' },
      },
      _sum: { price: true },
      _count: true,
    });

    const revenueByDayMap: Record<string, { revenue: number; count: number }> = {};
    for (const item of revenueByDayRaw) {
      const dateKey = item.soldAt.toISOString().split('T')[0];
      if (!revenueByDayMap[dateKey]) {
        revenueByDayMap[dateKey] = { revenue: 0, count: 0 };
      }
      revenueByDayMap[dateKey].revenue += item._sum.price || 0;
      revenueByDayMap[dateKey].count += item._count;
    }

    const revenueByDay = Object.entries(revenueByDayMap)
      .map(([date, data]) => ({ date, revenue: data.revenue, tickets: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Tickets by type
    const ticketsByTypeRaw = await db.ticket.groupBy({
      by: ['type'],
      where: {
        soldAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      _count: true,
    });

    const ticketsByType: Record<string, number> = {};
    for (const item of ticketsByTypeRaw) {
      ticketsByType[item.type] = item._count;
    }

    // Top lines by revenue
    const topLinesRaw = await db.ticket.groupBy({
      by: ['lineId'],
      where: {
        soldAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
        lineId: { not: null },
      },
      _sum: { price: true },
      _count: true,
      orderBy: { _sum: { price: 'desc' } },
      take: 10,
    });

    const topLines = await Promise.all(
      topLinesRaw.map(async (item) => {
        const line = item.lineId
          ? await db.line.findUnique({ where: { id: item.lineId }, select: { id: true, name: true, number: true } })
          : null;
        return {
          lineId: item.lineId,
          lineName: line?.name || 'Sans ligne',
          lineNumber: line?.number || '',
          revenue: item._sum.price || 0,
          tickets: item._count,
        };
      })
    );

    // Top zones by revenue
    const topZonesRaw = await db.ticket.groupBy({
      by: ['toZoneId'],
      where: {
        soldAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
        toZoneId: { not: null },
      },
      _sum: { price: true },
      _count: true,
      orderBy: { _sum: { price: 'desc' } },
      take: 10,
    });

    const topZones = await Promise.all(
      topZonesRaw.map(async (item) => {
        const zone = item.toZoneId
          ? await db.zone.findUnique({ where: { id: item.toZoneId }, select: { id: true, name: true, code: true } })
          : null;
        return {
          zoneId: item.toZoneId,
          zoneName: zone?.name || 'Sans zone',
          zoneCode: zone?.code || '',
          revenue: item._sum.price || 0,
          tickets: item._count,
        };
      })
    );

    // Active subscriptions
    const activeSubscriptions = await db.subscription.count({
      where: {
        isActive: true,
        endDate: { gte: new Date() },
      },
    });

    // Open cash sessions
    const openCashSessions = await db.cashSession.count({
      where: { status: 'OPEN' },
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
        totalRevenue,
        totalTicketsSold,
        totalControls,
        validControlRate,
        revenueByDay,
        ticketsByType,
        topLines,
        topZones,
        activeSubscriptions,
        openCashSessions,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du tableau de bord' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
