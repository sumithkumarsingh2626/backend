import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisConnection: Redis | null = env.REDIS_ENABLED
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        return Math.min(times * 200, 5_000);
      },
    })
  : null;

redisConnection?.on('connect', () => logger.info('Redis connected'));
redisConnection?.on('error', (error) => logger.error(`Redis error: ${error.message}`));

export function createBullConnection(): Redis | null {
  if (!redisConnection) {
    return null;
  }

  return redisConnection.duplicate({
    maxRetriesPerRequest: null,
  });
}
