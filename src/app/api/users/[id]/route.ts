import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { Prisma } from '@prisma/client';

// GET /api/users/[id] - Get user by ID (SUPERADMIN only)
export const GET = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const foundUser = await db.user.findUnique({
      where: { id },
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
    });

    if (!foundUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: foundUser,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// PUT /api/users/[id] - Update user (SUPERADMIN only)
export const PUT = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { name, email, role, isActive, phone } = body;

    // Check user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['SUPERADMIN', 'OPERATOR', 'CONTROLLER'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Rôle invalide' },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if changed
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Un autre utilisateur utilise déjà cet email' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
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
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: JSON.stringify(updateData),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');

// DELETE /api/users/[id] - Soft-delete user (SUPERADMIN only)
export const DELETE = withAuth(async (req, user, context) => {
  try {
    const { id } = await context.params;

    // Check user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (id === user.userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas désactiver votre propre compte' },
        { status: 400 }
      );
    }

    // Soft delete: set isActive to false
    const deletedUser = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        details: JSON.stringify({ email: existingUser.email, name: existingUser.name }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: deletedUser,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}, 'SUPERADMIN');
