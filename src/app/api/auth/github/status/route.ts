/**
 * GitHub Connection Status
 *
 * GET /api/auth/github/status - Get current GitHub connection status
 * DELETE /api/auth/github/status - Disconnect GitHub account
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GitHubOAuth } from '@/lib/github/oauth';
import {
  getGitHubConnectionByUser,
  deleteGitHubConnectionByUser,
  toPublicConnection,
} from '@/lib/github/connections';
import { logger } from '@/lib/logger';

async function getUserFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  return sessionCookie?.value || null;
}

/**
 * Get GitHub connection status for current user
 */
export async function GET() {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getGitHubConnectionByUser(userId);

    if (!connection) {
      return NextResponse.json({
        connected: false,
        oauthConfigured: new GitHubOAuth().isConfigured(),
      });
    }

    return NextResponse.json({
      connected: true,
      connection: toPublicConnection(connection),
      oauthConfigured: true,
    });
  } catch (error) {
    logger.error('Error fetching GitHub status', { error });
    return NextResponse.json({ error: 'Failed to fetch GitHub status' }, { status: 500 });
  }
}

/**
 * Disconnect GitHub account
 */
export async function DELETE() {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getGitHubConnectionByUser(userId);

    if (!connection) {
      return NextResponse.json({ error: 'No GitHub connection found' }, { status: 404 });
    }

    // Optionally revoke the token on GitHub's side
    try {
      const oauth = new GitHubOAuth();
      await oauth.revokeToken(connection.accessToken);
    } catch (revokeError) {
      // Token revocation failed, but continue with deletion
      logger.warn('Failed to revoke GitHub token', { error: revokeError });
    }

    // Delete the connection from our database
    const deleted = await deleteGitHubConnectionByUser(userId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'GitHub account disconnected' });
  } catch (error) {
    logger.error('Error disconnecting GitHub', { error });
    return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
  }
}
