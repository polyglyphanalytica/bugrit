/**
 * Session verification utilities
 *
 * Provides secure session cookie verification for API routes
 */

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

export interface SessionUser {
  uid: string;
  email: string | undefined;
}

/**
 * Verify session cookie and return user info
 * Returns null if not authenticated or session is invalid
 */
export async function verifySession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const auth = getAdminAuth();
    if (!auth) {
      console.warn('Firebase Admin not configured, cannot verify session');
      return null;
    }

    // Verify the session cookie. The 'true' parameter checks if the session was revoked.
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    // Log specific error types for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('expired') || errorMessage.includes('revoked')) {
      console.log('Session expired or revoked');
    } else {
      console.error('Session verification failed:', errorMessage);
    }
    return null;
  }
}

/**
 * Require authenticated session
 * Throws if not authenticated
 */
export async function requireSession(): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
