/**
 * Logs HTTP requests with Morgan → Winston.
 */

import morgan from 'morgan';
import type { Express } from 'express';
import { morganWriteStream } from '../utils/logger';

/** Dev-friendly colored logs locally; terse combined format in prod. */
export function attachHttpLogger(app: Express, nodeEnv: string): void {
  const fmt = nodeEnv === 'development' ? 'dev' : 'combined';
  app.use(morgan(fmt, { stream: { write: morganWriteStream } }));
}
