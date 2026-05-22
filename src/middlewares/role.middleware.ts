/**
 * Restricts routes to one or more roles after `authenticate` middleware.
 */

import type { NextFunction, Request, Response } from 'express';
import type { UserRoleValue } from '../constants';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

export function authorizeRoles(...allowed: UserRoleValue[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowed.includes(req.user.role as UserRoleValue)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}
