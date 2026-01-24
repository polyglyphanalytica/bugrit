import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for route protection and security headers
 *
 * This middleware runs at the edge before requests reach route handlers.
 * It provides global security headers and route protection.
 */

/**
 * Apply global security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable HSTS for secure connections (1 year, include subdomains)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  // Note: 'unsafe-inline' is required for Next.js styled-jsx and inline styles
  // Firebase Auth popup may require 'unsafe-eval' in some edge cases - add only if needed
  const csp = [
    "default-src 'self'",
    // Scripts: self + specific trusted domains. 'unsafe-inline' for Next.js hydration
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://www.googletagmanager.com",
    // Styles: self + inline (required for Next.js) + Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: allow data URIs for inline images, https for external
    "img-src 'self' data: https: blob:",
    // Fonts: self + Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    // API connections: Firebase, Stripe, Google APIs
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.stripe.com https://*.google-analytics.com",
    // Frames: Firebase auth popup, Stripe checkout
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://accounts.google.com",
    // Prevent this page from being embedded
    "frame-ancestors 'none'",
    // Forms can only submit to self
    "form-action 'self'",
    // Base URI restricted to self
    "base-uri 'self'",
    // Upgrade HTTP requests to HTTPS
    "upgrade-insecure-requests",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin API routes require session cookie
  if (pathname.startsWith('/api/admin')) {
    const sessionCookie = request.cookies.get('session');

    // Block requests without session cookie from even reaching admin handlers
    if (!sessionCookie?.value) {
      const response = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      addSecurityHeaders(response);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Add security headers plus cache control for admin responses
    const response = NextResponse.next();
    addSecurityHeaders(response);
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

  // Apply security headers to all other responses
  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
