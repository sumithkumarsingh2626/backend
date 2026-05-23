import { Router } from 'express';
import { getProductComparisons, triggerComparisonNow } from '../controllers/comparison.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// We can protect these routes if needed
router.use(authenticate);

router.get('/:productId', getProductComparisons);
router.post('/:productId/trigger', triggerComparisonNow);

export default router;
