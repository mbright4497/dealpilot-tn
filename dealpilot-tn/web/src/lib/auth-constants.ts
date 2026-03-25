/** Main app dashboard (Mission Control / chat home). */
export const DASHBOARD_PATH = "/chat";

/** Post-signup / OAuth onboarding route */
export const ONBOARDING_PATH = "/onboarding";

/** Production origin — list exact callback URLs in Supabase Dashboard → Redirect URLs. */
export const PRODUCTION_APP_ORIGIN = "https://dealpilot-tn.vercel.app";

/**
 * `redirectTo` for `signInWithOAuth` (PKCE). Must match an entry in Supabase → Authentication → Redirect URLs.
 */
export function oauthRedirectTo(nextPath: "/chat" | "/onboarding"): string {
  if (typeof window === "undefined") {
    return `${PRODUCTION_APP_ORIGIN}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  if (window.location.origin === PRODUCTION_APP_ORIGIN) {
    return `${PRODUCTION_APP_ORIGIN}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/** @deprecated Use oauthRedirectTo */
export const googleOAuthRedirectTo = oauthRedirectTo;
