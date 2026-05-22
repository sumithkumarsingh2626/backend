/**
 * Stateless JWT verification from `Authorization: Bearer` or HttpOnly cookie.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../configs/env';
import type { JwtUserPayload } from '../services/token.service';
import { UnauthorizedError } from '../utils/AppError';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    let token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    token = token ?? (req.cookies?.accessToken as string | undefined);
    if (!token) throw new UnauthorizedError('Authentication token missing');

    const payload = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    if (!payload.id || !payload.role || payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
