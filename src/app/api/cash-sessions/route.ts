import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/cash-sessions - List cash sessions with filters
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const operatorId = searchParams.get('operatorId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.CashSessionWhereInput = {};

    if (operatorId) {
      where.operatorId = operatorId;
    }

    if (status) {
      where.status = status as any;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        (where.date as any).gte = new Date(from);
      }
      if (to) {
        (where.date as any).lte = new Date(to + 'T23:59:59.999Z');
      }
    }

    const sessions = await db.cashSession.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    console.error('Error listing cash sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des sessions de caisse' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// POST /api/cash-sessions - Open a new cash session
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { openingBalance } = body;

    if (openingBalance === undefined || openingBalance < 0) {
      return NextResponse.json(
        { success: false, error: 'Solde d\'ouverture invalide' },
        { status: 400 }
      );
    }

    // Check if operator already has an open session
    const existingOpen = await db.cashSession.findFirst({
      where: {
        operatorId: user.userId,
        status: 'OPEN',
      },
    });

    if (existingOpen) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà une session de caisse ouverte' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const session = await db.cashSession.create({
      data: {
        operatorId: user.userId,
        date: today,
        status: 'OPEN',
        openingBalance: openingBalance || 0,
        openedAt: new Date(),
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'OPEN_CASH_SESSION',
        entity: 'CashSession',
        entityId: session.id,
        details: JSON.stringify({
          sessionId: session.id,
          openingBalance,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: session,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error opening cash session:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'ouverture de la session de caisse' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
