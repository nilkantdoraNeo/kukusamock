const fs = require('fs');
const { createClient } = require('C:/Users/Client/Desktop/Quiz/backend/node_modules/@supabase/supabase-js');

const envPath = 'C:/Users/Client/Desktop/Quiz/backend/.env';

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv(envPath);
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in backend/.env');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: attempts, error } = await supabase
    .from('attempts')
    .select('id, user_id, score, correct_count, total_count, created_at, exam:exams(id, name)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  console.log('Latest attempts:', attempts?.length || 0);
  for (const a of attempts || []) {
    console.log(`${a.id} | user=${a.user_id} | exam=${a.exam?.name} | score=${a.score} | correct=${a.correct_count}/${a.total_count}`);
  }

  const { count, error: countErr } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true });

  if (countErr) throw countErr;
  console.log('Total attempts:', count || 0);
}

main().catch((err) => {
  console.error('Check failed:', err.message || err);
  process.exit(1);
});
