import axios from 'axios';
import * as cheerio from 'cheerio';
import { getSharedBrowser } from '../lib/puppeteer-browser';
import { env } from '../configs/env';
import { AvailabilityStates, SupportedStores, type AvailabilityState } from '../constants';
import { BadRequestError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface ScrapedProductData {
  externalProductId?: string;
  title: string;
  currentPrice: number;
  currency: string;
  productImage?: string;
  availability: AvailabilityState;
  storeName: string;
  variant?: string;
}

interface StoreDefinition {
  hostPatterns: string[];
  storeName: string;
  titleSelectors: string[];
  priceSelectors: string[];
  imageSelectors: string[];
  availabilitySelectors: string[];
}

interface PricesApiSearchProduct {
  pid: number | string;
  title?: string;
  image?: string;
  price?: number;
  currency?: string;
  source?: string;
  multi_store?: boolean;
}

interface PricesApiOffer {
  seller?: string;
  seller_url?: string;
  price?: number;
  currency?: string;
  stock?: string;
  productTitle?: string;
  url?: string;
}

function inferCountryFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith('.in')) return 'in';
    if (hostname.endsWith('.com.au') || hostname.endsWith('.au')) return 'au';
    if (hostname.endsWith('.co.uk') || hostname.endsWith('.uk')) return 'gb';
    if (hostname.endsWith('.de')) return 'de';
    if (hostname.endsWith('.fr')) return 'fr';
    if (hostname.endsWith('.ca')) return 'ca';
    if (hostname.endsWith('.jp')) return 'jp';
  } catch {
    /* ignore */
  }

  return env.PRICES_API_DEFAULT_COUNTRY.toLowerCase();
}

const STORE_DEFINITIONS: StoreDefinition[] = [
  {
    hostPatterns: ['amazon.'],
    storeName: SupportedStores.AMAZON,
    titleSelectors: ['#productTitle', 'meta[property="og:title"]'],
    priceSelectors: [
      '.a-price .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
    ],
    imageSelectors: ['#landingImage', '#imgTagWrapperId img', 'meta[property="og:image"]'],
    availabilitySelectors: ['#availability span', '#availability'],
  },
  {
    hostPatterns: ['bestbuy.'],
    storeName: SupportedStores.BESTBUY,
    titleSelectors: ['.heading-5.v-fw-regular', 'meta[property="og:title"]'],
    priceSelectors: ['.priceView-hero-price span[aria-hidden="true"]', '.pricing-price__range'],
    imageSelectors: ['.primary-image', 'img.primary-image', 'meta[property="og:image"]'],
    availabilitySelectors: ['.fulfillment-add-to-cart-button button', '.shippingAvailability_2X3xt'],
  },
  {
    hostPatterns: ['flipkart.'],
    storeName: SupportedStores.FLIPKART,
    titleSelectors: ['span.BNN0K', 'h1 span', 'meta[property="og:title"]', 'title'],
    priceSelectors: [
      'div.Nx9bqj.CxhGGd',
      'div._30jeq3',
      'div[class*="price"]',
      'meta[property="product:price:amount"]',
    ],
    imageSelectors: ['img[src*="rukminim"]', 'meta[property="og:image"]'],
    availabilitySelectors: ['#add-to-cart-button', '#buyNow'],
  },
  {
    hostPatterns: ['zara.'],
    storeName: SupportedStores.ZARA,
    titleSelectors: ['h1', 'meta[property="og:title"]'],
    priceSelectors: ['[data-qa-action="price-current"]', '.money-amount__main', 'meta[property="product:price:amount"]'],
    imageSelectors: ['img.media-image__image', 'meta[property="og:image"]'],
    availabilitySelectors: ['button[data-qa-action="add-to-cart"]', '.size-selector-sizes-size__out-of-stock'],
  },
];

function findStoreDefinition(url: string): StoreDefinition {
  const hostname = new URL(url).hostname.toLowerCase();
  const definition = STORE_DEFINITIONS.find((store) =>
    store.hostPatterns.some((pattern) => hostname.includes(pattern)),
  );

  if (!definition) {
    throw new BadRequestError(
      'Supported stores: Amazon, Flipkart, BestBuy, and Zara. Paste a direct product page URL.',
    );
  }

  return definition;
}

function readContent($: cheerio.CheerioAPI, selector: string): string | undefined {
  const node = $(selector).first();

  if (!node.length) {
    return undefined;
  }

  const attrContent =
    node.attr('content') ?? node.attr('src') ?? node.attr('data-old-hires') ?? node.attr('href');
  const textContent = node.text().trim();
  return attrContent?.trim() || textContent || undefined;
}

function parseCurrency(raw?: string): string {
  if (!raw) {
    return 'USD';
  }

  if (raw.includes('₹')) return 'INR';
  if (raw.includes('£')) return 'GBP';
  if (raw.includes('€')) return 'EUR';
  return 'USD';
}

function parsePrice(raw?: string): number | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.replace(/[, ]/g, '').match(/-?\d+(?:\.\d{1,2})?/);
  if (!normalized) {
    return undefined;
  }

  const value = Number(normalized[0]);
  return Number.isFinite(value) ? value : undefined;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function parseAvailability(raw?: string): AvailabilityState {
  if (!raw) {
    return AvailabilityStates.UNKNOWN;
  }

  const normalized = raw.toLowerCase();
  if (normalized.includes('out of stock') || normalized.includes('unavailable') || normalized.includes('sold out')) {
    return AvailabilityStates.OUT_OF_STOCK;
  }

  if (normalized.includes('limited')) {
    return AvailabilityStates.LIMITED;
  }

  if (
    normalized.includes('in stock') ||
    normalized.includes('add to cart') ||
    normalized.includes('buy now') ||
    normalized.includes('available')
  ) {
    return AvailabilityStates.IN_STOCK;
  }

  return AvailabilityStates.UNKNOWN;
}

function hostMatches(urlA?: string, urlB?: string): boolean {
  if (!urlA || !urlB) return false;

  try {
    const a = new URL(urlA).hostname.replace(/^www\./, '').toLowerCase();
    const b = new URL(urlB).hostname.replace(/^www\./, '').toLowerCase();
    return a === b;
  } catch {
    return false;
  }
}

async function pricesApiRequest<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  if (!env.PRICES_API_KEY) {
    throw new Error('PRICES_API_KEY is not configured');
  }

  const response = await axios.get<T>(`${env.PRICES_API_BASE_URL}${path}`, {
    headers: {
      'x-api-key': env.PRICES_API_KEY,
    },
    params,
    timeout: 35_000,
  });

  return response.data;
}

async function scrapeViaPricesApiByQuery(urlOrText: string): Promise<ScrapedProductData> {
  const country = inferCountryFromUrl(urlOrText);
  const searchResponse = await pricesApiRequest<{
    success: boolean;
    data?: {
      products?: PricesApiSearchProduct[];
    };
  }>('/products/search', {
    q: urlOrText,
    country,
    limit: env.PRICES_API_SEARCH_LIMIT,
  });

  const products = searchResponse.data?.products ?? [];
  const top = products[0];

  if (!top?.pid) {
    throw new Error('PricesAPI search returned no matching products');
  }

  if (top.multi_store === false) {
    if (top.price === undefined || !top.title) {
      throw new Error('PricesAPI search result did not contain a usable title/price');
    }

    return {
      externalProductId: String(top.pid),
      title: top.title,
      currentPrice: top.price,
      currency: top.currency ?? 'USD',
      productImage: top.image,
      availability: AvailabilityStates.UNKNOWN,
      storeName: top.source ?? findStoreDefinition(urlOrText).storeName,
    };
  }

  try {
    return await scrapeViaPricesApiByPid(String(top.pid), urlOrText, top);
  } catch (error) {
    logger.warn(
      `PricesAPI offers lookup failed for query ${urlOrText}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    if (top.price === undefined || !top.title) {
      throw error;
    }

    return {
      externalProductId: String(top.pid),
      title: top.title,
      currentPrice: top.price,
      currency: top.currency ?? 'USD',
      productImage: top.image,
      availability: AvailabilityStates.UNKNOWN,
      storeName: top.source ?? findStoreDefinition(urlOrText).storeName,
    };
  }
}

function chooseBestOffer(url: string, offers: PricesApiOffer[]): PricesApiOffer | undefined {
  return (
    offers.find((offer) => hostMatches(offer.url, url) || hostMatches(offer.seller_url, url)) ??
    offers[0]
  );
}

export async function scrapeViaPricesApiByPid(
  pid: string,
  originalUrl: string,
  searchFallback?: PricesApiSearchProduct,
): Promise<ScrapedProductData> {
  const country = inferCountryFromUrl(originalUrl);
  const offersResponse = await pricesApiRequest<{
    success: boolean;
    data?: {
      id?: number | string;
      title?: string;
      image?: string;
      offers?: PricesApiOffer[];
    };
  }>(`/products/${pid}/offers`, {
    country,
    limit: env.PRICES_API_OFFERS_LIMIT,
  });

  const offers = offersResponse.data?.offers ?? [];
  const selectedOffer = chooseBestOffer(originalUrl, offers);
  const title = selectedOffer?.productTitle ?? offersResponse.data?.title ?? searchFallback?.title;
  const currentPrice =
    selectedOffer?.price ?? searchFallback?.price;
  const currency =
    selectedOffer?.currency ?? searchFallback?.currency ?? 'USD';

  if (!title || currentPrice === undefined) {
    throw new Error('PricesAPI offers response did not contain a usable title/price');
  }

  return {
    externalProductId: String(offersResponse.data?.id ?? pid),
    title,
    currentPrice,
    currency,
    productImage: offersResponse.data?.image ?? searchFallback?.image,
    availability: parseAvailability(selectedOffer?.stock),
    storeName: selectedOffer?.seller ?? searchFallback?.source ?? findStoreDefinition(originalUrl).storeName,
  };
}

function extractJsonLdPrice($: cheerio.CheerioAPI): { price?: number; currency?: string; availability?: AvailabilityState } {
  const scripts = $('script[type="application/ld+json"]');

  for (const element of scripts.toArray()) {
    const raw = $(element).contents().text();

    try {
      const parsed = JSON.parse(raw) as
        | Record<string, unknown>
        | Array<Record<string, unknown>>;

      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const offers = item.offers as Record<string, unknown> | undefined;
        const price = parsePrice(String(offers?.price ?? item.price ?? ''));
        const currency = typeof offers?.priceCurrency === 'string' ? offers.priceCurrency : undefined;
        const availability = typeof offers?.availability === 'string' ? offers.availability : undefined;

        if (price !== undefined) {
          return {
            price,
            currency,
            availability: parseAvailability(availability),
          };
        }
      }
    } catch {
      continue;
    }
  }

  return {};
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 20_000,
  });

  return response.data;
}

async function fetchHtmlWithBrowser(url: string): Promise<string> {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45_000 });
    return await page.content();
  } finally {
    await page.close();
  }
}

function extractFromHtml(html: string, definition: StoreDefinition): ScrapedProductData {
  const $ = cheerio.load(html);
  const title =
    definition.titleSelectors.map((selector) => readContent($, selector)).find(Boolean) ??
    undefined;
  const rawPrice =
    definition.priceSelectors.map((selector) => readContent($, selector)).find(Boolean) ??
    undefined;
  const image =
    definition.imageSelectors.map((selector) => readContent($, selector)).find(Boolean) ??
    undefined;
  const availabilityRaw =
    definition.availabilitySelectors.map((selector) => readContent($, selector)).find(Boolean) ??
    undefined;
  const jsonLd = extractJsonLdPrice($);

  const currentPrice = parsePrice(rawPrice) ?? jsonLd.price;
  const currency = jsonLd.currency ?? parseCurrency(rawPrice);

  if (!title || currentPrice === undefined) {
    throw new Error('Unable to extract product title or price from the page.');
  }

  return {
    title,
    currentPrice,
    currency,
    productImage: image,
    availability: jsonLd.availability ?? parseAvailability(availabilityRaw),
    storeName: definition.storeName,
  };
}

function buildFallbackScrape(url: string, definition: StoreDefinition): ScrapedProductData {
  let host = 'store';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }

  const seed = Array.from(url).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const currentPrice = round(500 + (seed % 4500) / 10);

  return {
    title: `Tracked product (${definition.storeName})`,
    currentPrice,
    currency: host.includes('.in') ? 'INR' : 'USD',
    productImage: undefined,
    availability: AvailabilityStates.UNKNOWN,
    storeName: definition.storeName,
  };
}

export async function scrapeProduct(url: string): Promise<ScrapedProductData> {
  let definition: StoreDefinition;

  try {
    definition = findStoreDefinition(url);
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError('Enter a valid product URL from a supported store.');
  }

  const usePricesApi =
    Boolean(env.PRICES_API_KEY) &&
    (env.NODE_ENV === 'production' || process.env.SCRAPE_USE_PRICES_API === 'true');

  if (usePricesApi) {
    try {
      return await scrapeViaPricesApiByQuery(url);
    } catch (error) {
      logger.warn(
        `PricesAPI lookup failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  try {
    const html = await fetchHtml(url);
    return extractFromHtml(html, definition);
  } catch (error) {
    logger.warn(`Primary scrape failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const useBrowser =
    env.NODE_ENV === 'production' || process.env.SCRAPE_USE_BROWSER === 'true';

  if (useBrowser) {
    try {
      const html = await fetchHtmlWithBrowser(url);
      return extractFromHtml(html, definition);
    } catch (error) {
      logger.warn(
        `Browser scrape failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (env.NODE_ENV !== 'production') {
    logger.warn(`Using development fallback scrape for ${url}`);
    return buildFallbackScrape(url, definition);
  }

  throw new BadRequestError(
    'Could not read price from that page. Try again later or use Amazon / Flipkart / BestBuy / Zara.',
  );
}
