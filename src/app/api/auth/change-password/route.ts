import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe actuel et nouveau mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Find user with password hash
    const fullUser = await db.user.findUnique({
      where: { id: user.userId },
    });

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, fullUser.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe actuel incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { id: user.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.userId,
        details: JSON.stringify({ field: 'password' }),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Mot de passe modifié avec succès' },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
});
