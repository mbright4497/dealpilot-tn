export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient, forwardCookies } from "@/lib/supabase/middleware";
import { DASHBOARD_PATH, ONBOARDING_PATH } from "@/lib/auth-constants";

function logCallback(step: number, message: string, extra?: Record<string, unknown>) {
  const line = extra && Object.keys(extra).length
    ? `[auth/callback] step=${step} ${message} ${JSON.stringify(extra)}`
    : `[auth/callback] step=${step} ${message}`;
  console.log(line);
}

function cookieNamesOnly(request: NextRequest): string[] {
  try {
    return request.cookies.getAll().map((c) => c.name);
  } catch {
    return [];
  }
}

function queryParamsSnapshot(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function redirectToLogin(
  origin: string,
  step: number,
  reason: string,
  detail?: Record<string, unknown>
) {
  logCallback(step, "FAIL redirect_to_login", { reason, ...detail });
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("google_auth_failed")}`, origin),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  logCallback(1, "ENTER", {
    pathname: url.pathname,
    query: queryParamsSnapshot(url),
    cookieNames: cookieNamesOnly(request),
  });

  try {
    const errorParam = url.searchParams.get("error");
    const oauthErrorParam = url.searchParams.get("oauth_error");
    const errorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const nextRaw = url.searchParams.get("next") ?? DASHBOARD_PATH;
    const nextPath = nextRaw.startsWith("/") ? nextRaw : DASHBOARD_PATH;
    const authFlowMarker = request.cookies.get("dp_auth_flow")?.value;

    logCallback(2, "PARSED", {
      hasErrorParam: !!errorParam,
      hasOauthErrorParam: !!oauthErrorParam,
      errorDescription: errorDescription ?? null,
      hasCode: !!code,
      codeLength: code?.length ?? 0,
      nextRaw,
      nextPath,
      hasPasswordResetMarker: authFlowMarker === "reset",
    });

    const oauthFailure = errorParam ?? oauthErrorParam;
    if (oauthFailure) {
      return redirectToLogin(origin, 3, "oauth_provider_error", {
        oauthFailure,
        errorDescription: errorDescription ?? null,
      });
    }

    if (!code) {
      return redirectToLogin(origin, 4, "missing_code", { nextPath });
    }

    logCallback(5, "BEFORE createMiddlewareSupabaseClient", {
      cookieNames: cookieNamesOnly(request),
    });

    const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

    logCallback(6, "BEFORE exchangeCodeForSession", { codeLength: code.length });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      logCallback(7, "FAIL exchangeCodeForSession", {
        message: exchangeError.message,
        name: exchangeError.name,
        status: (exchangeError as { status?: number }).status,
      });
      return redirectToLogin(origin, 7, "exchangeCodeForSession", {
        message: exchangeError.message,
        name: exchangeError.name,
      });
    }

    logCallback(8, "OK exchangeCodeForSession");

    const sessionResponse = getResponse();
    logCallback(9, "sessionResponse cookies", {
      setCookieNames: sessionResponse.cookies.getAll().map((c) => c.name),
    });

    logCallback(10, "BEFORE getUser");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logCallback(11, "FAIL getUser", {
        userErrorMessage: userError?.message ?? null,
        userErrorName: userError?.name ?? null,
        hasUser: !!user,
      });
      return redirectToLogin(origin, 11, "getUser", {
        userErrorMessage: userError?.message ?? null,
        hasUser: !!user,
      });
    }

    logCallback(12, "OK getUser", { userId: user.id });

    const onboarded = !!(user.user_metadata as { onboarded?: boolean })?.onboarded;

    try {
      const fullName =
        (user.user_metadata as { full_name?: string })?.full_name ||
        (user.user_metadata as { name?: string })?.name ||
        null;
      if (fullName) {
        logCallback(13, "BEFORE profiles upsert", { hasFullName: true });
        await supabase.from("profiles").upsert({ id: user.id, full_name: fullName });
        logCallback(14, "OK profiles upsert");
      } else {
        logCallback(13, "SKIP profiles upsert no fullName");
      }
    } catch (e) {
      console.error("[auth/callback] profile upsert", e);
      logCallback(14, "WARN profile upsert threw (non-fatal)", {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    // Password recovery:
    // - Supabase may land us on this callback route with PKCE `code` and either:
    //   - `next=/reset-password`, or
    //   - query params like `type=recovery` / `action=recovery`.
    // Always land on `/reset-password` so the user can call `updateUser`,
    // even if they have not completed onboarding yet.
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

    logCallback(15, "SUCCESS redirect", { target, onboarded, nextPath });

    const redirect = NextResponse.redirect(new URL(target, origin), {
      headers: { "Cache-Control": "no-store" },
    });
    forwardCookies(sessionResponse, redirect);
    if (authFlowMarker === "reset") {
      // Clear the flow marker so future auth callbacks don't accidentally
      // redirect to `/reset-password`.
      redirect.cookies.set("dp_auth_flow", "", { path: "/", maxAge: 0 });
    }
    logCallback(16, "DONE forwardCookies to redirect", {
      finalSetCookieNames: redirect.cookies.getAll().map((c) => c.name),
    });
    return redirect;
  } catch (e) {
    console.error("[auth/callback] fatal", e);
    logCallback(99, "FAIL fatal catch", {
      err: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return redirectToLogin(origin, 99, "fatal", {
      err: e instanceof Error ? e.message : String(e),
    });
  }
}
