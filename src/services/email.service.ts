import nodemailer from 'nodemailer';
import { env } from '../configs/env';
import { logger } from '../utils/logger';

interface PriceDropEmailInput {
  to: string;
  title: string;
  storeName: string;
  productUrl: string;
  image?: string;
  oldPrice: number;
  newPrice: number;
  percentageDrop: number;
  currency: string;
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function createTransport(): nodemailer.Transporter | null {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    logger.warn('Email credentials missing. Outbound mail will be logged instead of sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: Boolean(env.SMTP_SECURE ?? env.SMTP_PORT === 465),
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    logger.info(`Email skipped (not configured) -> ${to}: ${subject}`);
    logger.debug(text);
    return;
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM ?? env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send email to ${to}: ${message}`);
    throw error;
  }
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'verification' | 'password_reset',
): Promise<void> {
  const subject =
    purpose === 'verification' ? 'Verify your Price Drop account' : 'Reset your Price Drop password';
  const title = purpose === 'verification' ? 'Confirm your account' : 'Password reset request';
  const actionLine =
    purpose === 'verification'
      ? 'Use this OTP to complete your registration.'
      : 'Use this OTP to reset your password securely.';

  try {
    await sendMail(
      to,
      subject,
      `${title}\nYour OTP is ${otp}. ${actionLine}`,
    `
      <div style="font-family:Arial,sans-serif;background:#07120f;padding:32px;color:#e5fff4">
        <div style="max-width:560px;margin:0 auto;background:#0d1f19;border:1px solid #1f5c47;border-radius:20px;padding:32px">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7ae5b2">Price Drop Alert</p>
          <h1 style="margin:0 0 12px;font-size:28px;color:#ffffff">${title}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#c5ead9">${actionLine}</p>
          <div style="margin:24px 0;padding:20px;border-radius:16px;background:#07120f;border:1px solid #1f5c47;text-align:center">
            <span style="font-size:34px;letter-spacing:8px;font-weight:700;color:#4ade80">${otp}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#8fb7a5">This code expires soon. If you did not request it, you can ignore this email.</p>
        </div>
      </div>
    `,
    );
  } catch (error) {
    if (env.NODE_ENV === 'production') {
      throw error;
    }

    logger.warn(`[DEV] OTP for ${to} (${purpose}): ${otp}`);
  }
}

export async function sendPriceDropEmail(input: PriceDropEmailInput): Promise<void> {
  const oldPriceLabel = formatCurrency(input.oldPrice, input.currency);
  const newPriceLabel = formatCurrency(input.newPrice, input.currency);

  await sendMail(
    input.to,
    `${input.title} dropped to ${newPriceLabel}`,
    `${input.title} at ${input.storeName} dropped from ${oldPriceLabel} to ${newPriceLabel} (${input.percentageDrop.toFixed(2)}%). Buy now: ${input.productUrl}`,
    `
      <div style="font-family:Arial,sans-serif;background:#07120f;padding:32px;color:#e5fff4">
        <div style="max-width:620px;margin:0 auto;background:#0d1f19;border:1px solid #1f5c47;border-radius:24px;overflow:hidden">
          <div style="padding:30px 30px 16px">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7ae5b2">Price Drop Alert</p>
            <h1 style="margin:0;font-size:28px;color:#ffffff">${input.title}</h1>
            <p style="margin:10px 0 0;font-size:14px;color:#a7d7c1">${input.storeName} just moved in your favor.</p>
          </div>
          ${
            input.image
              ? `<img src="${input.image}" alt="${input.title}" style="width:100%;max-height:320px;object-fit:cover;display:block" />`
              : ''
          }
          <div style="padding:30px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">
              <div style="padding:16px;border-radius:16px;background:#07120f;border:1px solid #1f5c47">
                <div style="font-size:12px;color:#8fb7a5;margin-bottom:6px">Old price</div>
                <div style="font-size:20px;font-weight:700;color:#ffffff">${oldPriceLabel}</div>
              </div>
              <div style="padding:16px;border-radius:16px;background:#07120f;border:1px solid #1f5c47">
                <div style="font-size:12px;color:#8fb7a5;margin-bottom:6px">New price</div>
                <div style="font-size:20px;font-weight:700;color:#4ade80">${newPriceLabel}</div>
              </div>
              <div style="padding:16px;border-radius:16px;background:#07120f;border:1px solid #1f5c47">
                <div style="font-size:12px;color:#8fb7a5;margin-bottom:6px">Drop</div>
                <div style="font-size:20px;font-weight:700;color:#4ade80">${input.percentageDrop.toFixed(2)}%</div>
              </div>
            </div>
            <a href="${input.productUrl}" style="display:inline-block;background:#4ade80;color:#07120f;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:14px">Buy Now</a>
          </div>
        </div>
      </div>
    `,
  );
}
