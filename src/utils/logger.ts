/**
 * Structured logging with Winston — console in dev and JSON-ish files in prod.
 */

import fs from 'fs';
import path from 'path';
import winston from 'winston';

const logsDir = path.join(process.cwd(), 'logs');

if (process.env.NODE_ENV === 'production' && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, stack }) => `${String(ts)} [${level}]: ${stack ?? message}`),
);

const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' })]
      : []),
  ],
});

/** Morgan writes line-by-line chunks into Winston */
export function morganWriteStream(chunk: string): void {
  logger.verbose(chunk.replace(/\n$/, ''));
}
