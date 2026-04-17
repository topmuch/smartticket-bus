import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// GET /api/cash-sessions/[id] - Get cash session by ID with tickets
export const GET = withAuth(async (req) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de la session de caisse requis' },
        { status: 400 }
      );
    }

    const session = await db.cashSession.findUnique({
      where: { id },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
        tickets: {
          orderBy: { soldAt: 'desc' },
          include: {
            soldBy: {
              select: { id: true, name: true },
            },
            fromZone: { select: { id: true, name: true, code: true } },
            toZone: { select: { id: true, name: true, code: true } },
            line: { select: { id: true, name: true, number: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session de caisse introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('Error fetching cash session:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la session de caisse' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);

// PUT /api/cash-sessions/[id] - Close cash session
export const PUT = withAuth(async (req, user) => {
  try {
    const id = req.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de la session de caisse requis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { actualCash, notes } = body;

    if (actualCash === undefined || actualCash < 0) {
      return NextResponse.json(
        { success: false, error: 'Montant réel en caisse invalide' },
        { status: 400 }
      );
    }

    const session = await db.cashSession.findUnique({
      where: { id },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session de caisse introuvable' },
        { status: 404 }
      );
    }

    if (session.status === 'CLOSED') {
      return NextResponse.json(
        { success: false, error: 'Cette session de caisse est déjà fermée' },
        { status: 400 }
      );
    }

    // Only the operator who opened the session or SUPERADMIN can close it
    if (user.role !== 'SUPERADMIN' && session.operatorId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez fermer que vos propres sessions de caisse' },
        { status: 403 }
      );
    }

    // Calculate totals from tickets in this session
    const tickets = await db.ticket.findMany({
      where: {
        cashSessionId: id,
      },
      select: {
        price: true,
        amountPaid: true,
        paymentMethod: true,
      },
    });

    const totalSales = tickets.length;
    const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);
    const expectedCash = session.openingBalance + totalRevenue;
    const difference = actualCash - expectedCash;

    // Update session
    const updatedSession = await db.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        totalSales,
        totalRevenue,
        expectedCash,
        actualCash,
        difference,
        notes: notes || null,
        closedAt: new Date(),
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
        action: 'CLOSE_CASH_SESSION',
        entity: 'CashSession',
        entityId: id,
        details: JSON.stringify({
          sessionId: id,
          totalSales,
          totalRevenue,
          expectedCash,
          actualCash,
          difference,
          notes: notes || null,
        }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSession,
    });
  } catch (error: any) {
    console.error('Error closing cash session:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la fermeture de la session de caisse' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'OPERATOR']);
