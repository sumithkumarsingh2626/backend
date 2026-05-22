import { Queue } from 'bullmq';
import { createBullConnection } from '../configs/redis';
import { QueueNames } from '../constants';

function createQueue(name: string): Queue | null {
  const connection = createBullConnection();

  if (!connection) {
    return null;
  }

  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2_000,
      },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  });
}

export const priceTrackingQueue = createQueue(QueueNames.PRICE_TRACKING);
export const notificationQueue = createQueue(QueueNames.NOTIFICATIONS);

export async function queuePriceRefresh(productId: string): Promise<boolean> {
  if (!priceTrackingQueue) {
    return false;
  }

  await priceTrackingQueue.add(
    'refresh-product-price',
    { productId },
    {
      jobId: `price-refresh:${productId}:${Date.now()}`,
    },
  );

  return true;
}

export async function queueNotificationDelivery(notificationId: string): Promise<boolean> {
  if (!notificationQueue) {
    return false;
  }

  await notificationQueue.add(
    'deliver-notification',
    { notificationId },
    {
      jobId: `notification:${notificationId}:${Date.now()}`,
    },
  );

  return true;
}
