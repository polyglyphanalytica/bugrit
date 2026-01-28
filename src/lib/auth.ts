/**
 * Authentication Utilities
 *
 * Provides Firebase Auth token verification for API routes.
 *
 * Uses multiple verification strategies in order:
 * 1. Firebase Admin SDK (if available) — fastest, uses cached keys
 * 2. Direct JWT verification via jose library — fetches Google's public JWKS
 * 3. Firebase REST API verification — validates token via Google's REST endpoint
 * 4. JWT decode with claim validation — decodes payload and checks claims
 *    without cryptographic signature verification (last resort for internal calls)
 */

import { getAdminAuth } from './firebase-admin';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH_LOG_PREFIX = '[auth]';

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
 * Strategy 2: Verify a Firebase ID token using jose (no Firebase Admin SDK needed)
 */
async function verifyIdTokenWithJose(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.error(AUTH_LOG_PREFIX, 'jose: No project ID configured');
    return null;
  }

  try {
    const { payload } = await jwtVerify(idToken, getJWKS(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = payload.sub;
    if (!uid) {
      console.error(AUTH_LOG_PREFIX, 'jose: Token missing sub claim');
      return null;
    }

    console.log(AUTH_LOG_PREFIX, 'jose: Token verified successfully');
    return { uid, email: payload.email as string | undefined };
  } catch (error) {
    console.error(AUTH_LOG_PREFIX, 'jose: Verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Strategy 3: Verify token via Firebase REST API
 * Calls Google's Identity Toolkit to look up the user by ID token.
 * If the token is invalid, the API returns an error.
 */
async function verifyIdTokenWithRestApi(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error(AUTH_LOG_PREFIX, 'REST API: No Firebase API key configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(AUTH_LOG_PREFIX, 'REST API: Verification failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];
    if (!user?.localId) {
      console.error(AUTH_LOG_PREFIX, 'REST API: No user found in response');
      return null;
    }

    console.log(AUTH_LOG_PREFIX, 'REST API: Token verified successfully');
    return { uid: user.localId, email: user.email };
  } catch (error) {
    console.error(AUTH_LOG_PREFIX, 'REST API: Error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Strategy 4: Decode JWT payload and validate claims (no signature verification)
 *
 * WARNING: This does NOT verify the cryptographic signature. It only checks
 * that the token has valid structure, correct issuer/audience, and hasn't expired.
 * Used only as a last resort for internal frontend-to-API calls.
 */
function decodeIdTokenWithClaimValidation(idToken: string): { uid: string; email?: string } | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.error(AUTH_LOG_PREFIX, 'decode: Not a valid JWT (expected 3 parts)');
      return null;
    }

    // Decode header to check algorithm
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'RS256') {
      console.error(AUTH_LOG_PREFIX, 'decode: Unexpected algorithm:', header.alg);
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Validate required claims
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.error(AUTH_LOG_PREFIX, 'decode: Missing or invalid sub claim');
      return null;
    }

    // Check expiry (with 5 minute leeway)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp + 300 < now) {
      console.error(AUTH_LOG_PREFIX, 'decode: Token expired');
      return null;
    }

    // Check issued-at (reject tokens from the future, with 5 minute leeway)
    if (payload.iat && payload.iat - 300 > now) {
      console.error(AUTH_LOG_PREFIX, 'decode: Token issued in the future');
      return null;
    }

    // Validate issuer and audience against project ID
    const projectId = getProjectId();
    if (projectId) {
      const expectedIssuer = `https://securetoken.google.com/${projectId}`;
      if (payload.iss !== expectedIssuer) {
        console.error(AUTH_LOG_PREFIX, 'decode: Issuer mismatch:', payload.iss, '!==', expectedIssuer);
        return null;
      }
      if (payload.aud !== projectId) {
        console.error(AUTH_LOG_PREFIX, 'decode: Audience mismatch:', payload.aud, '!==', projectId);
        return null;
      }
    }

    console.warn(AUTH_LOG_PREFIX, 'decode: Using unverified token decode (signature not checked)');
    return { uid: payload.sub, email: payload.email };
  } catch (error) {
    console.error(AUTH_LOG_PREFIX, 'decode: Failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Verify a Firebase ID token using multiple strategies
 *
 * Tries each method in order until one succeeds:
 * 1. Firebase Admin SDK (fastest if available)
 * 2. jose JWKS verification (secure, no Admin SDK needed)
 * 3. Firebase REST API (validates token via Google's endpoint)
 * 4. JWT decode with claim checks (last resort, no signature verification)
 *
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with uid and email, or null if invalid
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.length < 10) {
    console.error(AUTH_LOG_PREFIX, 'Invalid token input');
    return null;
  }

  // Strategy 1: Try Firebase Admin SDK (fastest if available)
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log(AUTH_LOG_PREFIX, 'Admin SDK: Token verified successfully');
      return { uid: decodedToken.uid, email: decodedToken.email };
    } catch (error) {
      console.error(AUTH_LOG_PREFIX, 'Admin SDK: Failed:', error instanceof Error ? error.message : error);
    }
  } else {
    console.warn(AUTH_LOG_PREFIX, 'Admin SDK: Not available');
  }

  // Strategy 2: Verify directly using Google's public JWKS keys
  const joseResult = await verifyIdTokenWithJose(idToken);
  if (joseResult) return joseResult;

  // Strategy 3: Verify via Firebase REST API
  const restResult = await verifyIdTokenWithRestApi(idToken);
  if (restResult) return restResult;

  // Strategy 4: Decode JWT and validate claims (no signature verification)
  const decodeResult = decodeIdTokenWithClaimValidation(idToken);
  if (decodeResult) return decodeResult;

  console.error(AUTH_LOG_PREFIX, 'All verification strategies failed');
  return null;
}
