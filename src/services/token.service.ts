import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { env } from '../configs/env';

export interface JwtUserPayload extends jwt.JwtPayload {
  id: string;
  role: string;
  type: 'access' | 'refresh';
}

function signToken(
  userId: Types.ObjectId,
  role: string,
  type: JwtUserPayload['type'],
  expiresIn: string,
): string {
  const payload: JwtUserPayload = {
    id: String(userId),
    role,
    type,
  };

  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function generateAccessToken(userId: Types.ObjectId, role: string): string {
  return signToken(userId, role, 'access', env.JWT_ACCESS_EXPIRES_IN);
}

export function generateRefreshToken(userId: Types.ObjectId, role: string): string {
  return signToken(userId, role, 'refresh', env.JWT_REFRESH_EXPIRES_IN);
}

export function decodeToken(token: string): JwtUserPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
