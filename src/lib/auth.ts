/**
 * Authentication Utilities
 *
 * Provides Firebase Auth token verification for API routes.
 */

import { getAdminAuth } from './firebase-admin';

/**
 * Verify a Firebase ID token
 *
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with uid and email, or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const auth = getAdminAuth();
  if (!auth) {
    console.warn('Firebase Admin not configured, cannot verify ID token');
    return null;
  }

  try {
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
