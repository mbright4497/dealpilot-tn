import { cookies } from "next/headers";
import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase server client for Server Components, Server Actions, and most Route Handlers.
 * Uses Next.js `cookies()` with `getAll` / `setAll` (required for chunked auth cookies).
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Server Components cannot set cookies; Route Handlers and Actions can.
        }
      },
    },
  });
}

export function supabaseService() {
  return createServerSupabaseClient();
}

/**
 * Supabase client for the OAuth PKCE callback Route Handler only.
 * Mirrors the Astro / Remix examples: read cookies from the raw `Cookie` header via
 * `parseCookieHeader`, and apply `setAll` only to a `NextResponse` (do not mutate
 * `request.cookies` in Node route handlers).
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createRouteHandlerSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, getResponse: () => response };
}
