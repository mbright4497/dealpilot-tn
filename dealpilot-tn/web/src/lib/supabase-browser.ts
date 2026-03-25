import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser Supabase client (Client Components). Cookie-backed session for PKCE OAuth.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}
