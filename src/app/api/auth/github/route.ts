/**
 * GitHub OAuth Initiation
 *
 * GET /api/auth/github - Redirect user to GitHub OAuth authorization
 *
 * Query params:
 * - returnUrl: URL to redirect back to after auth (default: /settings/integrations)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GitHubOAuth } from '@/lib/github/oauth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    const oauth = new GitHubOAuth();

    if (!oauth.isConfigured()) {
      return NextResponse.json(
        { error: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' },
        { status: 500 }
      );
    }

    // Get return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/settings/integrations';

    // Generate state for CSRF protection
    // State contains: userId + returnUrl (base64 encoded)
    const stateData = {
      userId: sessionCookie.value,
      returnUrl,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Generate authorization URL
    const authUrl = oauth.getAuthorizationUrl({
      state,
      scopes: [
        'repo',        // Full access to private repos
        'read:org',    // Read org membership
        'read:user',   // Read user profile
        'user:email',  // Access email
      ],
    });

    // Redirect to GitHub
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error);
    return NextResponse.json({ error: 'Failed to initiate GitHub OAuth' }, { status: 500 });
  }
}
