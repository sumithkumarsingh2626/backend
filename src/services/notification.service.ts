import twilio from 'twilio';
import { env } from '../configs/env';
import {
  NotificationChannels,
  NotificationStatuses,
  NotificationTypes,
  type NotificationChannel,
} from '../constants';
import { Notification } from '../models/notification.model';
import { Product, type IProduct } from '../models/product.model';
import { User, type IUser } from '../models/user.model';
import { sendPriceDropEmail } from './email.service';
import { notificationQueue, queueNotificationDelivery } from '../queues';
import { logger } from '../utils/logger';

const twilioClient =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET
    ? twilio(env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, {
        accountSid: env.TWILIO_ACCOUNT_SID,
      })
    : env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
      ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      : null;

interface TriggerNotificationInput {
  user: IUser;
  product: IProduct;
  previousPrice: number;
  currentPrice: number;
  notificationType: typeof NotificationTypes.PRICE_DROP | typeof NotificationTypes.TARGET_PRICE;
}

function buildMessage({
  product,
  previousPrice,
  currentPrice,
  notificationType,
}: Omit<TriggerNotificationInput, 'user'>): string {
  const directionLabel =
    notificationType === NotificationTypes.TARGET_PRICE ? 'hit your target price' : 'just dropped in price';

  return `${product.title} ${directionLabel}. Old price: ${previousPrice} ${product.currency}. New price: ${currentPrice} ${product.currency}.`;
}

function getEnabledChannels(user: IUser, product: IProduct): NotificationChannel[] {
  if (!product.notificationEnabled) {
    return [];
  }

  const settings = product.notificationSettings;
  const preferences = user.notificationPreferences;

  const channels: NotificationChannel[] = [];

  if (settings.email && preferences.email) channels.push(NotificationChannels.EMAIL);
  if (settings.sms && preferences.sms) channels.push(NotificationChannels.SMS);
  if (settings.whatsapp && preferences.whatsapp) channels.push(NotificationChannels.WHATSAPP);
  if (settings.push && preferences.push) channels.push(NotificationChannels.PUSH);

  return channels;
}

export async function createNotificationsForPriceEvent(
  input: TriggerNotificationInput,
): Promise<void> {
  const channels = getEnabledChannels(input.user, input.product);

  if (channels.length === 0) {
    return;
  }

  const messageBody = buildMessage(input);

  const notifications = await Notification.insertMany(
    channels.map((channel) => ({
      userId: input.user._id,
      productId: input.product._id,
      notificationType: input.notificationType,
      channel,
      status: NotificationStatuses.PENDING,
      messageBody,
      metadata: {
        oldPrice: input.previousPrice,
        newPrice: input.currentPrice,
        percentageDrop:
          input.previousPrice === 0
            ? 0
            : Number((((input.previousPrice - input.currentPrice) / input.previousPrice) * 100).toFixed(2)),
        currency: input.product.currency,
      },
    })),
  );

  for (const notification of notifications) {
    const queued = await queueNotificationDelivery(notification._id.toString());
    if (!queued) {
      await deliverNotification(notification._id.toString());
    }
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!twilioClient || !env.TWILIO_SMS_FROM) {
    throw new Error('Twilio SMS is not configured');
  }

  await twilioClient.messages.create({
    from: env.TWILIO_SMS_FROM,
    to,
    body,
  });
}

async function sendWhatsapp(to: string, body: string): Promise<void> {
  if (!twilioClient || !env.TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio WhatsApp is not configured');
  }

  const destination = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const sender = env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

  await twilioClient.messages.create({
    from: sender,
    to: destination,
    body,
  });
}

export async function deliverNotification(notificationId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return;
  }

  const [user, product] = await Promise.all([
    User.findById(notification.userId),
    Product.findById(notification.productId),
  ]);

  if (!user || !product) {
    notification.status = NotificationStatuses.FAILED;
    notification.errorMessage = 'Missing user or product for delivery.';
    await notification.save();
    return;
  }

  try {
    if (notification.channel === NotificationChannels.EMAIL) {
      if (!user.email) {
        throw new Error('User email not available');
      }

      await sendPriceDropEmail({
        to: user.email,
        title: product.title,
        storeName: product.storeName,
        productUrl: product.productUrl,
        image: product.productImage,
        oldPrice: notification.metadata?.oldPrice ?? product.currentPrice,
        newPrice: notification.metadata?.newPrice ?? product.currentPrice,
        percentageDrop: notification.metadata?.percentageDrop ?? Math.abs(product.lastPriceChange ?? 0),
        currency: notification.metadata?.currency ?? product.currency,
      });
    } else if (notification.channel === NotificationChannels.SMS) {
      if (!user.phoneNumber) {
        throw new Error('User phone number not available');
      }

      await sendSms(user.phoneNumber, notification.messageBody);
    } else if (notification.channel === NotificationChannels.WHATSAPP) {
      if (!user.phoneNumber) {
        throw new Error('User phone number not available');
      }

      await sendWhatsapp(user.phoneNumber, notification.messageBody);
    } else if (notification.channel === NotificationChannels.PUSH) {
      logger.info(`Push notification queued for ${user.email}: ${notification.messageBody}`);
    }

    notification.status = NotificationStatuses.SENT;
    notification.sentAt = new Date();
    notification.errorMessage = undefined;
    await notification.save();
  } catch (error) {
    logger.error(
      `Notification delivery failed for ${notificationId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    notification.status = NotificationStatuses.FAILED;
    notification.errorMessage = error instanceof Error ? error.message : String(error);
    await notification.save();
    throw error;
  }
}

export async function getRecentNotifications(userId: string): Promise<unknown[]> {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(25)
    .populate('productId', 'title productImage currentPrice currency storeName')
    .lean();
}

export function isNotificationQueueEnabled(): boolean {
  return Boolean(notificationQueue);
}
