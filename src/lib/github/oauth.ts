// GitHub OAuth Integration

import { GitHubAuthToken, GitHubUser } from './types';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

export class GitHubOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(config?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  }) {
    this.clientId = config?.clientId || process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.GITHUB_CLIENT_SECRET || '';
    // Prefer explicit GITHUB_REDIRECT_URI, fall back to deriving from app URL
    this.redirectUri = config?.redirectUri
      || process.env.GITHUB_REDIRECT_URI
      || (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
        : '');
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(options?: {
    state?: string;
    scopes?: string[];
    allowSignup?: boolean;
  }): string {
    const scopes = options?.scopes || [
      'repo',           // Full control of private repositories
      'read:org',       // Read org membership
      'read:user',      // Read user profile
      'user:email',     // Access user email addresses
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      allow_signup: String(options?.allowSignup ?? true),
    });

    if (options?.state) {
      params.set('state', options.state);
    }

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<GitHubAuthToken> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Refresh access token (for GitHub Apps with refresh tokens)
   */
  async refreshAccessToken(refreshToken: string): Promise<GitHubAuthToken> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user information');
    }

    const data = await response.json();

    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      type: data.type,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch(
      `${GITHUB_API_URL}/applications/${this.clientId}/token`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

// GitHub OAuth scopes reference
export const GITHUB_SCOPES = {
  // Repository
  repo: 'Full control of private repositories',
  'repo:status': 'Access commit status',
  'repo_deployment': 'Access deployment status',
  'public_repo': 'Access public repositories',
  'repo:invite': 'Access repository invitations',
  'security_events': 'Read and write security events',

  // Workflow
  workflow: 'Update GitHub Action workflows',

  // Packages
  'write:packages': 'Upload packages to GitHub Package Registry',
  'read:packages': 'Download packages from GitHub Package Registry',
  'delete:packages': 'Delete packages from GitHub Package Registry',

  // Admin
  'admin:org': 'Full control of orgs and teams',
  'write:org': 'Read and write org membership',
  'read:org': 'Read org membership',

  // Public key
  'admin:public_key': 'Full control of user public keys',
  'write:public_key': 'Write user public keys',
  'read:public_key': 'Read user public keys',

  // Repo hook
  'admin:repo_hook': 'Full control of repository hooks',
  'write:repo_hook': 'Write repository hooks',
  'read:repo_hook': 'Read repository hooks',

  // Org hook
  'admin:org_hook': 'Full control of organization hooks',

  // Gist
  gist: 'Create gists',

  // Notifications
  notifications: 'Access notifications',

  // User
  user: 'Update all user data',
  'read:user': 'Read all user profile data',
  'user:email': 'Access user email addresses',
  'user:follow': 'Follow and unfollow users',

  // Delete repo
  delete_repo: 'Delete repositories',

  // Discussion
  'write:discussion': 'Read and write team discussions',
  'read:discussion': 'Read team discussions',

  // Project
  'admin:enterprise': 'Full control of enterprises',

  // GPG key
  'admin:gpg_key': 'Full control of public user GPG keys',
  'write:gpg_key': 'Write public user GPG keys',
  'read:gpg_key': 'Read public user GPG keys',

  // Codespace
  codespace: 'Full control of codespaces',
  'codespace:secrets': 'Ability to create, read, update, and delete codespace secrets',

  // Copilot
  'copilot': 'Full control of GitHub Copilot settings',
  'manage_billing:copilot': 'View and edit Copilot Business seat assignments',
};
