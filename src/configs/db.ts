import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

mongoose.set('strictQuery', true);
mongoose.set('autoIndex', env.NODE_ENV !== 'production');

const MAX_CONNECT_ATTEMPTS = 8;
const BASE_DELAY_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDB(): Promise<void> {
  if (isMongoConnected()) {
    logger.info(`MongoDB already connected (${mongoose.connection.host})`);
    return;
  }
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15_000,
        socketTimeoutMS: 45_000,
        retryWrites: true,
      });
      logger.info(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`MongoDB connection attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed: ${message}`);

      if (attempt < MAX_CONNECT_ATTEMPTS) {
        await wait(BASE_DELAY_MS * attempt);
      }
    }
  }

  logger.error('MongoDB connection failed after all retries.');
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (error) => logger.error(`MongoDB connection error: ${error.message}`));

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}
