import { PriceHistory } from '../../models/price-history.model';
import { IProduct } from '../../models/product.model';

export class TrendAnalyzer {
  public static async analyze(product: IProduct): Promise<{
    isMajorDrop: boolean;
    isLowestEver: boolean;
    isSuddenIncrease: boolean;
    dropPercentage: number;
  }> {
    const history = await PriceHistory.find({ productId: product._id })
      .sort({ scrapedAt: -1 })
      .limit(30);

    if (history.length < 2) {
      return { isMajorDrop: false, isLowestEver: false, isSuddenIncrease: false, dropPercentage: 0 };
    }

    const currentPrice = history[0].price;
    const previousPrice = history[1].price;
    const lowestPrice = Math.min(...history.map(h => h.price));

    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    const isLowestEver = currentPrice <= lowestPrice && currentPrice < previousPrice;
    const isMajorDrop = priceChange <= -15; // 15% or more drop
    const isSuddenIncrease = priceChange >= 20; // 20% or more increase

    return {
      isMajorDrop,
      isLowestEver,
      isSuddenIncrease,
      dropPercentage: Math.abs(priceChange),
    };
  }
}
