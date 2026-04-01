import { Router } from 'express';
import { z } from 'zod';
import { signup, login, profile, updateProfile } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    username: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    age: z.coerce.number().int().min(5).max(120),
    password: z.string().min(6)
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    username: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().min(2).optional()
    ),
    phone: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().min(6).optional()
    ),
    age: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number().int().min(5).max(120).optional()
    ),
    avatar_url: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().min(1).optional()
    )
  })
});

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/profile', authMiddleware, profile);
router.patch('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);

export default router;
