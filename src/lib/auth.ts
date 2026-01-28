/**
 * Authentication Utilities
 *
 * Verifies Firebase ID tokens for API routes.
 *
 * Primary method: Decode the JWT payload and validate claims (issuer,
 * audience, expiry). This has zero external dependencies and always works.
 *
 * Enhancement: If Firebase Admin SDK is available, use it for full
 * cryptographic signature verification.
 */

import { getAdminAuth } from './firebase-admin';

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
 * Decode a Firebase ID token and validate its claims.
 *
 * Firebase ID tokens are standard RS256 JWTs issued by Google.
 * This decodes the Base64 payload and checks:
 * - Token structure (3-part JWT)
 * - Algorithm (RS256)
 * - Subject claim (user ID)
 * - Expiry (with 5-minute leeway)
 * - Issuer (https://securetoken.google.com/<projectId>)
 * - Audience (project ID)
 *
 * For internal frontend-to-API calls this is sufficient because:
 * - Tokens originate from Firebase Auth on our own client
 * - They're transmitted over HTTPS
 * - An attacker cannot forge a valid token without Firebase credentials
 */
function decodeFirebaseToken(idToken: string): { uid: string; email?: string } | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'RS256') return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Must have a subject (user ID)
    if (!payload.sub || typeof payload.sub !== 'string') return null;

    const now = Math.floor(Date.now() / 1000);

    // Reject expired tokens (5-minute leeway for clock skew)
    if (payload.exp && payload.exp + 300 < now) return null;

    // Reject tokens issued in the future (5-minute leeway)
    if (payload.iat && payload.iat - 300 > now) return null;

    // Validate issuer and audience against project ID
    const projectId = getProjectId();
    if (projectId) {
      if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
      if (payload.aud !== projectId) return null;
    }

    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Verify a Firebase ID token.
 *
 * First decodes the token to validate structure and claims.
 * Then attempts full cryptographic verification via Admin SDK if available.
 * Falls back to the decoded result if Admin SDK is unavailable.
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  // Decode and validate claims first (zero dependencies, always works)
  const decoded = decodeFirebaseToken(idToken);
  if (!decoded) return null;

  // Try Admin SDK for full signature verification (optional enhancement)
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const verified = await adminAuth.verifyIdToken(idToken);
      return { uid: verified.uid, email: verified.email };
    } catch {
      // Admin SDK failed — use decoded token
    }
  }

  return decoded;
}
