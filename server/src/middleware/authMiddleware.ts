import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lab3-key';

// 1. On étend le type Request d'Express pour qu'il comprenne notre utilisateur
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    mustChangePassword: boolean;
  };
}

// 2. Middleware pour vérifier que l'utilisateur est bien connecté (possède un token valide)
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded; // On attache les infos de l'utilisateur à la requête
    next(); // Tout est bon, on passe à la suite !
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// 3. Middleware RBAC (Contrôle d'accès basé sur les rôles)
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Si pas d'utilisateur attaché (requireAuth n'a pas été appelé avant)
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Si le rôle de l'utilisateur n'est pas dans la liste des rôles autorisés
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }

    // S'il a le bon rôle, on le laisse passer
    next();
  };
};