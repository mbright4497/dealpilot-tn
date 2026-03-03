import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Supabase auth error:", error);
    return null;
  }

  return user ?? null;
}
