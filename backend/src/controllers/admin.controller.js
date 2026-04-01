import { supabaseAdmin } from '../services/supabase.js';
import { createExam, listExams, updateExam } from '../services/exam.service.js';

export async function adminListExams(req, res, next) {
  try {
    const exams = await listExams({ includeInactive: true });
    res.json(exams);
  } catch (err) {
    next(err);
  }
}

export async function adminCreateExam(req, res, next) {
  try {
    const payload = req.body;
    const exam = await createExam(payload);
    res.json(exam);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateExam(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid exam id' });
    const exam = await updateExam(id, req.body);
    res.json(exam);
  } catch (err) {
    next(err);
  }
}

export async function adminListQuestions(req, res, next) {
  try {
    const examId = Number(req.query.exam_id || 0) || null;
    let query = supabaseAdmin
      .from('quizzes')
      .select('id, exam_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, is_active, difficulty')
      .order('id', { ascending: true });
    if (examId) {
      query = query.eq('exam_id', examId);
    }
    const { data, error } = await query.limit(500);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

export async function adminCreateQuestion(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateQuestion(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid question id' });
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteQuestion(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid question id' });
    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function adminImportQuestions(req, res, next) {
  try {
    const { exam_id, questions } = req.body;
    if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'exam_id and questions required' });
    }
    const rows = questions.map((q) => ({
      exam_id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty || 'medium',
      is_active: q.is_active !== false
    }));
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert(rows)
      .select();
    if (error) throw error;
    res.json({ inserted: data?.length || 0 });
  } catch (err) {
    next(err);
  }
}

export async function adminListUsers(req, res, next) {
  try {
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 25;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, phone, age, avatar_url, score, rank, status, is_admin, created_at')
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateUser(req, res, next) {
  try {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ message: 'Invalid user id' });
    const payload = {};
    if (typeof req.body.status === 'string') payload.status = req.body.status;
    if (typeof req.body.is_admin === 'boolean') payload.is_admin = req.body.is_admin;
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function adminListAttempts(req, res, next) {
  try {
    const userId = req.query.user_id;
    const examId = Number(req.query.exam_id || 0) || null;

    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 25;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    let query = supabaseAdmin
      .from('attempts')
      .select('id, score, correct_count, total_count, created_at, finished_at, user:users(id,email), exam:exams(id,name)')
      .order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

export async function adminAttemptAnswers(req, res, next) {
  try {
    const attemptId = Number(req.params.id);
    if (!attemptId) return res.status(400).json({ message: 'Invalid attempt id' });
    const { data, error } = await supabaseAdmin
      .from('attempt_answers')
      .select('id, answer, is_correct, question:quizzes(id, question, option_a, option_b, option_c, option_d, correct_answer, explanation)')
      .eq('attempt_id', attemptId)
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}
