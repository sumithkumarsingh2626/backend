/**
 * Lightweight health probes for uptime checks and deployments.
 */

import type { Response } from 'express';
import { redisConnection } from '../configs/redis';
import { isMongoConnected } from '../configs/db';
import { env } from '../configs/env';
import { HttpStatus } from '../constants';
import { asyncHandler } from '../utils/async-handler.util';
import { sendSuccess } from '../utils/api-response.util';
import { sendError } from '../utils/api-response.util';

export const liveness = asyncHandler(async (_req, res: Response) => {
  sendSuccess(
    res,
    {
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    'Alive',
  );
});

export const readiness = asyncHandler(async (_req, res: Response) => {
  const mongoReady = isMongoConnected();
  if (!env.REDIS_ENABLED) {
    if (!mongoReady) {
      sendError(res, 'MongoDB is unavailable', HttpStatus.SERVICE_UNAVAILABLE, { mongo: 'down', redis: 'disabled' });
      return;
    }
    sendSuccess(res, { mongo: 'up', redis: 'disabled', timestamp: new Date().toISOString() }, 'Ready');
    return;
  }

  let redisReady = false;
  try {
    redisReady = (await redisConnection?.ping()) === 'PONG';
  } catch {
    redisReady = false;
  }

  if (!mongoReady || !redisReady) {
    sendError(
      res,
      'One or more dependencies are unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
      { mongo: mongoReady ? 'up' : 'down', redis: redisReady ? 'up' : 'down' },
    );
    return;
  }

  sendSuccess(
    res,
    {
      mongo: 'up',
      redis: 'up',
      timestamp: new Date().toISOString(),
    },
    'Ready',
  );
});
