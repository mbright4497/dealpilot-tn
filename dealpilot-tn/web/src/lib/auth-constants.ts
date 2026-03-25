/** Main app dashboard (Mission Control / chat home). */
export const DASHBOARD_PATH = "/chat";

/** Post-signup / OAuth onboarding route */
export const ONBOARDING_PATH = "/onboarding";

/** Production host — OAuth redirectTo must match Supabase Redirect URLs exactly. */
export const PRODUCTION_APP_ORIGIN = "https://dealpilot-tn.vercel.app";

/**
 * `redirectTo` for Google OAuth (PKCE). On production, use exact strings listed in
 * docs/SUPABASE_AUTH_REDIRECTS.md. Elsewhere, same path with current origin.
 */
export function googleOAuthRedirectTo(nextPath: "/chat" | "/onboarding"): string {
  if (typeof window === "undefined") {
    return `${PRODUCTION_APP_ORIGIN}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  if (window.location.origin === PRODUCTION_APP_ORIGIN) {
    return nextPath === "/chat"
      ? "https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Fchat"
      : "https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Fonboarding";
  }
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
