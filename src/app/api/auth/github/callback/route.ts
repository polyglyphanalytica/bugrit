/**
 * GitHub OAuth Callback
 *
 * GET /api/auth/github/callback - Handle OAuth callback from GitHub
 *
 * Query params (from GitHub):
 * - code: Authorization code to exchange for token
 * - state: State parameter for CSRF validation
 * - error: Error code if authorization failed
 * - error_description: Human-readable error description
 */

import { NextRequest, NextResponse } from 'next/server';
import { GitHubOAuth } from '@/lib/github/oauth';
import { verifySession } from '@/lib/auth/session';
import {
  saveGitHubConnection,
  getGitHubConnectionByUser,
  deleteGitHubConnection,
} from '@/lib/github/connections';
import { logger } from '@/lib/logger';

// State expires after 10 minutes
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

// Validate return URL to prevent open redirect attacks
// Only allow relative paths or paths to our app
function getSafeReturnUrl(returnUrl: string | undefined, baseUrl: string): string {
  const defaultPath = '/settings/integrations';

  if (!returnUrl) return defaultPath;

  try {
    // If it's a relative path starting with /, it's safe
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      // Ensure it doesn't contain protocol-relative tricks
      const cleaned = returnUrl.replace(/[\\]/g, '/');
      if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
        return cleaned;
      }
    }

    // If it's an absolute URL, verify it's for our domain
    const url = new URL(returnUrl, baseUrl);
    const baseUrlParsed = new URL(baseUrl);

    if (url.host === baseUrlParsed.host) {
      return url.pathname + url.search;
    }

    // Not safe, return default
    return defaultPath;
  } catch {
    return defaultPath;
  }
}

export async function GET(request: NextRequest) {
  const getBaseUrl = () => process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    // Build base URL for redirects
    const baseUrl = getBaseUrl();
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle GitHub error response
    if (error) {
      logger.error('GitHub OAuth error', { error, errorDescription });
      const redirectUrl = new URL('/settings/integrations', baseUrl);
      redirectUrl.searchParams.set('error', error);
      redirectUrl.searchParams.set('error_description', errorDescription || 'Authorization failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required params
    if (!code || !state) {
      const redirectUrl = new URL('/settings/integrations', baseUrl);
      redirectUrl.searchParams.set('error', 'invalid_request');
      redirectUrl.searchParams.set('error_description', 'Missing code or state parameter');
      return NextResponse.redirect(redirectUrl);
    }
    // Decode and validate state
    let stateData: { userId: string; returnUrl: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      const redirectUrl = new URL('/settings/integrations', baseUrl);
      redirectUrl.searchParams.set('error', 'invalid_state');
      redirectUrl.searchParams.set('error_description', 'Invalid state parameter');
      return NextResponse.redirect(redirectUrl);
    }

    // Check state expiration
    if (Date.now() - stateData.timestamp > STATE_MAX_AGE_MS) {
      const redirectUrl = new URL('/settings/integrations', baseUrl);
      redirectUrl.searchParams.set('error', 'state_expired');
      redirectUrl.searchParams.set('error_description', 'Authorization request expired. Please try again.');
      return NextResponse.redirect(redirectUrl);
    }

    // Verify session matches state — use decoded UID, not raw cookie
    const session = await verifySession();

    if (!session?.uid || session.uid !== stateData.userId) {
      const redirectUrl = new URL('/settings/integrations', baseUrl);
      redirectUrl.searchParams.set('error', 'session_mismatch');
      redirectUrl.searchParams.set('error_description', 'Session mismatch. Please login and try again.');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for token
    const oauth = new GitHubOAuth();
    const tokenData = await oauth.exchangeCodeForToken(code);

    // Get user info from GitHub
    const githubUser = await oauth.getAuthenticatedUser(tokenData.accessToken);

    // Check if user already has a connection and delete it
    const existingConnection = await getGitHubConnectionByUser(stateData.userId);
    if (existingConnection) {
      await deleteGitHubConnection(existingConnection.id);
    }

    // Save the new connection
    await saveGitHubConnection({
      userId: stateData.userId,
      githubUserId: githubUser.id,
      githubUsername: githubUser.login,
      githubEmail: githubUser.email || undefined,
      githubAvatarUrl: githubUser.avatarUrl || undefined,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      tokenType: tokenData.tokenType || 'bearer',
      scope: tokenData.scope || '',
      connectedAt: new Date(),
      expiresAt: tokenData.expiresAt,
    });

    // Redirect to success page with validated return URL
    const safeReturnPath = getSafeReturnUrl(stateData.returnUrl, baseUrl);
    const redirectUrl = new URL(safeReturnPath, baseUrl);
    redirectUrl.searchParams.set('success', 'github_connected');
    redirectUrl.searchParams.set('username', githubUser.login);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logger.error('GitHub OAuth callback error', { error });
    const redirectUrl = new URL('/settings/integrations', getBaseUrl());
    redirectUrl.searchParams.set('error', 'exchange_failed');
    redirectUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'Failed to complete authorization');
    return NextResponse.redirect(redirectUrl);
  }
}
