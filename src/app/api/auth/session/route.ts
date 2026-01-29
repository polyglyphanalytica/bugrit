/**
 * Session Management API
 *
 * POST /api/auth/session - Create session from Firebase ID token
 * DELETE /api/auth/session - Clear session (logout)
 *
 * When Firebase Admin SDK is available: creates a session cookie for server-side auth.
 * When Admin SDK is unavailable: verifies the token via JWT decode fallback and
 * returns success (without a cookie). The client continues using Bearer token auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/auth';

// Session duration: 5 days
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Create session cookie from Firebase ID token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let idToken: string;
    try {
      const body = await request.json();
      idToken = body.idToken;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token required' },
        { status: 400 }
      );
    }

    // Try Firebase Admin SDK first (full session cookie flow)
    const auth = getAdminAuth();
    if (auth) {
      // Verify the ID token
      let decodedToken;
      try {
        decodedToken = await auth.verifyIdToken(idToken);
      } catch (verifyError) {
        const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
        console.error('ID token verification failed:', errorMessage);
        return NextResponse.json(
          { error: 'Invalid ID token', details: errorMessage },
          { status: 401 }
        );
      }

      // Create session cookie
      // Note: createSessionCookie requires a fresh ID token (issued within last 5 minutes)
      let sessionCookie: string;
      try {
        sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: SESSION_DURATION_MS,
        });
      } catch (cookieError) {
        const errorMessage = cookieError instanceof Error ? cookieError.message : 'Unknown error';
        console.error('Session cookie creation failed:', errorMessage);

        // Check if it's a token-too-old error
        if (errorMessage.includes('recent') || errorMessage.includes('expired')) {
          return NextResponse.json(
            { error: 'Token too old. Please refresh and try again.' },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to create session cookie', details: errorMessage },
          { status: 500 }
        );
      }

      // Set the session cookie
      const cookieStore = await cookies();
      cookieStore.set('session', sessionCookie, {
        maxAge: SESSION_DURATION_MS / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return NextResponse.json({
        success: true,
        sessionCreated: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      });
    }

    // Fallback: Admin SDK unavailable — verify token via JWT decode
    // Session cookie can't be created without Admin SDK, but client can
    // continue using Bearer token auth for all API calls.
    try {
      const decoded = await verifyIdToken(idToken);
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid ID token' },
          { status: 401 }
        );
      }

      console.warn('[session] Admin SDK unavailable — session cookie not created, client will use Bearer token auth');

      return NextResponse.json({
        success: true,
        sessionCreated: false,
        user: {
          uid: decoded.uid,
          email: decoded.email,
        },
      });
    } catch (verifyError) {
      const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
      console.error('Token verification failed (fallback):', errorMessage);
      return NextResponse.json(
        { error: 'Invalid ID token' },
        { status: 401 }
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in session creation:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Clear session cookie (logout)
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
