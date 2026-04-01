import { Router } from 'express';
import { z } from 'zod';
import { getQuiz, submitQuiz } from '../controllers/quiz.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const submitSchema = z.object({
  body: z.object({
    exam_id: z.number(),
    answers: z.array(z.object({
      question_id: z.number(),
      answer: z.string()
    })),
    question_ids: z.array(z.number()).optional(),
    total_count: z.number().optional()
  })
});

router.get('/', optionalAuthMiddleware, getQuiz);
router.post('/submit', authMiddleware, validate(submitSchema), submitQuiz);

export default router;
