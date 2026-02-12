/**
 * GitHub Integration
 *
 * Provides access to GitHub repositories including private repos
 * via GitHub App installation for secure OAuth access.
 */

import { getDb, toDate, toTimestamp, generateId, COLLECTIONS } from '../firestore';
import { devConsole } from '@/lib/console';

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export interface GitHubInstallation {
  id: string;
  organizationId: string;
  installationId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  targetType: 'all' | 'selected';
  repositorySelection: 'all' | 'selected';
  permissions: GitHubPermissions;
  events: string[];
  connectedAt: Date;
  accessTokenExpiresAt?: Date;
}

export interface GitHubPermissions {
  contents: 'read' | 'write';
  metadata: 'read';
  pullRequests?: 'read' | 'write';
  issues?: 'read' | 'write';
  actions?: 'read' | 'write';
  checks?: 'read' | 'write';
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  language?: string;
  description?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    message?: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
}

// In-memory fallback
const installationStore = new Map<string, GitHubInstallation>();
const tokenCache = new Map<number, { token: string; expiresAt: Date }>();

/**
 * Check if GitHub App is configured
 */
export function isGitHubConfigured(): boolean {
  return !!(GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY && GITHUB_CLIENT_ID);
}

/**
 * Get GitHub App installation OAuth URL
 */
export function getInstallationUrl(state: string): string {
  if (!GITHUB_CLIENT_ID) {
    throw new Error('GitHub App not configured');
  }
  return `https://github.com/apps/buggered-testing/installations/new?state=${encodeURIComponent(state)}`;
}

/**
 * Exchange OAuth code for installation access
 */
export async function exchangeCodeForInstallation(
  code: string,
  organizationId: string
): Promise<GitHubInstallation | null> {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    devConsole.warn('GitHub not configured');
    return null;
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      devConsole.error('GitHub OAuth error:', tokenData.error);
      return null;
    }

    // Get user installations
    const installationsResponse = await fetch('https://api.github.com/user/installations', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    const installationsData = await installationsResponse.json();

    if (!installationsData.installations || installationsData.installations.length === 0) {
      return null;
    }

    // Use the first installation
    const ghInstallation = installationsData.installations[0];

    const installation: GitHubInstallation = {
      id: generateId('ghi'),
      organizationId,
      installationId: ghInstallation.id,
      accountLogin: ghInstallation.account.login,
      accountType: ghInstallation.account.type,
      targetType: ghInstallation.target_type,
      repositorySelection: ghInstallation.repository_selection,
      permissions: {
        contents: ghInstallation.permissions.contents || 'read',
        metadata: 'read',
        pullRequests: ghInstallation.permissions.pull_requests,
        issues: ghInstallation.permissions.issues,
        actions: ghInstallation.permissions.actions,
        checks: ghInstallation.permissions.checks,
      },
      events: ghInstallation.events || [],
      connectedAt: new Date(),
    };

    // Save to database
    await saveInstallation(installation);

    return installation;
  } catch (error) {
    devConsole.error('GitHub installation exchange error:', error);
    return null;
  }
}

/**
 * Save GitHub installation to database
 */
async function saveInstallation(installation: GitHubInstallation): Promise<void> {
  const db = getDb();

  if (!db) {
    installationStore.set(installation.id, installation);
    return;
  }

  await db.collection('githubInstallations').doc(installation.id).set({
    ...installation,
    connectedAt: toTimestamp(installation.connectedAt),
    accessTokenExpiresAt: installation.accessTokenExpiresAt
      ? toTimestamp(installation.accessTokenExpiresAt)
      : null,
  });
}

/**
 * Get GitHub installation for organization
 */
export async function getInstallationByOrganization(
  organizationId: string
): Promise<GitHubInstallation | null> {
  const db = getDb();

  if (!db) {
    return Array.from(installationStore.values()).find(
      (i) => i.organizationId === organizationId
    ) || null;
  }

  const snapshot = await db
    .collection('githubInstallations')
    .where('organizationId', '==', organizationId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    organizationId: data.organizationId,
    installationId: data.installationId,
    accountLogin: data.accountLogin,
    accountType: data.accountType,
    targetType: data.targetType,
    repositorySelection: data.repositorySelection,
    permissions: data.permissions,
    events: data.events,
    connectedAt: toDate(data.connectedAt),
    accessTokenExpiresAt: data.accessTokenExpiresAt
      ? toDate(data.accessTokenExpiresAt)
      : undefined,
  };
}

/**
 * Delete GitHub installation
 */
export async function deleteInstallation(installationId: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return installationStore.delete(installationId);
  }

  await db.collection('githubInstallations').doc(installationId).delete();
  return true;
}

/**
 * Get installation access token using JWT
 */
async function getInstallationAccessToken(installationId: number): Promise<string | null> {
  // Check cache first
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > new Date()) {
    return cached.token;
  }

  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    devConsole.warn('GitHub App not configured for token generation');
    return null;
  }

  try {
    // Generate JWT for app authentication
    const jwt = await generateAppJwt();

    // Exchange JWT for installation token
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      devConsole.error('Failed to get installation token:', await response.text());
      return null;
    }

    const data = await response.json();

    // Cache the token
    tokenCache.set(installationId, {
      token: data.token,
      expiresAt: new Date(data.expires_at),
    });

    return data.token;
  } catch (error) {
    devConsole.error('Error getting installation token:', error);
    return null;
  }
}

/**
 * Generate JWT for GitHub App authentication
 * Uses RS256 algorithm with the GitHub App private key
 */
async function generateAppJwt(): Promise<string> {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    devConsole.warn('GitHub App not configured - missing APP_ID or PRIVATE_KEY');
    return '';
  }

  try {
    // Import jose for JWT signing
    const { SignJWT, importPKCS8 } = await import('jose');

    // Parse the private key (GitHub gives us a PKCS#8 PEM format key)
    // Handle both escaped newlines from env vars and actual newlines
    const privateKeyPem = GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');

    const now = Math.floor(Date.now() / 1000);

    // Create and sign the JWT
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now - 60) // Allow 60 seconds clock drift
      .setExpirationTime(now + 600) // 10 minutes (GitHub max)
      .setIssuer(GITHUB_APP_ID)
      .sign(privateKey);

    return jwt;
  } catch (error) {
    devConsole.error('Failed to generate GitHub App JWT:', error);
    return '';
  }
}

/**
 * List repositories accessible to the installation
 */
export async function listRepositories(
  installation: GitHubInstallation
): Promise<GitHubRepository[]> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return [];
  }

  try {
    const response = await fetch('https://api.github.com/installation/repositories', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      devConsole.error('Failed to list repositories:', await response.text());
      return [];
    }

    const data = await response.json();

    return data.repositories.map((repo: Record<string, unknown>) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      cloneUrl: repo.clone_url,
      language: repo.language,
      description: repo.description,
    }));
  } catch (error) {
    devConsole.error('Error listing repositories:', error);
    return [];
  }
}

/**
 * Get repository details
 */
export async function getRepository(
  installation: GitHubInstallation,
  owner: string,
  repo: string
): Promise<GitHubRepository | null> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch,
      cloneUrl: data.clone_url,
      language: data.language,
      description: data.description,
    };
  } catch (error) {
    devConsole.error('Error getting repository:', error);
    return null;
  }
}

/**
 * List branches for a repository
 */
export async function listBranches(
  installation: GitHubInstallation,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.map((branch: Record<string, unknown>) => ({
      name: branch.name,
      commit: {
        sha: (branch.commit as Record<string, unknown>).sha,
      },
      protected: branch.protected,
    }));
  } catch (error) {
    devConsole.error('Error listing branches:', error);
    return [];
  }
}

/**
 * Get recent commits for a branch
 */
export async function getRecentCommits(
  installation: GitHubInstallation,
  owner: string,
  repo: string,
  branch: string,
  limit: number = 10
): Promise<GitHubCommit[]> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.map((commit: Record<string, unknown>) => ({
      sha: commit.sha,
      message: (commit.commit as Record<string, unknown>).message,
      author: {
        name: ((commit.commit as Record<string, unknown>).author as Record<string, unknown>).name,
        email: ((commit.commit as Record<string, unknown>).author as Record<string, unknown>).email,
        date: ((commit.commit as Record<string, unknown>).author as Record<string, unknown>).date,
      },
      url: commit.html_url,
    }));
  } catch (error) {
    devConsole.error('Error getting commits:', error);
    return [];
  }
}

/**
 * Get file content from repository
 */
export async function getFileContent(
  installation: GitHubInstallation,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return null;
  }

  try {
    let url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.type !== 'file') {
      return null;
    }

    // Content is base64 encoded
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    devConsole.error('Error getting file content:', error);
    return null;
  }
}

/**
 * Create a check run for a commit
 */
export async function createCheckRun(
  installation: GitHubInstallation,
  owner: string,
  repo: string,
  options: {
    name: string;
    headSha: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
    detailsUrl?: string;
    output?: {
      title: string;
      summary: string;
      text?: string;
    };
  }
): Promise<number | null> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        head_sha: options.headSha,
        status: options.status,
        conclusion: options.conclusion,
        details_url: options.detailsUrl,
        output: options.output,
      }),
    });

    if (!response.ok) {
      devConsole.error('Failed to create check run:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    devConsole.error('Error creating check run:', error);
    return null;
  }
}

/**
 * Update an existing check run
 */
export async function updateCheckRun(
  installation: GitHubInstallation,
  owner: string,
  repo: string,
  checkRunId: number,
  options: {
    status?: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
    output?: {
      title: string;
      summary: string;
      text?: string;
    };
  }
): Promise<boolean> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      }
    );

    return response.ok;
  } catch (error) {
    devConsole.error('Error updating check run:', error);
    return false;
  }
}

/**
 * Add a commit status
 */
export async function createCommitStatus(
  installation: GitHubInstallation,
  owner: string,
  repo: string,
  sha: string,
  options: {
    state: 'error' | 'failure' | 'pending' | 'success';
    targetUrl?: string;
    description?: string;
    context?: string;
  }
): Promise<boolean> {
  const token = await getInstallationAccessToken(installation.installationId);
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: options.state,
          target_url: options.targetUrl,
          description: options.description,
          context: options.context || 'Bugrit E2E Tests',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    devConsole.error('Error creating commit status:', error);
    return false;
  }
}
