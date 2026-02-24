import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/dashboard')) {
    // Check for any Supabase auth cookie (sb-<ref>-auth-token)
    const hasAuth = Array.from(req.cookies.getAll()).some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    if (!hasAuth) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
