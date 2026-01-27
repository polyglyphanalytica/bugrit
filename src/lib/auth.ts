/**
 * Authentication Utilities
 *
 * Provides Firebase Auth token verification for API routes.
 *
 * Uses two verification strategies:
 * 1. Firebase Admin SDK (if available) — fastest, uses cached keys
 * 2. Direct JWT verification via jose library — works without Firebase Admin,
 *    fetches Google's public JWKS keys and verifies the token signature directly.
 *    This is the reliable fallback that works in any deployment environment.
 */

import { getAdminAuth } from './firebase-admin';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Google's JWKS endpoint for Firebase ID tokens
const GOOGLE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

// Cached JWKS fetcher — jose handles key caching and rotation automatically
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);
  }
  return jwks;
}

/**
 * Get the Firebase project ID from environment variables
 */
function getProjectId(): string | null {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    null
  );
}

/**
 * Verify a Firebase ID token using jose (no Firebase Admin SDK needed)
 *
 * This verifies the token by:
 * 1. Fetching Google's public JWKS keys
 * 2. Verifying the JWT signature matches
 * 3. Checking issuer, audience, and expiry claims
 */
async function verifyIdTokenWithJose(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.error('No Firebase project ID configured — cannot verify ID token');
    return null;
  }

  try {
    const { payload } = await jwtVerify(idToken, getJWKS(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = payload.sub;
    if (!uid) {
      console.error('Firebase ID token missing sub claim');
      return null;
    }

    return {
      uid,
      email: payload.email as string | undefined,
    };
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Verify a Firebase ID token
 *
 * Tries Firebase Admin SDK first (faster, cached), falls back to
 * direct JWT verification via jose if Admin SDK is unavailable.
 *
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with uid and email, or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  // Strategy 1: Try Firebase Admin SDK (fastest if available)
  const auth = getAdminAuth();
  if (auth) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error) {
      console.error('Firebase Admin token verification failed:', error);
      // Don't return null yet — fall through to jose verification
    }
  }

  // Strategy 2: Verify directly using Google's public JWKS keys
  return verifyIdTokenWithJose(idToken);
}
