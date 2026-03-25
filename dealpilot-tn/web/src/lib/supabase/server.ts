import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * SSR Supabase client for Route Handlers and server code.
 * PKCE: use `getAll` / `setAll` so every auth cookie chunk (including code verifier) is read/written.
 * Deprecated `get` / `set` / `remove` only samples up to 5 chunks per key and can break OAuth exchange.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components may forbid writes; route handlers should succeed
          }
        },
      },
    }
  );
}

export function supabaseService() {
  return createServerSupabaseClient();
}
