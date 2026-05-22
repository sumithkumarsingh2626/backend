/**
 * Zod-based validation for route body, query string, or path params.
 * Mutates request segments with parsed + coerced shapes (validated input).
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { BadRequestError } from '../utils/AppError';

interface ValidateSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as Request['query'];
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new BadRequestError('Validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
