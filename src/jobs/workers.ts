import type { Worker } from 'bullmq';
import { Worker as BullWorker } from 'bullmq';
import { createBullConnection } from '../configs/redis';
import { QueueNames } from '../constants';
import { deliverNotification } from '../services/notification.service';
import { refreshTrackedProduct } from '../services/product.service';
import { logger } from '../utils/logger';

const workers: Worker[] = [];

export function registerWorkers(): void {
  const connection = createBullConnection();

  if (!connection) {
    logger.warn('Redis disabled. BullMQ workers will not be started.');
    return;
  }

  const priceWorker = new BullWorker(
    QueueNames.PRICE_TRACKING,
    async (job) => {
      await refreshTrackedProduct(job.data.productId as string);
    },
    {
      connection,
      concurrency: 3,
    },
  );

  const notificationWorker = new BullWorker(
    QueueNames.NOTIFICATIONS,
    async (job) => {
      await deliverNotification(job.data.notificationId as string);
    },
    {
      connection: createBullConnection() ?? connection,
      concurrency: 5,
    },
  );

  for (const worker of [priceWorker, notificationWorker]) {
    worker.on('completed', (job) => logger.debug(`Queue ${worker.name} completed job ${job.id}`));
    worker.on('failed', (job, error) =>
      logger.error(`Queue ${worker.name} failed job ${job?.id}: ${error.message}`),
    );
    workers.push(worker);
  }
}

export async function shutdownWorkers(): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
}
