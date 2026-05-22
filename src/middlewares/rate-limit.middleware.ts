/**
 * Global API throttling per IP (respects `X-Forwarded-For` when `trust proxy` is enabled).
 */

import rateLimit from 'express-rate-limit';
import { API_RATE_LIMIT } from '../constants';

export const globalApiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT.windowMs,
  max: API_RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
