import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiError } from './error.middleware';
import { UserRole } from '../models/User';

/**
 * Extended Request with authenticated user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

/**
 * JWT Authentication middleware
 * Verifies the Bearer token from Authorization header
 */
import { User } from '../models/User';

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    const payload = AuthService.verifyAccessToken(token);
    
    // JWT Expiration vs. Deactivation Window Fix
    // Query DB to ensure user is still active
    const userInDb = await User.findById(payload.id).select('isActive');
    if (!userInDb || !userInDb.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication — doesn't fail if no token
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        req.user = AuthService.verifyAccessToken(token);
      }
    }
    next();
  } catch {
    // Silently continue without auth
    next();
  }
}
