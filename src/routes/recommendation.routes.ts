import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendation.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/:productId', getRecommendations);

export default router;
