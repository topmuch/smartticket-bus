import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

type RoleCheck = 'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER' | Array<'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER'>;

export function withAuth(
  handler: (req: AuthenticatedRequest, user: JWTPayload, context: RouteContext) => Promise<NextResponse>,
  allowedRoles?: RoleCheck
) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: "Token d'authentification requis" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const user = verifyAccessToken(token);

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Token invalide ou expiré" },
          { status: 401 }
        );
      }

      if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!roles.includes(user.role)) {
          return NextResponse.json(
            { success: false, error: "Accès non autorisé pour ce rôle" },
            { status: 403 }
          );
        }
      }

      return handler(req as AuthenticatedRequest, user, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { success: false, error: "Erreur d'authentification" },
        { status: 500 }
      );
    }
  };
}
