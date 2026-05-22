import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../configs/env';
import { Product } from '../models/product.model';
import { queuePriceRefresh } from '../queues';
import { runDailyTrackingSweep } from '../services/product.service';
import { TrackingStatuses } from '../constants';
import { logger } from '../utils/logger';

let dailyTrackingTask: ScheduledTask | null = null;

export function startSchedulers(): void {
  if (dailyTrackingTask) {
    return;
  }

  dailyTrackingTask = cron.schedule(env.PRICE_TRACKING_CRON, async () => {
    logger.info(`Daily tracking scheduler fired using cron "${env.PRICE_TRACKING_CRON}"`);

    const activeProducts = await Product.find({ trackingStatus: TrackingStatuses.ACTIVE })
      .select('_id')
      .lean();

    let queued = 0;

    for (const product of activeProducts) {
      const added = await queuePriceRefresh(String(product._id));
      if (added) {
        queued += 1;
      }
    }

    if (queued > 0) {
      logger.info(`Queued ${queued} product refresh jobs for daily tracking.`);
      return;
    }

    const completed = await runDailyTrackingSweep();
    logger.info(`Redis queue unavailable. Completed ${completed} direct product refreshes.`);
  });

  logger.info(`Started daily tracking scheduler (${env.PRICE_TRACKING_CRON}).`);
}

export function stopSchedulers(): void {
  dailyTrackingTask?.stop();
  dailyTrackingTask = null;
}
