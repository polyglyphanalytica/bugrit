import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { isPlatformAdminByEmail } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

// Initialize Firebase Admin if not already initialized
function getFirebaseAuth() {
  if (getApps().length === 0) {
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      initializeApp({ projectId });
    }
  }
  return getAuth();
}

/**
 * GET /api/auth/check-admin
 * Check if the current user is a platform admin
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

      // For cookie-based auth, we'll verify via Firebase Admin
      try {
        const auth = getFirebaseAuth();
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

    // Extract the token
    const idToken = authHeader.substring(7);

    try {
      const auth = getFirebaseAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return NextResponse.json({ isAdmin: false });
      }

      const isAdmin = await isPlatformAdminByEmail(email);
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
