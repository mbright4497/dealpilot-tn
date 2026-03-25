export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { parseCookieHeader } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  createOAuthCallbackSupabaseClient,
  forwardCookies,
} from "@/lib/supabase/middleware";
import { DASHBOARD_PATH, ONBOARDING_PATH } from "@/lib/auth-constants";

const LOG = "[auth/callback]";

function redirectToLogin(origin: string, reason: string) {
  console.warn(`${LOG} -> /login?error=google_auth_failed (${reason})`);
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

    console.log(`${LOG} step=parse`, {
      hasError: Boolean(errorParam || oauthErrorParam),
      error: errorParam ?? undefined,
      oauth_error: oauthErrorParam ?? undefined,
      error_description: errorDescription ?? undefined,
      hasCode: Boolean(code),
      next: nextPath,
    });

    const oauthFailure = errorParam ?? oauthErrorParam;
    if (oauthFailure) {
      console.error(`${LOG} step=oauth_query_error`, oauthFailure, errorDescription ?? "");
      return redirectToLogin(origin, `oauth_param:${oauthFailure}`);
    }

    if (!code) {
      console.error(`${LOG} step=missing_code`);
      return redirectToLogin(origin, "missing_code");
    }

    console.log(`${LOG} step=createClient`);
    const { supabase, getResponse } = createOAuthCallbackSupabaseClient(request);

    const cookieNames = parseCookieHeader(
      request.headers.get("Cookie") ?? ""
    ).map((c) => c.name);
    const hasPkceVerifierCookie = cookieNames.some((n) =>
      n.includes("code-verifier")
    );
    console.log(`${LOG} step=pre_exchange cookie_names`, cookieNames);
    console.log(`${LOG} step=pre_exchange has_pkce_verifier_cookie`, hasPkceVerifierCookie);
    console.log(`${LOG} step=pre_exchange url`, {
      requestUrl: request.url,
      hashFragment: null,
      hashNote:
        "URL hash (#...) is never sent to the server; only path + query in request.url are available for debugging.",
    });

    console.log(`${LOG} step=exchangeCodeForSession`);
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error(`${LOG} step=exchange_failed`, exchangeError.message);
      return redirectToLogin(origin, `exchange:${exchangeError.message}`);
    }

    const sessionCookies = getResponse();

    console.log(`${LOG} step=getUser`);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(`${LOG} step=getUser_failed`, userError?.message ?? "no_user");
      return redirectToLogin(origin, `getUser:${userError?.message ?? "none"}`);
    }

    console.log(`${LOG} step=user_ok`, { id: user.id });

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
      console.error(`${LOG} step=profile_upsert_warn`, e);
    }

    if (!onboarded) {
      console.log(`${LOG} step=redirect`, ONBOARDING_PATH);
      const redirect = NextResponse.redirect(new URL(ONBOARDING_PATH, origin), {
        headers: { "Cache-Control": "no-store" },
      });
      forwardCookies(sessionCookies, redirect);
      return redirect;
    }

    console.log(`${LOG} step=redirect`, nextPath);
    const redirect = NextResponse.redirect(new URL(nextPath, origin), {
      headers: { "Cache-Control": "no-store" },
    });
    forwardCookies(sessionCookies, redirect);
    return redirect;
  } catch (e) {
    console.error(`${LOG} step=fatal`, e);
    return redirectToLogin(origin, `fatal:${e instanceof Error ? e.message : String(e)}`);
  }
}
