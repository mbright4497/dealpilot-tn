export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=missing_code`, url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  // After successful exchange, try to sync profile name into profiles table and redirect to onboarding if needed
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user
    let onboarded = false
    if (user) {
      const fullName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || null
      if (fullName) {
        // upsert into profiles table
        await supabase.from('profiles').upsert({ id: user.id, full_name: fullName }).eq('id', user.id)
      }
      onboarded = !!(user.user_metadata as any)?.onboarded
    }
    if (!onboarded) {
      return NextResponse.redirect(new URL('/onboarding', url.origin))
    }
  } catch (e) {
    // non-fatal
    console.warn('Profile sync failed', e)
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

