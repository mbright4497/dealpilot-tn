import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_PATH } from "@/lib/auth-constants";
import {
  createMiddlewareSupabaseClient,
  forwardCookies,
} from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api",
  "/embed",
] as const;

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  // PKCE code exchange runs in the Route Handler; do not refresh session here first.
  if (pathname === "/api/auth/callback") {
    return NextResponse.next();
  }

  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) user = data.user;
  } catch (e) {
    console.error("middleware supabase error", e);
    return getResponse();
  }

  const publicRoute = isPublicPath(pathname);

  if (!user && !publicRoute) {
    const loginUrl = new URL("/login", request.url);
    const redirect = NextResponse.redirect(loginUrl);
    forwardCookies(getResponse(), redirect);
    return redirect;
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dash = new URL(DASHBOARD_PATH, request.url);
    const redirect = NextResponse.redirect(dash);
    forwardCookies(getResponse(), redirect);
    return redirect;
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
