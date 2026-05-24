/**
 * Lazy singleton browser for Puppeteer-based scrapers.
 * Reuse one browser process across jobs to reduce cold starts.
 */

import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';

let browserPromise: Promise<Browser> | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const b = await browserPromise;
    b.on('disconnected', () => {
      logger.warn('Puppeteer browser disconnected; will relaunch on next use');
      browserPromise = null;
    });
  }
  return browserPromise;
}

export async function closeSharedBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close();
  }
}
