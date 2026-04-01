import { fetchQuizQuestions, gradeQuiz, storeResult } from '../services/quiz.service.js';
import { storeAttempt } from '../services/attempt.service.js';
import { getExamById, resolveExamId } from '../services/exam.service.js';
import { updateUserScore, recalcRanks, getUserProfile } from '../services/user.service.js';

export async function getQuiz(req, res, next) {
  try {
    const daily = req.query.daily !== 'false';
    const random = String(req.query.random || '').toLowerCase() === 'true';
    const rawLimit = req.query.limit;
    const parsedLimit = Number(rawLimit);
    const requestedLimit = rawLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 200)
      : null;
    const examId = Number(req.query.examId || req.query.exam_id || 0) || null;
    const resolvedExamId = await resolveExamId(examId);
    if (!resolvedExamId) {
      return res.status(404).json({ message: 'No active exams found' });
    }
    const exam = await getExamById(resolvedExamId);
    if (!exam?.is_active) {
      return res.status(403).json({ message: 'Exam is not active' });
    }
    const limit = requestedLimit || exam?.question_limit || 10;
    const questions = await fetchQuizQuestions({
      daily,
      limit,
      examId: resolvedExamId,
      random
    });
    res.json(questions);
  } catch (err) {
    next(err);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const { answers = [], exam_id, question_ids = [], total_count } = req.body;
    if (!exam_id) {
      return res.status(400).json({ message: 'Missing exam_id' });
    }
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Please log in to submit the quiz' });
    }
    const exam = await getExamById(exam_id).catch(() => null);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const questionIds = Array.isArray(question_ids) && question_ids.length
      ? question_ids
      : answers.map(a => a.question_id);
    const {
      score,
      correctMap,
      correctCount,
      wrongCount,
      skippedCount
    } = await gradeQuiz({ answers, questionIds, exam });
    const totalCount = Number(total_count || questionIds.length || exam?.question_limit || 0);
    await storeAttempt({
      userId: req.user.id,
      examId: exam_id,
      answers,
      correctMap,
      score,
      correctCount,
      totalCount
    });
    await Promise.all([
      storeResult(req.user.id, score),
      updateUserScore(req.user.id, score)
    ]);
    await recalcRanks();
    const profile = await getUserProfile(req.user.id);
    res.json({
      score,
      correct: correctMap,
      user: profile,
      stats: { correctCount, wrongCount, skippedCount, totalCount }
    });
  } catch (err) {
    next(err);
  }
}
