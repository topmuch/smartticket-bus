import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';

// GET /api/reports/revenue - Revenue report
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const groupBy = searchParams.get('groupBy') || 'day'; // day | week | month
    const lineId = searchParams.get('lineId');
    const zoneId = searchParams.get('zoneId');
    const operatorId = searchParams.get('operatorId');

    const where: Record<string, unknown> = {
      status: { not: 'CANCELLED' },
    };

    if (from || to) {
      where.soldAt = {};
      if (from) {
        (where.soldAt as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.soldAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z');
      }
    }

    if (lineId) {
      where.lineId = lineId;
    }

    if (zoneId) {
      where.OR = [
        { fromZoneId: zoneId },
        { toZoneId: zoneId },
      ];
    }

    if (operatorId) {
      where.soldById = operatorId;
    }

    // Fetch all tickets matching criteria
    const tickets = await db.ticket.findMany({
      where,
      select: {
        price: true,
        soldAt: true,
        type: true,
        lineId: true,
        fromZoneId: true,
        toZoneId: true,
        soldById: true,
      },
      orderBy: { soldAt: 'asc' },
    });

    // Group revenue data
    const grouped: Record<string, { revenue: number; tickets: number }> = {};

    for (const ticket of tickets) {
      let key: string;

      const date = ticket.soldAt;
      switch (groupBy) {
        case 'week': {
          // Get ISO week number
          const d = new Date(date.getTime());
          const dayOfWeek = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
          break;
        }
        case 'month': {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        }
        default: { // day
          key = date.toISOString().split('T')[0];
          break;
        }
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, tickets: 0 };
      }
      grouped[key].revenue += ticket.price;
      grouped[key].tickets += 1;
    }

    const revenueData = Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.revenue * 100) / 100,
        tickets: data.tickets,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Summary totals
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    const totalTickets = revenueData.reduce((sum, item) => sum + item.tickets, 0);

    return NextResponse.json({
      success: true,
      data: {
        revenueData,
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalTickets,
          groupBy,
          periodCount: revenueData.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting revenue report:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du rapport de revenus' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
