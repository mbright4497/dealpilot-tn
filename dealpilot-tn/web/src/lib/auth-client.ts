import { createBrowserClient } from "@/lib/supabase-browser";

/**
 * Clears Supabase auth (browser + server cookies) and navigates to login.
 * Use for header/sidebar logout so session is fully cleared.
 */
export async function signOutAndRedirectToLogin(): Promise<void> {
  const supabase = createBrowserClient();
  await supabase.auth.signOut().catch(() => {});
  try {
    await fetch("/api/auth/signout", { method: "POST" });
  } catch {
    // non-fatal; full reload still clears client state
  }
  window.location.href = "/login";
}
