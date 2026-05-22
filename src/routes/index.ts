import { Router } from 'express';
import { APP_NAME, API_VERSION } from '../constants';
import { asyncHandler } from '../utils/async-handler.util';
import { sendSuccess } from '../utils/api-response.util';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, { name: APP_NAME, apiVersion: API_VERSION }, 'API root');
  }),
);

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);

export default router;
