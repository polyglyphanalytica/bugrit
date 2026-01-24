/**
 * GitHub User Connections
 *
 * Manages GitHub OAuth tokens for users, enabling access to private repositories.
 * Tokens are stored securely and associated with user accounts.
 */

import { getDb, toDate, toTimestamp, generateId } from '../firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '../logger';

const COLLECTION = 'githubConnections';

export interface GitHubConnection {
  id: string;
  userId: string;
  organizationId?: string;

  // GitHub user info
  githubUserId: number;
  githubUsername: string;
  githubEmail?: string;
  githubAvatarUrl?: string;

  // OAuth tokens
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string;

  // Metadata
  connectedAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

export interface GitHubConnectionPublic {
  id: string;
  githubUsername: string;
  githubAvatarUrl?: string;
  scope: string;
  connectedAt: Date;
  lastUsedAt?: Date;
}

// In-memory fallback for development
const connectionStore = new Map<string, GitHubConnection>();

/**
 * Save a new GitHub connection for a user
 */
export async function saveGitHubConnection(
  connection: Omit<GitHubConnection, 'id'>
): Promise<GitHubConnection> {
  const db = getDb();
  const id = generateId('ghc');

  const fullConnection: GitHubConnection = {
    id,
    ...connection,
  };

  if (!db) {
    connectionStore.set(id, fullConnection);
    return fullConnection;
  }

  await db.collection(COLLECTION).doc(id).set({
    ...fullConnection,
    connectedAt: toTimestamp(connection.connectedAt),
    lastUsedAt: connection.lastUsedAt ? toTimestamp(connection.lastUsedAt) : null,
    expiresAt: connection.expiresAt ? toTimestamp(connection.expiresAt) : null,
  });

  return fullConnection;
}

/**
 * Get GitHub connection for a user
 */
export async function getGitHubConnectionByUser(
  userId: string
): Promise<GitHubConnection | null> {
  const db = getDb();

  if (!db) {
    return Array.from(connectionStore.values()).find(
      (c) => c.userId === userId
    ) || null;
  }

  const snapshot = await db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    organizationId: data.organizationId,
    githubUserId: data.githubUserId,
    githubUsername: data.githubUsername,
    githubEmail: data.githubEmail,
    githubAvatarUrl: data.githubAvatarUrl,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: data.tokenType,
    scope: data.scope,
    connectedAt: toDate(data.connectedAt),
    lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
    expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
  };
}

/**
 * Get GitHub connection by organization
 */
export async function getGitHubConnectionByOrganization(
  organizationId: string
): Promise<GitHubConnection | null> {
  const db = getDb();

  if (!db) {
    return Array.from(connectionStore.values()).find(
      (c) => c.organizationId === organizationId
    ) || null;
  }

  const snapshot = await db
    .collection(COLLECTION)
    .where('organizationId', '==', organizationId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    organizationId: data.organizationId,
    githubUserId: data.githubUserId,
    githubUsername: data.githubUsername,
    githubEmail: data.githubEmail,
    githubAvatarUrl: data.githubAvatarUrl,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: data.tokenType,
    scope: data.scope,
    connectedAt: toDate(data.connectedAt),
    lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
    expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
  };
}

/**
 * Get public connection info (without sensitive tokens)
 */
export function toPublicConnection(connection: GitHubConnection): GitHubConnectionPublic {
  return {
    id: connection.id,
    githubUsername: connection.githubUsername,
    githubAvatarUrl: connection.githubAvatarUrl,
    scope: connection.scope,
    connectedAt: connection.connectedAt,
    lastUsedAt: connection.lastUsedAt,
  };
}

/**
 * Update last used timestamp
 */
export async function updateLastUsed(connectionId: string): Promise<void> {
  const db = getDb();
  const now = new Date();

  if (!db) {
    const conn = connectionStore.get(connectionId);
    if (conn) {
      conn.lastUsedAt = now;
    }
    return;
  }

  await db.collection(COLLECTION).doc(connectionId).update({
    lastUsedAt: toTimestamp(now),
  });
}

/**
 * Delete a GitHub connection
 */
export async function deleteGitHubConnection(connectionId: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return connectionStore.delete(connectionId);
  }

  await db.collection(COLLECTION).doc(connectionId).delete();
  return true;
}

/**
 * Delete GitHub connection by user
 */
export async function deleteGitHubConnectionByUser(userId: string): Promise<boolean> {
  const connection = await getGitHubConnectionByUser(userId);
  if (!connection) return false;
  return deleteGitHubConnection(connection.id);
}

/**
 * Check if user has a valid GitHub connection
 */
export async function hasValidGitHubConnection(userId: string): Promise<boolean> {
  const connection = await getGitHubConnectionByUser(userId);
  if (!connection) return false;

  // Check if token has expired (if expiry is set)
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    return false;
  }

  return true;
}

/**
 * Get access token for a user, updating last used time.
 * Automatically refreshes the token if expired and refresh token is available.
 */
export async function getAccessTokenForUser(userId: string): Promise<string | null> {
  const connection = await getGitHubConnectionByUser(userId);
  if (!connection) return null;

  // Check if expired
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    // Attempt to refresh the token
    if (connection.refreshToken) {
      try {
        const refreshed = await refreshGitHubToken(connection);
        if (refreshed) {
          return refreshed.accessToken;
        }
      } catch (error) {
        // Refresh failed - connection needs to be re-established
        logger.warn('GitHub token refresh failed', { userId, error });
      }
    }
    return null;
  }

  // Update last used
  await updateLastUsed(connection.id);

  return connection.accessToken;
}

/**
 * Refresh a GitHub token using the refresh token
 */
async function refreshGitHubToken(connection: GitHubConnection): Promise<GitHubConnection | null> {
  if (!connection.refreshToken) return null;

  try {
    const { GitHubOAuth } = await import('./oauth');
    const oauth = new GitHubOAuth();
    const tokenData = await oauth.refreshAccessToken(connection.refreshToken);

    // Update the connection with new tokens
    const db = getDb();
    if (!db) return null;

    const updates = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken || connection.refreshToken,
      expiresAt: tokenData.expiresAt || null,
    };

    await db.collection(COLLECTION).doc(connection.id).update({
      ...updates,
      expiresAt: updates.expiresAt ? Timestamp.fromDate(updates.expiresAt) : null,
    });

    logger.info('GitHub token refreshed successfully', { connectionId: connection.id });

    return {
      ...connection,
      ...updates,
      expiresAt: updates.expiresAt || undefined,
    };
  } catch (error) {
    logger.error('Failed to refresh GitHub token', { connectionId: connection.id, error });
    return null;
  }
}

/**
 * Get access token for an organization
 */
export async function getAccessTokenForOrganization(
  organizationId: string
): Promise<string | null> {
  const connection = await getGitHubConnectionByOrganization(organizationId);
  if (!connection) return null;

  if (connection.expiresAt && connection.expiresAt < new Date()) {
    return null;
  }

  await updateLastUsed(connection.id);

  return connection.accessToken;
}
