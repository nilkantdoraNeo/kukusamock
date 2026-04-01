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
