'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ExternalLink, Github, Loader2, Unplug } from 'lucide-react';
import { devConsole } from '@/lib/console';

interface GitHubConnection {
  id: string;
  githubUsername: string;
  githubAvatarUrl?: string;
  scope: string;
  connectedAt: string;
  lastUsedAt?: string;
}

interface GitHubStatus {
  connected: boolean;
  connection?: GitHubConnection;
  oauthConfigured: boolean;
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const username = searchParams.get('username');

    if (success === 'github_connected' && username) {
      setMessage({ type: 'success', text: `Successfully connected to GitHub as @${username}` });
    } else if (error) {
      setMessage({ type: 'error', text: errorDescription || `GitHub connection failed: ${error}` });
    }

    // Clear URL params without navigation
    if (success || error) {
      window.history.replaceState({}, '', '/settings/integrations');
    }
  }, [searchParams]);

  // Fetch GitHub connection status
  useEffect(() => {
    async function fetchStatus() {
      if (!user) return;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/auth/github/status', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGithubStatus(data);
        }
      } catch (error) {
        devConsole.error('Failed to fetch GitHub status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [user]);

  const handleConnectGitHub = () => {
    // Redirect to OAuth initiation endpoint
    window.location.href = '/api/auth/github?returnUrl=/settings/integrations';
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? You will need to reconnect to scan private repositories.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/auth/github/status', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setGithubStatus({ connected: false, oauthConfigured: true });
        setMessage({ type: 'success', text: 'GitHub account disconnected successfully' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect GitHub account' });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external services to enable additional features.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="text-sm underline mt-1 opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Github className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>GitHub</CardTitle>
              <CardDescription>
                Connect your GitHub account to scan private repositories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking connection status...</span>
            </div>
          ) : githubStatus?.connected && githubStatus.connection ? (
            <div className="space-y-4">
              {/* Connected State */}
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {githubStatus.connection.githubAvatarUrl && (
                      <img
                        src={githubStatus.connection.githubAvatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="font-medium">
                      Connected as @{githubStatus.connection.githubUsername}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connected {new Date(githubStatus.connection.connectedAt).toLocaleDateString()}
                    {githubStatus.connection.lastUsedAt && (
                      <> · Last used {new Date(githubStatus.connection.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Permissions granted:</h4>
                <div className="flex flex-wrap gap-2">
                  {githubStatus.connection.scope.split(/[,\s]+/).filter(Boolean).map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-1 bg-background rounded text-xs border"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* What You Can Do */}
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">What you can do:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Scan private repositories without providing access tokens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Automatically detect and list your repositories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Push fix branches directly to your repositories</span>
                  </li>
                </ul>
              </div>

              {/* Disconnect Button */}
              <Button
                variant="outline"
                onClick={handleDisconnectGitHub}
                disabled={disconnecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4 mr-2" />
                )}
                Disconnect GitHub
              </Button>
            </div>
          ) : githubStatus?.oauthConfigured ? (
            <div className="space-y-4">
              {/* Not Connected State */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Why connect GitHub?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span><strong>Scan private repos:</strong> No need to manually provide access tokens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span><strong>One-click fixes:</strong> Push fix branches directly to your repos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span><strong>Auto-discovery:</strong> We&apos;ll list your repos so you can select which to scan</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
                <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Permissions requested
                </h4>
                <p className="text-sm text-muted-foreground">
                  We request access to your repositories (including private ones) to clone and scan them.
                  We never modify your code without explicit action from you.
                </p>
              </div>

              <Button onClick={handleConnectGitHub} size="lg">
                <Github className="h-4 w-4 mr-2" />
                Connect GitHub Account
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-700 dark:text-amber-400">
                    GitHub OAuth not configured
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The server administrator needs to configure GitHub OAuth credentials
                    (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET) to enable this feature.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Integrations Placeholder */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">More integrations coming soon</CardTitle>
          <CardDescription>
            GitLab, Bitbucket, Slack, and more integrations are on the roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/docs/roadmap"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View roadmap
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
