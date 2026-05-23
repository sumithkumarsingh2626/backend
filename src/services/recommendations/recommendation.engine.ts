import { Product, IProduct } from '../../models/product.model';
import { Recommendation } from '../../models/recommendation.model';
import { logger } from '../../utils/logger';

export class RecommendationEngine {
  /**
   * Extremely simplified matcher for the sake of MVP.
   * In reality, this would use text embeddings (e.g., OpenAI embeddings + Vector Search)
   * or ElasticSearch to find similar titles/categories.
   */
  private static extractKeywords(title: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'of', 'on'];
    return title.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
  }

  private static calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = Array.from(new Set([...keywords1, ...keywords2]));
    return intersection.length / (union.length || 1);
  }

  public static async generateRecommendations(sourceProduct: IProduct): Promise<void> {
    try {
      const allProducts = await Product.find({ _id: { $ne: sourceProduct._id } }).limit(100);
      const sourceKeywords = this.extractKeywords(sourceProduct.title);

      for (const target of allProducts) {
        const targetKeywords = this.extractKeywords(target.title);
        const similarity = this.calculateSimilarity(sourceKeywords, targetKeywords);

        // If it's somewhat similar (e.g. > 20% word overlap)
        if (similarity > 0.2) {
          let score = similarity * 50; // base score from similarity
          let reason = 'Similar product';

          // If target is cheaper
          if (target.currentPrice < sourceProduct.currentPrice) {
            score += 30;
            reason = 'Cheaper alternative';
          }

          // Cap score at 100
          score = Math.min(100, Math.round(score));

          await Recommendation.findOneAndUpdate(
            { sourceProductId: sourceProduct._id, recommendedProductId: target._id },
            { reason, score },
            { upsert: true }
          );
        }
      }
    } catch (error) {
      logger.error(`Error generating recommendations for ${sourceProduct._id}:`, error);
    }
  }

  public static async getRecommendations(productId: string) {
    return Recommendation.find({ sourceProductId: productId })
      .sort({ score: -1 })
      .limit(5)
      .populate('recommendedProductId');
  }
}
