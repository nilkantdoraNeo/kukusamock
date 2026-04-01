import { supabaseAdmin } from './supabase.js';
import { seededShuffle } from '../utils/seededShuffle.js';

export async function fetchQuizQuestions({ daily = true, limit = 10, examId, random = false } = {}) {
  let query = supabaseAdmin
    .from('quizzes')
    .select('id, exam_id, question, option_a, option_b, option_c, option_d, explanation')
    .eq('is_active', true);
  if (examId) {
    query = query.eq('exam_id', examId);
  }
  const { data, error } = await query.limit(200);

  if (error) throw error;
  const questions = data || [];

  if (!daily && !random) return questions.slice(0, limit);

  const seed = random
    ? `${Date.now()}-${Math.random()}`
    : `${new Date().toISOString().slice(0, 10)}:${examId || 'all'}`;
  const shuffled = seededShuffle(questions, seed);
  return shuffled.slice(0, limit);
}

export async function gradeQuiz({ answers = [], questionIds = [], exam = {} } = {}) {
  const uniqueQuestionIds = Array.from(new Set(
    (questionIds?.length ? questionIds : answers.map(a => a.question_id)).filter(Boolean)
  ));

  if (uniqueQuestionIds.length === 0) {
    return { score: 0, correctMap: {}, correctCount: 0, wrongCount: 0, skippedCount: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select('id, correct_answer, option_a, option_b, option_c, option_d')
    .in('id', uniqueQuestionIds);

  if (error) throw error;

  const correctMap = {};
  for (const q of data || []) {
    const raw = String(q.correct_answer || '').trim();
    const lower = raw.toLowerCase();
    let resolved = q.correct_answer;
    if (['a', 'b', 'c', 'd'].includes(lower)) {
      resolved = q[`option_${lower}`];
    } else if (['option_a', 'option_b', 'option_c', 'option_d'].includes(lower)) {
      resolved = q[lower];
    }
    correctMap[q.id] = resolved;
  }

  const answerMap = new Map();
  for (const ans of answers || []) {
    if (!ans?.question_id) continue;
    const cleaned = String(ans.answer || '').trim();
    if (!cleaned) continue;
    const list = answerMap.get(ans.question_id) || [];
    list.push(cleaned);
    answerMap.set(ans.question_id, list);
  }

  const marksPerQuestion = Number(exam?.marks_per_question ?? 3);
  const negativeRatio = Number(exam?.negative_mark_ratio ?? (1 / 3));
  const penalty = marksPerQuestion * negativeRatio;

  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  for (const qid of uniqueQuestionIds) {
    const provided = answerMap.get(qid) || [];
    if (provided.length === 0) {
      skippedCount += 1;
      continue;
    }
    if (provided.length > 1) {
      wrongCount += 1;
      score -= penalty;
      continue;
    }
    if (correctMap[qid] === provided[0]) {
      correctCount += 1;
      score += marksPerQuestion;
    } else {
      wrongCount += 1;
      score -= penalty;
    }
  }

  score = Math.round(score * 100) / 100;

  return { score, correctMap, correctCount, wrongCount, skippedCount };
}

export async function storeResult(userId, score) {
  const rounded = Math.round(Number(score || 0) * 100) / 100;
  const { error } = await supabaseAdmin
    .from('results')
    .insert({ user_id: userId, score: rounded });

  if (error) throw error;
}
