import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Fallback permissive mock for test environments where env isn't set
    // Tests should mock the module; this prevents crashes when not mocked.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./supabase-fallback').supabaseAdmin;
  }
  _admin = createClient(url, anon, { auth: { persistSession: false } });
  return _admin;
};

export const supabaseAdmin = getSupabaseAdmin();
