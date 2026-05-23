import cron from 'node-cron';
import { Product } from '../models/product.model';
import { NotificationEngine } from '../services/notifications/notification.engine';
import { logger } from '../utils/logger';
import { TrackingStatuses } from '../constants';

// Run every 6 hours
export function startSmartNotificationCron() {
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running smart notification cron job...');
    
    try {
      const activeProducts = await Product.find({ trackingStatus: TrackingStatuses.ACTIVE });
      
      for (const product of activeProducts) {
        try {
          await NotificationEngine.processProduct(product);
        } catch (error) {
          logger.error(`Error processing smart notifications for product ${product._id}:`, error);
        }
      }
      logger.info('Smart notification cron job completed successfully.');
    } catch (error) {
      logger.error('Failed to run smart notification cron job:', error);
    }
  });
}
