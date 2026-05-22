import { Router } from 'express';
import * as ProductsController from '../controllers/products.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createProductSchema,
  historyQuerySchema,
  productIdParamsSchema,
  updateNotificationsSchema,
  updateTrackingSchema,
} from '../validators/product.validator';

const router = Router();

router.use(authenticate);

router.get('/', ProductsController.listProducts);
router.post('/track', validate({ body: createProductSchema }), ProductsController.trackProduct);
router.post('/', validate({ body: createProductSchema }), ProductsController.trackProduct);
router.get('/notifications/feed', ProductsController.notificationFeed);
router.get('/:id', validate({ params: productIdParamsSchema }), ProductsController.getProduct);
router.get(
  '/:id/history',
  validate({ params: productIdParamsSchema, query: historyQuerySchema }),
  ProductsController.getPriceHistory,
);
router.get('/:id/analytics', validate({ params: productIdParamsSchema }), ProductsController.getAnalytics);
router.patch(
  '/:id/notifications',
  validate({ params: productIdParamsSchema, body: updateNotificationsSchema }),
  ProductsController.updateNotifications,
);
router.patch(
  '/:id/tracking',
  validate({ params: productIdParamsSchema, body: updateTrackingSchema }),
  ProductsController.updateTracking,
);
router.post('/:id/refresh', validate({ params: productIdParamsSchema }), ProductsController.refreshProduct);

export default router;
