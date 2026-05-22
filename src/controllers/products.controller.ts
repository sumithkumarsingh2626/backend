import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { sendSuccess } from '../utils/api-response.util';
import {
  getProductAnalyticsForUser,
  getProductForUser,
  getProductHistoryForUser,
  listProductsForUser,
  refreshTrackedProduct,
  trackProductForUser,
  updateProductNotificationsForUser,
  updateTrackingForUser,
} from '../services/product.service';
import { getRecentNotifications } from '../services/notification.service';
import { UnauthorizedError } from '../utils/AppError';
import { HttpStatus } from '../constants';

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw new UnauthorizedError('Authentication required.');
  }

  return req.user.id;
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const products = await listProductsForUser(userId);
  sendSuccess(res, { products }, 'Tracked products fetched.');
});

export const trackProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const product = await trackProductForUser(userId, {
    url: req.body.url,
    targetPrice: req.body.targetPrice,
    variant: req.body.variant,
    notificationEnabled: req.body.notificationEnabled,
    notificationSettings: req.body.notificationSettings,
  });

  sendSuccess(res, { product }, 'Product is now being tracked.', HttpStatus.CREATED);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const product = await getProductForUser(userId, req.params.id);
  sendSuccess(res, { product }, 'Tracked product fetched.');
});

export const getPriceHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const history = await getProductHistoryForUser(userId, req.params.id, req.query.range as '7d' | '1m' | '3m' | 'max');
  sendSuccess(res, { history }, 'Price history fetched.');
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const analytics = await getProductAnalyticsForUser(userId, req.params.id);
  sendSuccess(res, { analytics }, 'Product analytics fetched.');
});

export const updateNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const product = await updateProductNotificationsForUser(userId, req.params.id, {
    notificationEnabled: req.body.notificationEnabled,
    notificationSettings: req.body.notificationSettings,
  });

  sendSuccess(res, { product }, 'Notification settings updated.');
});

export const updateTracking = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const product = await updateTrackingForUser(userId, req.params.id, {
    trackingStatus: req.body.trackingStatus,
    targetPrice: req.body.targetPrice,
    variant: req.body.variant,
  });

  sendSuccess(res, { product }, 'Tracking settings updated.');
});

export const refreshProduct = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  await getProductForUser(userId, req.params.id);
  const product = await refreshTrackedProduct(req.params.id);
  sendSuccess(res, { product }, 'Product price refreshed.');
});

export const notificationFeed = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const notifications = await getRecentNotifications(userId);
  sendSuccess(res, { notifications }, 'Recent notifications fetched.');
});
