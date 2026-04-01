import { Router } from 'express';
import { z } from 'zod';
import {
  adminAttemptAnswers,
  adminCreateExam,
  adminCreateQuestion,
  adminDeleteQuestion,
  adminImportQuestions,
  adminListAttempts,
  adminListExams,
  adminListQuestions,
  adminListUsers,
  adminUpdateExam,
  adminUpdateQuestion,
  adminUpdateUser
} from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const examSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    duration_seconds: z.coerce.number().optional(),
    question_limit: z.coerce.number().optional(),
    marks_per_question: z.coerce.number().optional(),
    negative_mark_ratio: z.coerce.number().optional()
  })
});

const questionSchema = z.object({
  body: z.object({
    exam_id: z.coerce.number(),
    question: z.string(),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_answer: z.string(),
    explanation: z.string().optional(),
    difficulty: z.string().optional(),
    is_active: z.boolean().optional()
  })
});

const importSchema = z.object({
  body: z.object({
    exam_id: z.coerce.number(),
    questions: z.array(z.any())
  })
});

router.use(authMiddleware, adminMiddleware);

router.get('/exams', adminListExams);
router.post('/exams', validate(examSchema), adminCreateExam);
router.patch('/exams/:id', adminUpdateExam);

router.get('/questions', adminListQuestions);
router.post('/questions', validate(questionSchema), adminCreateQuestion);
router.post('/questions/import', validate(importSchema), adminImportQuestions);
router.patch('/questions/:id', adminUpdateQuestion);
router.delete('/questions/:id', adminDeleteQuestion);

router.get('/users', adminListUsers);
router.patch('/users/:id', adminUpdateUser);

router.get('/attempts', adminListAttempts);
router.get('/attempts/:id/answers', adminAttemptAnswers);

export default router;
