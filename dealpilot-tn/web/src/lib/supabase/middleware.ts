import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase client bound to a single `NextRequest` / `NextResponse` cookie jar.
 * Use in **Edge middleware** and in **Route Handlers** (e.g. OAuth callback).
 *
 * Do not use `cookies()` from `next/headers` for PKCE exchange: in Route Handlers
 * it can miss cookies from the incoming request on Vercel, so `exchangeCodeForSession`
 * fails with "Unable to exchange external code".
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

/** Copy cookies from one NextResponse onto another (e.g. redirect after getUser refresh). */
export function forwardCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c);
  });
}

/**
 * OAuth PKCE callback (Node Route Handler only).
 *
 * - Reads cookies from the raw `Cookie` header via `parseCookieHeader` so the
 *   PKCE code-verifier is never dropped by Next.js `RequestCookies` edge cases.
 * - Does **not** call `request.cookies.set` in `setAll`: in App Router route
 *   handlers the incoming request cookie jar is read-only; mutating it can fail
 *   or behave differently than Edge middleware, which breaks `exchangeCodeForSession`.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createOAuthCallbackSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}
