import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiError } from './error.middleware';
import { UserRole } from '../models/User';

/**
 * Role-Based Access Control middleware
 * Restricts access to users with specified roles
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        ),
      );
    }

    next();
  };
}

/**
 * Convenience role groups
 */
export const CITIZEN_ACCESS = [UserRole.CITIZEN];
export const OFFICER_ACCESS = [UserRole.OFFICER, UserRole.DEPARTMENT_HEAD];
export const MANAGEMENT_ACCESS = [UserRole.DEPARTMENT_HEAD, UserRole.ADMIN, UserRole.CM];
export const ADMIN_ACCESS = [UserRole.ADMIN];
export const CM_ACCESS = [UserRole.CM];
export const ALL_STAFF = [UserRole.OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.ADMIN, UserRole.CM];
export const ALL_ROLES = Object.values(UserRole);
