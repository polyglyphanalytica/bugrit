import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for route protection
 *
 * This middleware runs at the edge before requests reach route handlers.
 * It provides an early security barrier for admin routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin API routes require session cookie
  if (pathname.startsWith('/api/admin')) {
    const sessionCookie = request.cookies.get('session');

    // Block requests without session cookie from even reaching admin handlers
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
          }
        }
      );
    }

    // Add security headers to admin responses
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  }

  // Admin page requires session cookie
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie?.value) {
      // Redirect to login for admin page access without session
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all admin API routes
    '/api/admin/:path*',
    // Match admin page routes
    '/admin/:path*',
  ],
};
