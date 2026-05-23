import cron from 'node-cron';
import { Product } from '../models/product.model';
import { ComparisonService } from '../services/comparison.service';
import { logger } from '../utils/logger';

// Run once every day at 3:00 AM
export function startComparisonCron() {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running cross-platform comparison cron job...');
    
    try {
      // Find all active products
      const products = await Product.find({ trackingStatus: 'active' });
      
      for (const product of products) {
        try {
          await ComparisonService.triggerComparison(product._id.toString());
        } catch (error) {
          logger.error(`Error processing comparisons for product ${product._id}:`, error);
        }
      }
      logger.info('Cross-platform comparison cron job completed successfully.');
    } catch (error) {
      logger.error('Failed to run comparison cron job:', error);
    }
  });
}
