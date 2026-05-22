import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  CLIENT_URL: z.string().optional(),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),

  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),

  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
  PASSWORD_RESET_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
  BCRYPT_COST_PASSWORD: z.coerce.number().int().min(10).max(14).default(12),
  BCRYPT_COST_OTP: z.coerce.number().int().min(8).max(12).default(10),

  PRICE_TRACKING_CRON: z.string().default('0 0 * * *'),
  PRICE_HISTORY_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  PRICES_API_KEY: z.string().optional(),
  PRICES_API_BASE_URL: z.string().default('https://api.pricesapi.io/api/v1'),
  PRICES_API_DEFAULT_COUNTRY: z.string().default('us'),
  PRICES_API_SEARCH_LIMIT: z.coerce.number().int().positive().max(10).default(3),
  PRICES_API_OFFERS_LIMIT: z.coerce.number().int().positive().default(10),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_API_KEY_SID: z.string().optional(),
  TWILIO_API_KEY_SECRET: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema> & {
  REDIS_ENABLED: boolean;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
};

export const env: Env = (() => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  const data = parsed.data;
  const redisEnabled = data.REDIS_ENABLED ?? false;
  const providedSecret = data.JWT_SECRET ?? '';

  if (data.NODE_ENV === 'production' && providedSecret.length < 32) {
    console.error('Invalid environment: JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }

  const jwtSecret =
    providedSecret.length >= 32 ? providedSecret : crypto.randomBytes(48).toString('hex');

  if (providedSecret.length < 32 && data.NODE_ENV !== 'production') {
    console.warn(
      'JWT_SECRET is missing or too short. A temporary development secret was generated for this process.',
    );
  }

  const clientUrls = (data.CLIENT_URL ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    ...data,
    REDIS_ENABLED: redisEnabled,
    JWT_SECRET: jwtSecret,
    CLIENT_URLS: clientUrls,
  };
})();
