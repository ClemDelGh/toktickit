import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lab3-key';

// 1. On étend le type Request d'Express pour qu'il comprenne notre utilisateur
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    mustChangePassword: boolean;
  };
}

// Allowed paths for mustChangePassword users (no enforcement on these)
const MUSTCHANGE_ALLOWED_PATHS = [
  '/api/auth/me',
  '/api/auth/change-password',
  '/api/auth/logout',
];

// 2. Middleware pour vérifier que l'utilisateur est bien connecté (DB-authoritative)
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // BR-27: Load user from DB to get fresh isActive / role / mustChangePassword
    const user = await getPrisma().user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    }

    // Attach fresh DB data to the request
    req.user = {
      userId: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    // BR-27: mustChangePassword enforcement
    if (user.mustChangePassword) {
      const isAllowed = MUSTCHANGE_ALLOWED_PATHS.some(
        (p) => req.path.startsWith(p) || req.originalUrl.includes(p)
      );
      if (!isAllowed) {
        return res.status(403).json({
          error: 'Password change required',
          code: 'PASSWORD_CHANGE_REQUIRED',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
};

// 3. Middleware RBAC (Contrôle d'accès basé sur les rôles)
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Si pas d'utilisateur attaché (requireAuth n'a pas été appelé avant)
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    }

    // Si le rôle de l'utilisateur n'est pas dans la liste des rôles autorisés
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions', code: 'FORBIDDEN' });
    }

    // S'il a le bon rôle, on le laisse passer
    next();
  };
};
