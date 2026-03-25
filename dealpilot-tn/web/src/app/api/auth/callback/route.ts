export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DASHBOARD_PATH, ONBOARDING_PATH } from "@/lib/auth-constants";
import { forwardCookies } from "@/lib/supabase/middleware";

function redirectToLogin(origin: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("google_auth_failed")}`, origin),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  const errorParam = url.searchParams.get("error") ?? url.searchParams.get("oauth_error");
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? DASHBOARD_PATH;
  const nextPath = nextRaw.startsWith("/") ? nextRaw : DASHBOARD_PATH;
  const authFlowMarker = request.cookies.get("dp_auth_flow")?.value;

  if (errorParam) {
    return redirectToLogin(origin);
  }

  if (!code) {
    return redirectToLogin(origin);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
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
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return redirectToLogin(origin);
  }

  const sessionResponse = response;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return redirectToLogin(origin);
  }

  const onboarded = !!(user.user_metadata as { onboarded?: boolean })?.onboarded;

  try {
    const fullName =
      (user.user_metadata as { full_name?: string })?.full_name ||
      (user.user_metadata as { name?: string })?.name ||
      null;
    if (fullName) {
      await supabase.from("profiles").upsert({ id: user.id, full_name: fullName });
    }
  } catch {
    /* non-fatal */
  }

  const typeParam =
    url.searchParams.get("type") ??
    url.searchParams.get("action") ??
    url.searchParams.get("scope");
  const isPasswordRecovery =
    authFlowMarker === "reset" ||
    nextPath === "/reset-password" ||
    !!typeParam?.toLowerCase().includes("recovery") ||
    !!typeParam?.toLowerCase().includes("reset");

  const target = isPasswordRecovery
    ? "/reset-password"
    : !onboarded
      ? ONBOARDING_PATH
      : nextPath;

  const redirect = NextResponse.redirect(new URL(target, origin), {
    headers: { "Cache-Control": "no-store" },
  });
  forwardCookies(sessionResponse, redirect);
  if (authFlowMarker === "reset") {
    redirect.cookies.set("dp_auth_flow", "", { path: "/", maxAge: 0 });
  }
  return redirect;
}
