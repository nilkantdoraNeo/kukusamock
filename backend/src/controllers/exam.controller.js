import { listExams, getExamById } from '../services/exam.service.js';

export async function getExams(req, res, next) {
  try {
    const exams = await listExams({ includeInactive: false });
    res.json(exams);
  } catch (err) {
    next(err);
  }
}

export async function getExam(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid exam id' });
    const exam = await getExamById(id);
    res.json(exam);
  } catch (err) {
    next(err);
  }
}
