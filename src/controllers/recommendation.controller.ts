import { Request, Response } from 'express';
import { RecommendationEngine } from '../services/recommendations/recommendation.engine';
import { sendSuccess } from '../utils/api-response.util';
import { asyncHandler } from '../utils/async-handler.util';
import { Product } from '../models/product.model';
import { NotFoundError } from '../utils/AppError';

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Fetch recommendations
  let recommendations = await RecommendationEngine.getRecommendations(productId);

  // If no recommendations exist, try generating them inline (non-blocking in real app, but blocking here for MVP)
  if (recommendations.length === 0) {
    await RecommendationEngine.generateRecommendations(product);
    recommendations = await RecommendationEngine.getRecommendations(productId);
  }

  // Map to format for frontend
  const formatted = recommendations.map(r => ({
    _id: r._id,
    reason: r.reason,
    score: r.score,
    product: r.recommendedProductId // populated doc
  }));

  sendSuccess(res, { recommendations: formatted }, 'Recommendations retrieved successfully');
});
