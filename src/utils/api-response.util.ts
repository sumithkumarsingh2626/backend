/**
 * Structured JSON helpers for predictable API responses.
 */

import type { Response } from 'express';
import { HttpStatus } from '../constants';

export interface SuccessPayload<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

export interface ErrorPayload {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message = 'OK',
  statusCode: number = HttpStatus.OK,
): Response {
  const payload: SuccessPayload<T> = { success: true, message, data };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST,
  errors?: unknown,
): Response {
  const payload: ErrorPayload = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(payload);
}
