import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseFallback } from './supabase-fallback';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const getAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const createSupabaseClient = (key: string | undefined, fallback: SupabaseClient) => {
  const url = getSupabaseUrl();
  if (!url || !key) {
    return fallback;
  }
  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
};

export const supabaseClient = createSupabaseClient(getAnonKey(), supabaseFallback.supabaseClient);
export const supabaseAdmin = createSupabaseClient(getServiceRoleKey() || getAnonKey(), supabaseFallback.supabaseAdmin);
