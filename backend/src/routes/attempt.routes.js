import { Router } from 'express';
import { getLatestAttempt, listAttempts } from '../controllers/attempt.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/latest', authMiddleware, getLatestAttempt);
router.get('/', authMiddleware, listAttempts);

export default router;
