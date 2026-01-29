import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/auth';
import { isPlatformAdminByEmail } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/check-admin
 * Check if the current user is a platform admin
 *
 * Supports:
 * 1. Bearer token (Authorization header) — uses verifyIdToken with JWT decode fallback
 * 2. Session cookie — requires Firebase Admin SDK
 */
export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      // Try to get from cookie
      const sessionCookie = request.cookies.get('session')?.value;

      if (!sessionCookie) {
        return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 });
      }

      // Session cookie verification requires Firebase Admin SDK
      try {
        const auth = getAdminAuth();
        if (!auth) {
          // Admin SDK unavailable — can't verify session cookies
          return NextResponse.json({ isAdmin: false });
        }
        const decodedToken = await auth.verifySessionCookie(sessionCookie);
        const email = decodedToken.email;

        if (!email) {
          return NextResponse.json({ isAdmin: false });
        }

        const isAdmin = await isPlatformAdminByEmail(email);
        // SECURITY: Don't return email to prevent email enumeration
        return NextResponse.json({ isAdmin });
      } catch {
        return NextResponse.json({ isAdmin: false });
      }
    }

    // Extract the Bearer token and verify it
    // verifyIdToken has a JWT decode fallback when Admin SDK is unavailable
    const idToken = authHeader.substring(7);

    try {
      const decoded = await verifyIdToken(idToken);
      if (!decoded?.email) {
        return NextResponse.json({ isAdmin: false });
      }

      const isAdmin = await isPlatformAdminByEmail(decoded.email);
      // SECURITY: Don't return email to prevent email enumeration
      return NextResponse.json({ isAdmin });
    } catch (error) {
      logger.error('Token verification failed', { error });
      return NextResponse.json({ isAdmin: false, error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    logger.error('Admin check failed', { error });
    return NextResponse.json({ isAdmin: false, error: 'Internal error' }, { status: 500 });
  }
}
