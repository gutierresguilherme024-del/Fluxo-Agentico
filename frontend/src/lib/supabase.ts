import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[SUPABASE] Missing credentials. Configure frontend/.env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
