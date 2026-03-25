import {
  createBrowserClient as createSupabaseBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cookie defaults aligned with @supabase/ssr (path, sameSite) plus `secure` on HTTPS
 * so auth cookies are sent on the OAuth return trip to `/api/auth/callback`.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
function defaultCookieOptions(): CookieOptions {
  if (typeof window === "undefined") {
    return { path: "/", sameSite: "lax" };
  }
  const isHttps = window.location.protocol === "https:";
  return {
    path: "/",
    // OAuth redirects are cross-site. `sameSite: "none"` (with `secure`) is the
    // safest option to ensure PKCE/code-verifier cookies are sent back on the
    // `/api/auth/callback` request.
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  };
}

/**
 * Browser Supabase client (Client Components).
 * Explicit `cookies.getAll` / `cookies.setAll` keep the PKCE code verifier in
 * `document.cookie` (not localStorage) so the Route Handler can read it on redirect.
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof document === "undefined") {
          return [];
        }
        return parseCookieHeader(document.cookie);
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") {
          return;
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeCookieHeader(name, value, options);
        });
      },
    },
    cookieOptions: defaultCookieOptions(),
  });
}
