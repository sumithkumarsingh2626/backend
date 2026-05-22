import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './configs/env';
import { errorHandler } from './middlewares/error.middleware';
import { attachHttpLogger } from './middlewares/logger.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { globalApiLimiter } from './middlewares/rate-limit.middleware';
import { sanitizeRequest } from './middlewares/sanitize.middleware';
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes/index';

function resolveCorsOrigin(): cors.CorsOptions['origin'] {
  if (env.NODE_ENV !== 'production') {
    return true;
  }

  if (env.CLIENT_URLS.length === 0) {
    return false;
  }

  return (origin, callback) => {
    if (!origin || env.CLIENT_URLS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  };
}

export function createApp(): Express {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: resolveCorsOrigin(),
      credentials: true,
    }),
  );

  attachHttpLogger(app, env.NODE_ENV);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  app.use('/health', healthRoutes);
  app.use('/api', globalApiLimiter);
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
