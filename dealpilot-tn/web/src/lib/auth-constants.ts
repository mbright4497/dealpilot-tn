/** Main app dashboard (Mission Control / chat home). */
export const DASHBOARD_PATH = "/chat";

/** Post-signup / OAuth onboarding route */
export const ONBOARDING_PATH = "/onboarding";

/** Production origin — list exact callback URLs in Supabase Dashboard → Redirect URLs. */
export const PRODUCTION_APP_ORIGIN = "https://dealpilot-tn.vercel.app";

/**
 * `redirectTo` for `signInWithOAuth` (PKCE). Must match an entry in Supabase → Authentication → Redirect URLs.
 */
/**
 * `redirectTo` for `resetPasswordForEmail`. Must match a Redirect URL entry in Supabase
 * (including the `next` query string), e.g.
 * `https://dealpilot-tn.vercel.app/api/auth/callback?next=%2Freset-password`
 */
export function passwordResetCallbackRedirectTo(): string {
  if (typeof window === "undefined") {
    return `${PRODUCTION_APP_ORIGIN}/api/auth/callback?next=${encodeURIComponent("/reset-password")}`;
  }
  const origin =
    window.location.origin === PRODUCTION_APP_ORIGIN
      ? PRODUCTION_APP_ORIGIN
      : window.location.origin;
  return `${origin}/api/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

export function oauthRedirectTo(nextPath: "/chat" | "/onboarding"): string {
  // Supabase redirect allowlists often match the callback URL strictly, without
  // additional query parameters. We rely on the callback route to decide where
  // to send the user (onboarding vs chat) based on user_metadata.
  if (typeof window === "undefined") {
    return `${PRODUCTION_APP_ORIGIN}/api/auth/callback`;
  }
  const origin =
    window.location.origin === PRODUCTION_APP_ORIGIN
      ? PRODUCTION_APP_ORIGIN
      : window.location.origin;
  return `${origin}/api/auth/callback`;
}

/** @deprecated Use oauthRedirectTo */
export const googleOAuthRedirectTo = oauthRedirectTo;
