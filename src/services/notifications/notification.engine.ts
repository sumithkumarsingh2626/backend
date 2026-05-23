import { IProduct } from '../../models/product.model';
import { TrendAnalyzer } from './trend.analyzer';
import { SalePredictor } from './sale.predictor';
import { Notification } from '../../models/notification.model';
import { NotificationTypes, NotificationChannels } from '../../constants';
import { logger } from '../../utils/logger';
import { Types } from 'mongoose';

export class NotificationEngine {
  public static async processProduct(product: IProduct): Promise<void> {
    if (!product.notificationEnabled) return;

    const trends = await TrendAnalyzer.analyze(product);
    const predictions = SalePredictor.predict(product);

    const notificationsToCreate = [];

    // 1. Major Price Drop
    if (trends.isMajorDrop) {
      notificationsToCreate.push({
        type: NotificationTypes.MAJOR_PRICE_DROP,
        message: `🔥 ${product.title} dropped by ${trends.dropPercentage.toFixed(1)}%! Huge discount.`,
      });
    } else if (trends.isLowestEver) {
      // 2. Lowest Price Ever
      notificationsToCreate.push({
        type: NotificationTypes.LOWEST_PRICE_EVER,
        message: `Lowest price in tracking history! Buy ${product.title} now before it goes up.`,
      });
    }

    // 3. Sudden Price Increase (Warn user to hold off)
    if (trends.isSuddenIncrease) {
      notificationsToCreate.push({
        type: NotificationTypes.SUDDEN_PRICE_INCREASE,
        message: `⚠️ Price surged by ${trends.dropPercentage.toFixed(1)}%. Wait before buying.`,
      });
    }

    // 4. Sale Predictions
    if (predictions.isWeekendSaleLikely && !trends.isMajorDrop && !trends.isLowestEver) {
      // Check if we recently sent a weekend prediction to avoid spamming
      const recent = await Notification.findOne({
        productId: product._id,
        notificationType: NotificationTypes.WEEKEND_PREDICTION,
        createdAt: { $gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // last 3 days
      });
      
      if (!recent) {
        notificationsToCreate.push({
          type: NotificationTypes.WEEKEND_PREDICTION,
          message: `Weekend sale approaching. Hold off buying ${product.title} for a few days.`,
        });
      }
    }

    for (const notif of notificationsToCreate) {
      try {
        await Notification.create({
          userId: product.userId,
          productId: product._id,
          notificationType: notif.type,
          channel: NotificationChannels.EMAIL, // Defaulting to email
          messageBody: notif.message,
          metadata: { currency: product.currency, newPrice: product.currentPrice }
        });
        logger.info(`Smart notification generated for product ${product._id}: ${notif.type}`);
        
        // Note: The actual dispatching (email, whatsapp, push) would be handled by a queue worker 
        // that listens to newly created PENDING notifications.
      } catch (error) {
        logger.error(`Error creating smart notification for product ${product._id}:`, error);
      }
    }
  }
}
