import { z } from 'zod';
import { objectIdSchema } from './common.validator';

const notificationSettingsSchema = z.object({
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  anyPriceDrop: z.boolean().optional(),
  targetPriceAlert: z.boolean().optional(),
});

export const createProductSchema = z.object({
  url: z.string().url(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  variant: z.string().trim().max(120).optional(),
  notificationEnabled: z.boolean().optional(),
  notificationSettings: notificationSettingsSchema.optional(),
});

export const updateNotificationsSchema = z.object({
  notificationEnabled: z.boolean().optional(),
  notificationSettings: notificationSettingsSchema.optional(),
});

export const updateTrackingSchema = z.object({
  trackingStatus: z.enum(['active', 'paused']).optional(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  variant: z.string().trim().max(120).optional(),
});

export const historyQuerySchema = z.object({
  range: z.enum(['7d', '1m', '3m', 'max']).optional(),
});

export const productIdParamsSchema = z.object({
  id: objectIdSchema,
});
