import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, JWTPayload } from '@/lib/middleware';
import { ControlResult } from '@prisma/client';

// GET /api/controls - List controls with filters
export const GET = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const controllerId = searchParams.get('controllerId');
    const result = searchParams.get('result') as ControlResult | null;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const synced = searchParams.get('synced');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // CONTROLLER can only see their own controls
    if (user.role === 'CONTROLLER') {
      where.controllerId = user.userId;
    } else if (controllerId) {
      where.controllerId = controllerId;
    }

    if (result) {
      where.result = result;
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

    if (synced !== null && synced !== undefined && synced !== '') {
      where.synced = synced === 'true';
    }

    const [controls, total] = await Promise.all([
      db.control.findMany({
        where,
        include: {
          controller: {
            select: { id: true, name: true, email: true },
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              type: true,
              status: true,
              passengerName: true,
            },
          },
        },
        orderBy: { scannedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.control.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        controls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing controls:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des contrôles' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);

// POST /api/controls - Submit a control scan
export const POST = withAuth(async (req: NextRequest, user: JWTPayload) => {
  try {
    const body = await req.json();
    const { qrString, result, reason, latitude, longitude, batchId } = body;

    if (!qrString || !result) {
      return NextResponse.json(
        { success: false, error: 'qrString et result sont requis' },
        { status: 400 }
      );
    }

    if (!Object.values(ControlResult).includes(result)) {
      return NextResponse.json(
        { success: false, error: 'Résultat de contrôle invalide' },
        { status: 400 }
      );
    }

    // Try to extract ticketId from QR string
    let ticketId: string | null = null;
    try {
      // QR string might be a JWT or a simple ticket ID
      if (qrString.startsWith('ey')) {
        // JWT-like token - try to find ticket by qrToken
        const ticket = await db.ticket.findUnique({
          where: { qrToken: qrString },
          select: { id: true },
        });
        if (ticket) {
          ticketId = ticket.id;
        }
      } else {
        // Try to find by ticketNumber or direct ID
        const ticket = await db.ticket.findFirst({
          where: {
            OR: [
              { ticketNumber: qrString },
              { id: qrString },
            ],
          },
          select: { id: true },
        });
        if (ticket) {
          ticketId = ticket.id;
        }
      }
    } catch {
      // QR parsing failed, ticketId stays null
    }

    const control = await db.control.create({
      data: {
        ticketId,
        qrData: qrString,
        result: result as ControlResult,
        reason: reason || null,
        controllerId: user.userId,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        batchId: batchId || null,
        synced: false,
      },
      include: {
        controller: {
          select: { id: true, name: true },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            type: true,
            passengerName: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: control }, { status: 201 });
  } catch (error) {
    console.error('Error submitting control:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du contrôle' },
      { status: 500 }
    );
  }
}, ['SUPERADMIN', 'CONTROLLER']);
