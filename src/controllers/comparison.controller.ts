import { Request, Response } from 'express';
import { ComparisonService } from '../services/comparison.service';
import { sendSuccess } from '../utils/api-response.util';
import { asyncHandler } from '../utils/async-handler.util';
import { Product } from '../models/product.model';
import { NotFoundError, ForbiddenError } from '../utils/AppError';

export const getProductComparisons = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Optional: Check if user owns the product, depending on privacy requirements.
  // if (product.userId.toString() !== req.user?.id) {
  //   throw new ForbiddenError('Not authorized to view comparisons for this product');
  // }

  const comparisons = await ComparisonService.getComparisons(productId);

  // If no comparisons exist or they are older than 24h, we can trigger an async fetch
  if (comparisons.length === 0) {
    // Non-blocking trigger
    ComparisonService.triggerComparison(productId).catch((e) => console.error(e));
  } else {
    // Check if any comparison is older than 24 hours
    const stale = comparisons.some(
      (c) => new Date().getTime() - new Date(c.lastChecked).getTime() > 24 * 60 * 60 * 1000
    );
    if (stale) {
      ComparisonService.triggerComparison(productId).catch((e) => console.error(e));
    }
  }

  sendSuccess(
    res,
    { product, comparisons },
    'Comparisons retrieved successfully'
  );
});

export const triggerComparisonNow = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Await the fetch for manual triggers
  await ComparisonService.triggerComparison(productId);
  const comparisons = await ComparisonService.getComparisons(productId);

  sendSuccess(res, { comparisons }, 'Comparisons updated successfully');
});
