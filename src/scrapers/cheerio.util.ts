/**
 * Small Cheerio helpers used by HTML-based scrapers.
 */

import * as cheerio from 'cheerio';

export function loadHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

/**
 * Returns trimmed text for the first element matching the selector, or undefined.
 */
export function firstText($: cheerio.CheerioAPI, selector: string): string | undefined {
  const el = $(selector).first();
  if (!el.length) return undefined;
  const t = el.text().trim();
  return t || undefined;
}
