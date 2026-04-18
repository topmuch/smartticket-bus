import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/subscriptions - List subscriptions with filters
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const zoneId = searchParams.get('zoneId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Prisma.SubscriptionWhereInput = {};

    if (active !== null && active !== undefined) {
      where.isActive = active === 'true';
    }

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (search) {
      where.OR = [
        { passengerName: { contains: search, mode: 'insensitive' } },
        { passengerPhone: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              price: true,
              soldAt: true,
              soldBy: {
                select: { id: true, name: true },
              },
            },
          },
          zone: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Error listing subscriptions:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des abonnements' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN']);
