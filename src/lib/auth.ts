/**
 * Authentication Utilities
 *
 * Provides Firebase Auth token verification for API routes.
 */

import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

/**
 * Ensure Firebase Admin is initialized
 */
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
        console.error('Failed to initialize Firebase Admin:', error);
        return false;
      }
    } else if (projectId) {
      initializeApp({ projectId });
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Verify a Firebase ID token
 *
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with uid and email, or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!ensureFirebaseAdmin()) {
    return null;
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return null;
  }
}
