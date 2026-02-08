import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths - no auth required
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/ical/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/locales/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/ical).*)'],
};
