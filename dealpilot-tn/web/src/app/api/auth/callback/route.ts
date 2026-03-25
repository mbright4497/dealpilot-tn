export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { forwardCookies } from "@/lib/supabase/middleware";
import { DASHBOARD_PATH, ONBOARDING_PATH } from "@/lib/auth-constants";

function redirectToLogin(origin: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("google_auth_failed")}`, origin),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const errorParam = url.searchParams.get("error");
    const oauthErrorParam = url.searchParams.get("oauth_error");
    const errorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const nextRaw = url.searchParams.get("next") ?? DASHBOARD_PATH;
    const nextPath = nextRaw.startsWith("/") ? nextRaw : DASHBOARD_PATH;

    const oauthFailure = errorParam ?? oauthErrorParam;
    if (oauthFailure) {
      console.error("[auth/callback] oauth error", oauthFailure, errorDescription ?? "");
      return redirectToLogin(origin);
    }

    if (!code) {
      console.error("[auth/callback] missing code");
      return redirectToLogin(origin);
    }

    const { supabase, getResponse } = createRouteHandlerSupabaseClient(request);

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("[auth/callback] exchange failed", exchangeError.message);
      return redirectToLogin(origin);
    }

    const sessionResponse = getResponse();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[auth/callback] getUser failed", userError?.message ?? "no_user");
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
    } catch (e) {
      console.error("[auth/callback] profile upsert", e);
    }

    // Password recovery: always land on reset-password so the user can call `updateUser`,
    // even if they have not completed onboarding yet.
    const target =
      nextPath === "/reset-password"
        ? nextPath
        : !onboarded
          ? ONBOARDING_PATH
          : nextPath;
    const redirect = NextResponse.redirect(new URL(target, origin), {
      headers: { "Cache-Control": "no-store" },
    });
    forwardCookies(sessionResponse, redirect);
    return redirect;
  } catch (e) {
    console.error("[auth/callback] fatal", e);
    return redirectToLogin(origin);
  }
}
