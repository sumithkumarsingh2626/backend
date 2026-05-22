import { Router } from 'express';
import { liveness, readiness } from '../controllers/health.controller';

const router = Router();

/** Shallow probe — does not check dependencies */
router.get('/', liveness);

/** Kubernetes-style readiness with Mongo + Redis checks */
router.get('/ready', readiness);

export default router;
