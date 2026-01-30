'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Github, Upload, Globe, ChevronDown, ChevronUp, Loader2, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GitHubConnection {
  connected: boolean;
  oauthConfigured?: boolean;
  connection?: {
    githubUsername: string;
    githubAvatarUrl?: string;
  };
}

interface QuickScanProps {
  onScan: (source: ScanSource) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export interface ScanSource {
  type: 'github' | 'url' | 'upload';
  value: string;
  file?: File;
  branch?: string;
  accessToken?: string;
}

/**
 * QuickScan - Simplified scan input that auto-detects source type
 * Primary CTA: Paste GitHub URL
 * Secondary: Upload ZIP or enter website URL
 */
export function QuickScan({ onScan, isSubmitting = false, className }: QuickScanProps) {
  const [inputValue, setInputValue] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  // Check GitHub connection status on mount
  useEffect(() => {
    const checkGitHubConnection = async () => {
      try {
        const res = await fetch('/api/auth/github/status');
        if (res.ok) {
          const data = await res.json();
          setGithubConnection(data);
        }
      } catch {
        // Ignore - user may not be authenticated
      } finally {
        setLoadingConnection(false);
      }
    };
    checkGitHubConnection();
  }, []);

  const handleConnectGitHub = () => {
    // Redirect to GitHub OAuth with current page as return URL
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/github?returnUrl=${returnUrl}`;
  };

  // Auto-detect source type from input
  const detectSourceType = (input: string): 'github' | 'url' | null => {
    if (!input.trim()) return null;

    // GitHub URL patterns
    if (input.includes('github.com/') || input.match(/^[\w-]+\/[\w-]+$/)) {
      return 'github';
    }

    // URL pattern
    if (input.startsWith('http://') || input.startsWith('https://') || input.includes('.')) {
      return 'url';
    }

    return null;
  };

  const sourceType = uploadFile ? 'upload' : detectSourceType(inputValue);

  const handleSubmit = async () => {
    setError(null);

    if (!sourceType && !uploadFile) {
      setError('Please enter a GitHub URL, website URL, or upload a ZIP file');
      return;
    }

    try {
      if (uploadFile) {
        await onScan({ type: 'upload', value: uploadFile.name, file: uploadFile });
      } else if (sourceType === 'github') {
        // Normalize GitHub URL
        let repoUrl = inputValue.trim();
        if (!repoUrl.startsWith('http')) {
          repoUrl = `https://github.com/${repoUrl}`;
        }
        await onScan({
          type: 'github',
          value: repoUrl,
          branch: branch || 'main',
          accessToken: accessToken || undefined,
        });
      } else if (sourceType === 'url') {
        let url = inputValue.trim();
        if (!url.startsWith('http')) {
          url = `https://${url}`;
        }
        await onScan({ type: 'url', value: url });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setInputValue('');
    }
  };

  const clearFile = () => {
    setUploadFile(null);
  };

  const getPlaceholder = () => {
    if (sourceType === 'github') return 'github.com/username/repo';
    if (sourceType === 'url') return 'https://your-app.com';
    return 'Paste your GitHub URL or website address';
  };

  const getIcon = () => {
    if (sourceType === 'github') return <Github className="w-5 h-5 text-muted-foreground" />;
    if (sourceType === 'url') return <Globe className="w-5 h-5 text-muted-foreground" />;
    return <Github className="w-5 h-5 text-muted-foreground" />;
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Starting scan...';
    if (uploadFile) return `Scan ${uploadFile.name}`;
    if (sourceType === 'github') return 'Scan Repository';
    if (sourceType === 'url') return 'Scan Website';
    return 'Scan My Code';
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Main Input */}
        <div className="space-y-4">
          {uploadFile ? (
            // File selected state
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border-2 border-dashed">
              <Upload className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{uploadFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                Remove
              </Button>
            </div>
          ) : (
            // URL input state
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {getIcon()}
              </div>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={getPlaceholder()}
                className="pl-10 h-12 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSubmit()}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Action row */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!inputValue.trim() && !uploadFile)}
              className="flex-1 h-12 text-lg"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {getButtonText()}
            </Button>

            {!uploadFile && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" size="icon" className="h-12 w-12" asChild>
                  <span>
                    <Upload className="w-5 h-5" />
                  </span>
                </Button>
              </label>
            )}
          </div>

          {/* Detected source hint */}
          {inputValue && sourceType && (
            <p className="text-sm text-muted-foreground text-center">
              {sourceType === 'github' && '✓ Detected GitHub repository'}
              {sourceType === 'url' && '✓ Detected website URL'}
            </p>
          )}

          {/* Advanced options toggle */}
          {sourceType === 'github' && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showAdvanced ? 'Hide options' : 'Private repo? More options'}
            </button>
          )}

          {/* Advanced options */}
          {showAdvanced && sourceType === 'github' && (
            <div className="space-y-3 pt-2 border-t">
              {/* GitHub Connection Status */}
              <div className="p-3 rounded-lg bg-muted/50">
                {loadingConnection ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking GitHub connection...
                  </div>
                ) : githubConnection?.connected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        Connected as <strong>@{githubConnection.connection?.githubUsername}</strong>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Private repos accessible
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Connect GitHub to scan private repositories
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConnectGitHub}
                      className="gap-2"
                    >
                      <Github className="w-4 h-4" />
                      Connect GitHub
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Branch selector */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Branch</label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>

              {/* Manual token fallback - only show if not connected */}
              {!githubConnection?.connected && (
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Or paste a Personal Access Token
                  </label>
                  <Input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="ghp_..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            We&apos;ll run <strong className="text-foreground">100+ automated checks</strong> for security, bugs, and quality issues.
            <br />
            Usually takes less than 2 minutes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
