/**
 * Abstract scraper contract — implement per-retailer strategies.
 *
 * Example flow: fetch HTML with Puppeteer or axios, parse with Cheerio utilities.
 */

import type { Browser } from 'puppeteer';
import { getSharedBrowser } from '../lib/puppeteer-browser';

export interface ScrapeContext {
  url: string;
}

export interface ScrapeResult {
  title?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  raw?: Record<string, unknown>;
}

export abstract class BaseScraper {
  protected async getBrowser(): Promise<Browser> {
    return getSharedBrowser();
  }

  abstract scrape(ctx: ScrapeContext): Promise<ScrapeResult>;
}
