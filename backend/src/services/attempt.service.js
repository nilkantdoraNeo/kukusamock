import { supabaseAdmin } from './supabase.js';

export async function storeAttempt({ userId, examId, answers, correctMap, score, correctCount, totalCount }) {
  const safeAnswers = Array.isArray(answers) ? answers : [];
  const resolvedTotal = Number(totalCount ?? safeAnswers.length ?? 0);
  const roundedScore = Math.round(Number(score || 0) * 100) / 100;
  const { data: attempt, error } = await supabaseAdmin
    .from('attempts')
    .insert({
      user_id: userId,
      exam_id: examId || null,
      score: roundedScore,
      correct_count: correctCount,
      total_count: resolvedTotal,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  if (resolvedTotal > 0 && safeAnswers.length > 0) {
    const rows = safeAnswers.map((a) => ({
      attempt_id: attempt.id,
      question_id: a.question_id,
      answer: a.answer,
      is_correct: correctMap?.[a.question_id] === a.answer
    }));
    const { error: insertError } = await supabaseAdmin
      .from('attempt_answers')
      .insert(rows);
    if (insertError) throw insertError;
  }

  return attempt;
}
