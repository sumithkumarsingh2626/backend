/**
 * Catches unknown routes and forwards a 404 AppError to the error handler.
 */

import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../utils/AppError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`${req.method} ${req.originalUrl}`));
}
