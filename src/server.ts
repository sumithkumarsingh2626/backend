import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './configs/db';
import { env } from './configs/env';
import { redisConnection } from './configs/redis';
import { startSchedulers, stopSchedulers } from './jobs/scheduler';
import { registerWorkers, shutdownWorkers } from './jobs/workers';
import { closeSharedBrowser } from './lib/puppeteer-browser';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

async function bootstrap(): Promise<void> {
  await connectDB();
  registerWorkers();
  startSchedulers();

  server.listen(env.PORT, () => {
    logger.info(`${env.NODE_ENV.toUpperCase()} server listening on :${env.PORT}`);
  });

  async function gracefulShutdown(signal: string): Promise<void> {
    logger.warn(`Received ${signal}. Starting graceful shutdown.`);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    stopSchedulers();
    await shutdownWorkers();
    await disconnectDB();
    await closeSharedBrowser();

    if (redisConnection) {
      await redisConnection.quit();
    }

    process.exit(0);
  }

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error(`Fatal boot error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
