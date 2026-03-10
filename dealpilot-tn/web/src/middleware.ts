import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth", "/embed", "/api/eva/playbook-gaps", "/api/eva/briefing"]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers }, });

  const supabase = createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user || null

  const pathname = request.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.some(p => pathname.startsWith(p))

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const home = new URL('/', request.url)
    return NextResponse.redirect(home)
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
