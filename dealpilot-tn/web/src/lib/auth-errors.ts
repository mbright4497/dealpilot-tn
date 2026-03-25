import type { AuthError } from "@supabase/supabase-js";

/**
 * Maps Supabase Auth errors to short, user-facing copy.
 */
export function friendlyAuthMessage(
  error: Pick<AuthError, "message" | "status"> | Error | string | null | undefined
): string {
  if (error == null) return "Something went wrong. Please try again.";
  const raw = typeof error === "string" ? error : error.message || "";
  const m = raw.toLowerCase();

  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "Invalid email or password. Check your details and try again.";
  }
  if (
    m.includes("user already registered") ||
    m.includes("already registered") ||
    m.includes("already been registered")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "Confirm your email using the link we sent, then sign in.";
  }
  if (m.includes("password") && (m.includes("at least") || m.includes("least 6") || m.includes("short"))) {
    return "Password is too weak. Use at least 6 characters (longer is better).";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "New sign-ups are disabled. Contact your administrator.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (m.includes("missing_code")) {
    return "Sign-in could not be completed. Please try email sign-in or try again.";
  }
  if (m === "google_auth_failed" || m.includes("google_auth_failed")) {
    return "Google sign-in didn’t finish. Try again or use email and password.";
  }
  if (m.includes("not_authenticated")) {
    return "Google sign-in didn’t complete. Try again or use email.";
  }

  return raw || "Something went wrong. Please try again.";
}
