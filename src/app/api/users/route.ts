import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { hashPassword } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET /api/users - List all users (SUPERADMIN only)
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as 'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER';
    }

    if (status) {
      where.isActive = status === 'active';
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// POST /api/users - Create user (SUPERADMIN only)
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { email, password, name, role, phone } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, mot de passe et nom sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPERADMIN', 'OPERATOR', 'CONTROLLER'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Rôle invalide. Valeurs acceptées: SUPERADMIN, OPERATOR, CONTROLLER' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        role: role || 'OPERATOR',
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: newUser.id,
        details: JSON.stringify({ email: newUser.email, name: newUser.name, role: newUser.role }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
