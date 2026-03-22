import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth", "/embed"]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers }, });

  let user = null
  try{
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  }catch(e){
    // if Supabase is not configured or errors during middleware, do not block the request
    console.error('middleware supabase error', e)
    return response
  }

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
