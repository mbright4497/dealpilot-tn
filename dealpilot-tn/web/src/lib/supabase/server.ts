import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase server client for Server Components, Server Actions, and Route Handlers.
 * Matches `examples/auth/nextjs/lib/supabase/server.ts` (uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 */
export function createServerSupabaseClient(
  _legacy?: { request?: unknown; response?: unknown }
) {
  void _legacy;
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

export function supabaseService() {
  return createServerSupabaseClient();
}
