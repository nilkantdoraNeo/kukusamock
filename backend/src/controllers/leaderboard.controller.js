import { supabaseAdmin } from '../services/supabase.js';

export async function getLeaderboard(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, avatar_url, score, rank')
      .eq('status', 'active')
      .order('score', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}
