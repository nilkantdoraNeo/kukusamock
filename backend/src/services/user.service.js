import { supabaseAdmin } from './supabase.js';

const PROFILE_FIELDS = ['username', 'phone', 'age', 'avatar_url'];

function pickDefined(source) {
  const payload = {};
  for (const key of PROFILE_FIELDS) {
    if (source?.[key] !== undefined) {
      payload[key] = source[key];
    }
  }
  return payload;
}

export async function upsertUserProfile(user, extra = {}) {
  const payload = {
    id: user.id,
    email: user.email,
    ...pickDefined(extra)
  };

  if (payload.age !== undefined) {
    payload.age = Number(payload.age);
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, updates = {}) {
  const payload = pickDefined(updates);

  if (payload.age !== undefined) {
    payload.age = Number(payload.age);
  }

  if (Object.keys(payload).length === 0) {
    return getUserProfile(userId);
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserScore(userId, scoreDelta) {
  const profile = await getUserProfile(userId);
  const newScore = Number(profile.score || 0) + Number(scoreDelta || 0);
  const rounded = Math.round(newScore * 100) / 100;

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ score: rounded })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recalcRanks() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, score')
    .order('score', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return;

  const updates = data.map((u, i) => ({ id: u.id, email: u.email, rank: i + 1 }));
  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert(updates, { onConflict: 'id' });

  if (upsertError) throw upsertError;
}
