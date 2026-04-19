import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';
import { ControlResult } from '@prisma/client';

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

// GET /api/reports/controls - Controls report
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period');
    const controllerId = searchParams.get('controllerId');
    const result = searchParams.get('result') as ControlResult | null;

    const where: Record<string, unknown> = {};

    // Support both explicit from/to and period shortcuts
    let effectiveFrom = from;
    let effectiveTo = to;
    if ((!effectiveFrom && !effectiveTo) && period) {
      const { start, end } = getPeriodRange(period);
      effectiveFrom = start.toISOString();
      effectiveTo = end.toISOString();
    }

    if (effectiveFrom || effectiveTo) {
      where.scannedAt = {};
      if (effectiveFrom) {
        (where.scannedAt as Record<string, unknown>).gte = new Date(effectiveFrom);
      }
      if (effectiveTo) {
        (where.scannedAt as Record<string, unknown>).lte = new Date(effectiveTo);
      }
    }

    if (controllerId) {
      where.controllerId = controllerId;
    }

    if (result) {
      where.result = result;
    }

    // Total controls and valid/invalid counts
    const [totalControls, validCount, invalidCount] = await Promise.all([
      db.control.count({ where }),
      db.control.count({ where: { ...where, result: 'VALID' } }),
      db.control.count({
        where: { ...where, result: { not: 'VALID' } },
      }),
    ]);

    // Fraud rate = FALSIFIED + ALREADY_USED / total
    const fraudCount = await db.control.count({
      where: {
        ...where,
        result: { in: ['FALSIFIED', 'ALREADY_USED'] },
      },
    });

    const fraudRate = totalControls > 0
      ? Math.round((fraudCount / totalControls) * 1000) / 10
      : 0;

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

    // Controls by controller
    const byControllerRaw = await db.control.groupBy({
      by: ['controllerId'],
      where,
      _count: { controllerId: true },
      orderBy: { _count: { controllerId: 'desc' } },
    });

    const controllerIds = byControllerRaw.map(c => c.controllerId);
    const controllers = await db.user.findMany({
      where: { id: { in: controllerIds } },
      select: { id: true, name: true },
    });

    const controllerMap = new Map(controllers.map(c => [c.id, c.name]));

    const controlsByController = byControllerRaw.map(item => ({
      controllerId: item.controllerId,
      controllerName: controllerMap.get(item.controllerId) || 'Inconnu',
      totalControls: item._count.controllerId,
    }));

    // Controls by line (via ticket)
    const byLineRaw = await db.control.groupBy({
      by: ['ticketId'],
      where: { ...where, ticketId: { not: null } },
      _count: { ticketId: true },
    });

    const ticketIds = byLineRaw.map(c => c.ticketId);
    const ticketsWithLine = await db.ticket.findMany({
      where: { id: { in: ticketIds as string[] } },
      select: { id: true, lineId: true },
    });

    const lineCountMap: Record<string, number> = {};
    for (const item of byLineRaw) {
      const ticket = ticketsWithLine.find(t => t.id === item.ticketId);
      if (ticket?.lineId) {
        lineCountMap[ticket.lineId] = (lineCountMap[ticket.lineId] || 0) + item._count.ticketId;
      }
    }

    const lineIds = Object.keys(lineCountMap);
    const lines = await db.line.findMany({
      where: { id: { in: lineIds } },
      select: { id: true, name: true, number: true },
    });

    const lineMap = new Map(lines.map(l => [l.id, { name: l.name, number: l.number }]));

    const controlsByLine = Object.entries(lineCountMap)
      .map(([lineId, count]) => ({
        lineId,
        lineName: lineMap.get(lineId)?.name || 'Inconnu',
        lineNumber: lineMap.get(lineId)?.number || '',
        totalControls: count,
      }))
      .sort((a, b) => b.totalControls - a.totalControls);

    return NextResponse.json({
      success: true,
      data: {
        totalControls,
        validCount,
        invalidCount,
        validRate: totalControls > 0
          ? Math.round((validCount / totalControls) * 1000) / 10
          : 0,
        fraudRate,
        fraudCount,
        breakdown,
        controlsByController,
        controlsByLine,
      },
    });
  } catch (error) {
    console.error('Error getting controls report:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du rapport de contrôles' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
