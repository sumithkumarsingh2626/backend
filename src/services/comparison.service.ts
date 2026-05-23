import { ProductComparison, type IProductComparison } from '../models/product-comparison.model';
import { Product } from '../models/product.model';
import { SupportedStores } from '../constants';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

export class ComparisonService {
  /**
   * Mock scrapers for searching cross-platform.
   * In a real-world scenario, these would connect to dedicated Puppeteer functions or third-party APIs
   * like PricesAPI, SerpApi, etc., but searching reliably across 5 stores is complex to maintain.
   */
  private static async searchPlatformMock(
    platform: string,
    query: string,
    basePrice: number,
  ): Promise<Partial<IProductComparison> | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 400));

    // Simulate 20% chance of not finding the product on a specific platform
    if (Math.random() > 0.8) {
      return null;
    }

    // Generate a slightly varying price (between 90% and 110% of basePrice)
    const variation = (Math.random() * 0.2 - 0.1); 
    const currentPrice = Number((basePrice * (1 + variation)).toFixed(2));
    const originalPrice = Number((currentPrice * (1 + Math.random() * 0.3)).toFixed(2));

    const slugs: Record<string, string> = {
      [SupportedStores.AMAZON]: 'dp/B00MOCK123',
      [SupportedStores.FLIPKART]: 'p/itmMOCK123',
      [SupportedStores.MYNTRA]: 'buy/mock-123',
      [SupportedStores.AJIO]: 'p/mock-123',
      [SupportedStores.CROMA]: 'p/mock-123',
    };

    const urls: Record<string, string> = {
      [SupportedStores.AMAZON]: `https://www.amazon.in/${slugs[SupportedStores.AMAZON]}`,
      [SupportedStores.FLIPKART]: `https://www.flipkart.com/${slugs[SupportedStores.FLIPKART]}`,
      [SupportedStores.MYNTRA]: `https://www.myntra.com/${slugs[SupportedStores.MYNTRA]}`,
      [SupportedStores.AJIO]: `https://www.ajio.com/${slugs[SupportedStores.AJIO]}`,
      [SupportedStores.CROMA]: `https://www.croma.com/${slugs[SupportedStores.CROMA]}`,
    };

    return {
      platform,
      productTitle: `${query} (${platform} Edition)`,
      productUrl: urls[platform] || `https://www.${platform.toLowerCase()}.com/search?q=${encodeURIComponent(query)}`,
      currentPrice,
      originalPrice,
      image: 'https://via.placeholder.com/200x200.png?text=' + platform,
      inStock: Math.random() > 0.1, // 90% chance of being in stock
    };
  }

  public static async getComparisons(productId: string): Promise<IProductComparison[]> {
    return ProductComparison.find({ productId: new Types.ObjectId(productId) }).sort({ currentPrice: 1 });
  }

  public static async triggerComparison(productId: string): Promise<void> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        logger.error(`Cannot trigger comparison: Product ${productId} not found.`);
        return;
      }

      const query = product.title;
      const basePrice = product.currentPrice;

      const platformsToCheck = [
        SupportedStores.AMAZON,
        SupportedStores.FLIPKART,
        SupportedStores.MYNTRA,
        SupportedStores.AJIO,
        SupportedStores.CROMA,
      ].filter((p) => p !== product.storeName); // Don't search the same store

      for (const platform of platformsToCheck) {
        try {
          const result = await this.searchPlatformMock(platform, query, basePrice);
          if (result) {
            await ProductComparison.findOneAndUpdate(
              { productId: product._id, platform },
              {
                ...result,
                productId: product._id,
                lastChecked: new Date(),
              },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            );
          }
        } catch (error) {
          logger.warn(`Failed to compare on ${platform} for product ${productId}:`, error);
        }
      }

      logger.info(`Completed cross-platform comparison for product ${productId}`);
    } catch (error) {
      logger.error(`Error in triggerComparison for product ${productId}:`, error);
      throw error;
    }
  }
}
