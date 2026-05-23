import { Router } from 'express';
import { APP_NAME, API_VERSION } from '../constants';
import { asyncHandler } from '../utils/async-handler.util';
import { sendSuccess } from '../utils/api-response.util';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import comparisonRoutes from './comparison.routes';
import wishlistRoutes from './wishlist.routes';
import recommendationRoutes from './recommendation.routes';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, { name: APP_NAME, apiVersion: API_VERSION }, 'API root');
  }),
);

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/comparison', comparisonRoutes);
router.use('/wishlists', wishlistRoutes);
router.use('/recommendations', recommendationRoutes);

export default router;
