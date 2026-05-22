/**
 * Central error handler — maps known errors to JSON and hides stack traces in production.
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../configs/env';
import { HttpStatus } from '../constants';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/api-response.util';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 'Validation error', HttpStatus.BAD_REQUEST, err.flatten());
    return;
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    sendError(res, err.message, HttpStatus.BAD_REQUEST);
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${(err as Error).message}`, {
    stack: (err as Error).stack,
  });

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error).message;
  sendError(res, message, HttpStatus.INTERNAL, undefined);
}
