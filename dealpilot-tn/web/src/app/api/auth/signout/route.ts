import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Clears Supabase auth cookies (SSR session). Call after or with client signOut.
 */
export async function POST() {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
