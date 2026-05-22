/**
 * Eliminates repetitive try/catch in Express route controllers.
 * Throw `AppError` (or forwarding `next(error)`) inside async handlers safely.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
