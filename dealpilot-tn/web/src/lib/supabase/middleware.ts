import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DASHBOARD_PATH } from "@/lib/auth-constants";

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function isPublicPath(pathname: string) {
  if (pathname === "/api/reva/chat") return true;
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/api/auth/callback"
  ) {
    return true;
  }
  if (pathname === "/api/ghl" || pathname.startsWith("/api/ghl/")) return true;
  if (pathname === "/api/webhooks" || pathname.startsWith("/api/webhooks/"))
    return true;
  if (pathname === "/embed" || pathname.startsWith("/embed/")) return true;
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  return false;
}

/** Copy cookies from one `NextResponse` to another (e.g. redirect after session refresh). */
export function forwardCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...opts }) => {
    to.cookies.set(name, value, opts);
  });
}

/**
 * Mirrors `examples/auth/nextjs/lib/supabase/proxy.ts` (`updateSession`).
 * Uses `getUser()` instead of `getClaims()` for compatibility with this repo's `@supabase/ssr` version.
 */
export async function updateSession(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  // Do not touch Supabase on the OAuth / PKCE callback: getUser() can rewrite auth
  // cookies before the route handler runs exchangeCodeForSession (breaks reset + OAuth).
  if (pathname === "/api/auth/callback") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and auth refresh above and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    forwardCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    const redirect = NextResponse.redirect(url);
    forwardCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && pathname === "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = DASHBOARD_PATH;
      const redirect = NextResponse.redirect(url);
      forwardCookies(supabaseResponse, redirect);
      return redirect;
    }
  }

  return supabaseResponse;
}
