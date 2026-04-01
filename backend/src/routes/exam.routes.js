import { Router } from 'express';
import { getExam, getExams } from '../controllers/exam.controller.js';

const router = Router();

router.get('/', getExams);
router.get('/:id', getExam);

export default router;
