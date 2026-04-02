import { supabaseAdmin } from '../services/supabase.js';

function resolveCorrectAnswer(q) {
  const raw = String(q?.correct_answer || '').trim();
  const lower = raw.toLowerCase();
  if (['a', 'b', 'c', 'd'].includes(lower)) {
    return q?.[`option_${lower}`];
  }
  if (['option_a', 'option_b', 'option_c', 'option_d'].includes(lower)) {
    return q?.[lower];
  }
  return q?.correct_answer;
}

export async function getLatestAttempt(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('id, score, correct_count, total_count, created_at, exam:exams(id, name, question_limit, duration_seconds, marks_per_question, negative_mark_ratio)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error?.code === 'PGRST116') {
        return res.status(404).json({ message: 'No attempts found' });
      }
      throw error;
    }

    const { data: answers, error: ansErr } = await supabaseAdmin
      .from('attempt_answers')
      .select('id, answer, is_correct, question:quizzes(id, question, option_a, option_b, option_c, option_d, correct_answer, explanation)')
      .eq('attempt_id', attempt.id)
      .order('id', { ascending: true });

    if (ansErr) throw ansErr;

    const correctMap = {};
    for (const row of answers || []) {
      if (!row?.question?.id) continue;
      correctMap[row.question.id] = resolveCorrectAnswer(row.question);
    }

    res.json({ attempt, answers: answers || [], correct: correctMap });
  } catch (err) {
    next(err);
  }
}

export async function getAttemptById(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const attemptId = Number(req.params.id);
    if (!Number.isFinite(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt id' });
    }

    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('id, score, correct_count, total_count, created_at, exam:exams(id, name, question_limit, duration_seconds, marks_per_question, negative_mark_ratio)')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error?.code === 'PGRST116') {
        return res.status(404).json({ message: 'Attempt not found' });
      }
      throw error;
    }

    const { data: answers, error: ansErr } = await supabaseAdmin
      .from('attempt_answers')
      .select('id, answer, is_correct, question:quizzes(id, question, option_a, option_b, option_c, option_d, correct_answer, explanation)')
      .eq('attempt_id', attempt.id)
      .order('id', { ascending: true });

    if (ansErr) throw ansErr;

    const correctMap = {};
    for (const row of answers || []) {
      if (!row?.question?.id) continue;
      correctMap[row.question.id] = resolveCorrectAnswer(row.question);
    }

    res.json({ attempt, answers: answers || [], correct: correctMap });
  } catch (err) {
    next(err);
  }
}

export async function listAttempts(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 20)
      : 5;

    const { data: attempts, error } = await supabaseAdmin
      .from('attempts')
      .select('id, score, correct_count, total_count, created_at, exam:exams(id, name, question_limit)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ attempts: attempts || [] });
  } catch (err) {
    next(err);
  }
}

export async function listIncorrect(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 200)
      : 50;

    const { data: attempts, error: attemptErr } = await supabaseAdmin
      .from('attempts')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (attemptErr) throw attemptErr;

    const attemptIds = (attempts || []).map((row) => row.id);
    if (!attemptIds.length) {
      return res.json({ items: [] });
    }

    const { data: wrongs, error: wrongErr } = await supabaseAdmin
      .from('attempt_answers')
      .select('id, answer, is_correct, attempt_id, question:quizzes(id, question, option_a, option_b, option_c, option_d, correct_answer, explanation)')
      .in('attempt_id', attemptIds)
      .eq('is_correct', false)
      .order('id', { ascending: false })
      .limit(Math.max(limit * 2, limit));
    if (wrongErr) throw wrongErr;

    const unique = new Map();
    for (const row of wrongs || []) {
      const qid = row?.question?.id;
      if (!qid || unique.has(qid)) continue;
      const resolved = resolveCorrectAnswer(row.question);
      unique.set(qid, {
        ...row,
        question: { ...row.question, correct_answer: resolved }
      });
      if (unique.size >= limit) break;
    }

    res.json({ items: Array.from(unique.values()) });
  } catch (err) {
    next(err);
  }
}
