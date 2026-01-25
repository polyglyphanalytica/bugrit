/**
 * Session verification utilities
 *
 * Provides secure session cookie verification for API routes
 */

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
function ensureFirebaseAdmin(): boolean {
  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
        return true;
      } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
        return false;
      }
    } else if (projectId) {
      // Initialize without service account (will use Application Default Credentials)
      try {
        initializeApp({ projectId });
        return true;
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        return false;
      }
    }
    return false;
  }
  return true;
}

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

    const initialized = ensureFirebaseAdmin();
    if (!initialized || getApps().length === 0) {
      console.warn('Firebase Admin not configured, cannot verify session');
      return null;
    }

    const auth = getAuth();
    // Verify the session cookie. The 'true' parameter checks if the session was revoked.
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    console.error('Session verification failed:', error);
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
