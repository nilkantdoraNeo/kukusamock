import { Router } from 'express';
import { getLatestAttempt, getAttemptById, listAttempts, listIncorrect } from '../controllers/attempt.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/latest', authMiddleware, getLatestAttempt);
router.get('/incorrect', authMiddleware, listIncorrect);
router.get('/:id', authMiddleware, getAttemptById);
router.get('/', authMiddleware, listAttempts);

export default router;
