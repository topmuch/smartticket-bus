import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// PUT /api/cash-sessions/close - Close current user's open cash session
export const PUT = withAuth(async (req, user) => {
  try {
    const body = await req.json();

    // Handle both snake_case (from frontend) and camelCase formats
    const actualCash = body.actualCash ?? body.actual_cash;
    const notes = body.notes ?? null;

    if (actualCash === undefined || actualCash < 0) {
      return NextResponse.json(
        { success: false, error: 'Montant réel en caisse invalide' },
        { status: 400 }
      );
    }

    // Find the current user's open cash session
    const session = await db.cashSession.findFirst({
      where: {
        operatorId: user.userId,
        status: 'OPEN',
      },
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Aucune session de caisse ouverte trouvée pour cet opérateur" },
        { status: 404 }
      );
    }

    // Calculate totals from tickets in this session
    const tickets = await db.ticket.findMany({
      where: {
        cashSessionId: session.id,
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
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        totalSales,
        totalRevenue,
        expectedCash,
        actualCash,
        difference,
        notes,
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
        entityId: session.id,
        details: JSON.stringify({
          sessionId: session.id,
          totalSales,
          totalRevenue,
          expectedCash,
          actualCash,
          difference,
          notes,
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
