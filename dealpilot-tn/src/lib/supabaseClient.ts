import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseFallback } from './supabase-fallback';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const getAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// Accept fallback as any to allow test mocks that don't fully implement SupabaseClient
const createSupabaseClient = (key: string | undefined, fallback: any): any => {
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

export const supabaseClient: any = createSupabaseClient(getAnonKey(), supabaseFallback.supabaseClient);
export const supabaseAdmin: any = createSupabaseClient(getServiceRoleKey() || getAnonKey(), supabaseFallback.supabaseAdmin);
