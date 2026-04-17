import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

type RoleCheck = 'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER' | Array<'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER'>;

export function withAuth(
  handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>,
  allowedRoles?: RoleCheck
) {
  return async (req: NextRequest) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Token d\'authentification requis' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const user = verifyAccessToken(token);

      if (!user) {
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }

      if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!roles.includes(user.role)) {
          return NextResponse.json(
            { error: 'Accès non autorisé pour ce rôle' },
            { status: 403 }
          );
        }
      }

      return handler(req as AuthenticatedRequest, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Erreur d\'authentification' },
        { status: 500 }
      );
    }
  };
}
