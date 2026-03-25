import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (Client Components).
 * Matches `examples/auth/nextjs/lib/supabase/client.ts` (`createClient`).
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
