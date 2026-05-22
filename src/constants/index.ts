export const APP_NAME = 'Price Drop Alert Tool';

export const API_VERSION = '2.0.0';

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
} as const;

export const UserRoles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRoleValue = (typeof UserRoles)[keyof typeof UserRoles];

export const QueueNames = {
  PRICE_TRACKING: 'price-tracking',
  NOTIFICATIONS: 'notification-delivery',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export const NotificationChannels = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PUSH: 'push',
} as const;

export type NotificationChannel = (typeof NotificationChannels)[keyof typeof NotificationChannels];

export const NotificationTypes = {
  PRICE_DROP: 'price_drop',
  TARGET_PRICE: 'target_price',
  SYSTEM: 'system',
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationStatuses = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type NotificationStatus = (typeof NotificationStatuses)[keyof typeof NotificationStatuses];

export const TrackingStatuses = {
  ACTIVE: 'active',
  PAUSED: 'paused',
} as const;

export type TrackingStatus = (typeof TrackingStatuses)[keyof typeof TrackingStatuses];

export const AvailabilityStates = {
  IN_STOCK: 'in_stock',
  OUT_OF_STOCK: 'out_of_stock',
  LIMITED: 'limited',
  UNKNOWN: 'unknown',
} as const;

export type AvailabilityState = (typeof AvailabilityStates)[keyof typeof AvailabilityStates];

export const SupportedStores = {
  AMAZON: 'Amazon',
  BESTBUY: 'BestBuy',
  FLIPKART: 'Flipkart',
  ZARA: 'Zara',
} as const;

export type SupportedStoreName = (typeof SupportedStores)[keyof typeof SupportedStores];

export const API_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 300,
};
