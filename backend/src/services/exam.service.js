import { supabaseAdmin } from './supabase.js';

export async function listExams({ includeInactive = false } = {}) {
  let query = supabaseAdmin
    .from('exams')
    .select('id, name, slug, description, is_active, duration_seconds, question_limit, marks_per_question, negative_mark_ratio')
    .order('name', { ascending: true });
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getExamById(id) {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('id, name, slug, description, is_active, duration_seconds, question_limit, marks_per_question, negative_mark_ratio')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function resolveExamId(examId) {
  if (examId) return examId;
  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('id')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(1)
    .single();
  if (error) return null;
  return data?.id || null;
}

export async function createExam(payload) {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExam(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExam(id) {
  const { error } = await supabaseAdmin
    .from('exams')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
