import { Types } from 'mongoose';
import {
  NotificationTypes,
  TrackingStatuses,
  type TrackingStatus,
} from '../constants';
import { PriceHistory } from '../models/price-history.model';
import { Product, type IProduct } from '../models/product.model';
import { User } from '../models/user.model';
import { ConflictError, NotFoundError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { scrapeProduct } from './scraper.service';
import { createNotificationsForPriceEvent } from './notification.service';

interface TrackProductInput {
  url: string;
  targetPrice?: number | null;
  variant?: string;
  notificationEnabled?: boolean;
  notificationSettings?: Partial<IProduct['notificationSettings']>;
}

interface UpdateTrackingInput {
  trackingStatus?: TrackingStatus;
  targetPrice?: number | null;
  variant?: string;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function calculatePercentageChange(previousPrice: number, nextPrice: number): number {
  if (previousPrice === 0) {
    return 0;
  }

  return round(((nextPrice - previousPrice) / previousPrice) * 100);
}

async function rebuildProductAnalytics(productId: Types.ObjectId): Promise<void> {
  const history = await PriceHistory.find({ productId }).sort({ scrapedAt: 1 }).lean();

  if (history.length === 0) {
    return;
  }

  let lowestPrice = Number.POSITIVE_INFINITY;
  let highestPrice = Number.NEGATIVE_INFINITY;
  let total = 0;
  let totalPriceDrops = 0;
  let previousPrice: number | null = null;

  for (const item of history) {
    lowestPrice = Math.min(lowestPrice, item.price);
    highestPrice = Math.max(highestPrice, item.price);
    total += item.price;

    if (previousPrice !== null && item.price < previousPrice) {
      totalPriceDrops += 1;
    }

    previousPrice = item.price;
  }

  await Product.findByIdAndUpdate(productId, {
    lowestPrice: round(lowestPrice),
    highestPrice: round(highestPrice),
    averagePrice: round(total / history.length),
    totalPriceDrops,
  });
}

export async function trackProductForUser(userId: string, input: TrackProductInput): Promise<IProduct> {
  const existing = await Product.findOne({
    userId,
    productUrl: input.url,
  });

  if (existing) {
    throw new ConflictError('You are already tracking this product.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const prefs = user.notificationPreferences ?? {
    email: true,
    whatsapp: false,
    sms: false,
    push: false,
  };

  const scraped = await scrapeProduct(input.url);

  const product = await Product.create({
    userId,
    externalProductId: scraped.externalProductId,
    title: scraped.title,
    productImage: scraped.productImage,
    productUrl: input.url,
    currentPrice: scraped.currentPrice,
    targetPrice: input.targetPrice ?? null,
    lowestPrice: scraped.currentPrice,
    highestPrice: scraped.currentPrice,
    averagePrice: scraped.currentPrice,
    storeName: scraped.storeName,
    availability: scraped.availability,
    variant: input.variant ?? scraped.variant,
    trackingStatus: TrackingStatuses.ACTIVE,
    notificationEnabled: input.notificationEnabled ?? true,
    notificationSettings: {
      email: input.notificationSettings?.email ?? prefs.email,
      whatsapp: input.notificationSettings?.whatsapp ?? prefs.whatsapp,
      sms: input.notificationSettings?.sms ?? prefs.sms,
      push: input.notificationSettings?.push ?? prefs.push,
      anyPriceDrop: input.notificationSettings?.anyPriceDrop ?? true,
      targetPriceAlert: input.notificationSettings?.targetPriceAlert ?? true,
    },
    currency: scraped.currency,
    lastScrapedAt: new Date(),
    lastPriceChange: 0,
  });

  await PriceHistory.create({
    productId: product._id,
    price: scraped.currentPrice,
    currency: scraped.currency,
    scrapedAt: new Date(),
    percentageChange: 0,
  });

  return product;
}

export async function listProductsForUser(userId: string): Promise<unknown[]> {
  return Product.find({ userId }).sort({ updatedAt: -1 }).lean();
}

export async function getProductForUser(userId: string, productId: string): Promise<IProduct> {
  const product = await Product.findOne({ _id: productId, userId });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

export async function getProductHistoryForUser(
  userId: string,
  productId: string,
  range?: '7d' | '1m' | '3m' | 'max',
): Promise<unknown[]> {
  const product = await getProductForUser(userId, productId);

  const filter: Record<string, unknown> = {
    productId: product._id,
  };

  if (range && range !== 'max') {
    const days = range === '7d' ? 7 : range === '1m' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    filter.scrapedAt = { $gte: since };
  }

  return PriceHistory.find(filter).sort({ scrapedAt: 1 }).lean();
}

export async function getProductAnalyticsForUser(userId: string, productId: string): Promise<{
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  totalPriceDrops: number;
  percentageDifference: number;
  currentPrice: number;
}> {
  const product = await getProductForUser(userId, productId);
  const history = await PriceHistory.find({ productId: product._id }).sort({ scrapedAt: 1 }).lean();

  const firstPrice = history[0]?.price ?? product.currentPrice;
  const percentageDifference =
    firstPrice === 0 ? 0 : round(((product.currentPrice - firstPrice) / firstPrice) * 100);

  return {
    lowestPrice: product.lowestPrice,
    highestPrice: product.highestPrice,
    averagePrice: product.averagePrice,
    totalPriceDrops: product.totalPriceDrops,
    percentageDifference,
    currentPrice: product.currentPrice,
  };
}

export async function updateProductNotificationsForUser(
  userId: string,
  productId: string,
  updates: {
    notificationEnabled?: boolean;
    notificationSettings?: Partial<IProduct['notificationSettings']>;
  },
): Promise<IProduct> {
  const product = await getProductForUser(userId, productId);

  if (updates.notificationEnabled !== undefined) {
    product.notificationEnabled = updates.notificationEnabled;
  }

  if (updates.notificationSettings) {
    product.notificationSettings = {
      ...product.notificationSettings,
      ...updates.notificationSettings,
    };
  }

  await product.save();
  return product;
}

export async function updateTrackingForUser(
  userId: string,
  productId: string,
  updates: UpdateTrackingInput,
): Promise<IProduct> {
  const product = await getProductForUser(userId, productId);

  if (updates.trackingStatus) {
    product.trackingStatus = updates.trackingStatus;
  }

  if (updates.targetPrice !== undefined) {
    product.targetPrice = updates.targetPrice;
  }

  if (updates.variant !== undefined) {
    product.variant = updates.variant;
  }

  await product.save();
  return product;
}

export async function refreshTrackedProduct(productId: string): Promise<IProduct> {
  const product = await Product.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const previousPrice = product.currentPrice;
  const scraped = await scrapeProduct(product.productUrl);
  const percentageChange = calculatePercentageChange(previousPrice, scraped.currentPrice);

  product.externalProductId = scraped.externalProductId ?? product.externalProductId;
  product.title = scraped.title;
  product.productImage = scraped.productImage;
  product.currentPrice = scraped.currentPrice;
  product.currency = scraped.currency;
  product.storeName = scraped.storeName;
  product.availability = scraped.availability;
  product.variant = scraped.variant ?? product.variant;
  product.lastScrapedAt = new Date();
  product.lastPriceChange = percentageChange;

  if (scraped.currentPrice < previousPrice) {
    product.totalPriceDrops += 1;
  }

  await product.save();

  await PriceHistory.create({
    productId: product._id,
    price: scraped.currentPrice,
    currency: scraped.currency,
    scrapedAt: new Date(),
    percentageChange,
  });

  await rebuildProductAnalytics(product._id);

  const user = await User.findById(product.userId);

  if (user && product.notificationEnabled) {
    const targetReached =
      product.targetPrice !== null &&
      product.targetPrice !== undefined &&
      scraped.currentPrice <= product.targetPrice;
    const isDrop = scraped.currentPrice < previousPrice;

    if (targetReached && product.notificationSettings.targetPriceAlert) {
      await createNotificationsForPriceEvent({
        user,
        product,
        previousPrice,
        currentPrice: scraped.currentPrice,
        notificationType: NotificationTypes.TARGET_PRICE,
      });
    } else if (isDrop && product.notificationSettings.anyPriceDrop) {
      await createNotificationsForPriceEvent({
        user,
        product,
        previousPrice,
        currentPrice: scraped.currentPrice,
        notificationType: NotificationTypes.PRICE_DROP,
      });
    }
  }

  return (await Product.findById(product._id)) as IProduct;
}

export async function runDailyTrackingSweep(): Promise<number> {
  const activeProducts = await Product.find({ trackingStatus: TrackingStatuses.ACTIVE }).select('_id').lean();

  let completed = 0;

  for (const product of activeProducts) {
    try {
      await refreshTrackedProduct(String(product._id));
      completed += 1;
    } catch (error) {
      logger.error(
        `Scheduled scrape failed for product ${String(product._id)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return completed;
}
