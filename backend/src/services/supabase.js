import '../utils/fetch-polyfill.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Separate client for auth flows so user sessions don't override admin headers.
if (!supabaseAnonKey && process.env.NODE_ENV === 'production') {
  throw new Error('Missing SUPABASE_ANON_KEY for auth flows');
}
if (!supabaseAnonKey) {
  console.warn('[supabase] SUPABASE_ANON_KEY missing; falling back to service role key for auth.');
}
const authKey = supabaseAnonKey || supabaseServiceKey;
export const supabaseAuth = createClient(supabaseUrl, authKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
