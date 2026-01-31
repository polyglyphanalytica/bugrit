'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Github,
  Upload,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  FileArchive,
  Copy,
} from 'lucide-react';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type SourceType = 'github' | 'upload' | null;

interface GitHubConnection {
  connected: boolean;
  connection?: {
    githubUsername: string;
  };
}

export default function SetupScanPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState<SourceType>(null);

  // GitHub state
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Validation state
  const [urlError, setUrlError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && appId) {
      fetchApplication();
      checkGitHubConnection();
    }
  }, [user, authLoading, appId, router]);

  const fetchApplication = async () => {
    try {
      const res = await apiClient.get<{ application: Application }>(
        user!,
        `/api/applications/${appId}`
      );
      if (res.ok && res.data) {
        setApplication(res.data.application);
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGitHubConnection = async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      if (res.ok) {
        const data = await res.json();
        setGithubConnection(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingConnection(false);
    }
  };

  const handleConnectGitHub = () => {
    const returnUrl = encodeURIComponent(`/applications/${appId}/setup-scan`);
    window.location.href = `/api/auth/github?returnUrl=${returnUrl}`;
  };

  const validateGitHubUrl = (url: string): boolean => {
    setUrlError(null);

    if (!url.trim()) {
      return false;
    }

    // Accept formats: username/repo, github.com/username/repo, https://github.com/username/repo
    const patterns = [
      /^[\w-]+\/[\w.-]+$/,                                    // username/repo
      /^github\.com\/[\w-]+\/[\w.-]+/,                       // github.com/username/repo
      /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+/,           // https://github.com/username/repo
    ];

    const isValid = patterns.some(p => p.test(url.trim()));

    if (!isValid) {
      setUrlError('Please enter a valid GitHub repository URL');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a ZIP file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: 'File too large',
          description: 'Maximum file size is 100MB',
          variant: 'destructive',
        });
        return;
      }

      setUploadedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (sourceType === 'github' && !validateGitHubUrl(githubUrl)) {
      return;
    }

    if (sourceType === 'upload' && !uploadedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a ZIP file to upload',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);

    try {
      const idToken = await user!.getIdToken();

      if (sourceType === 'github') {
        // Normalize GitHub URL
        let repoUrl = githubUrl.trim();
        if (!repoUrl.startsWith('http')) {
          if (repoUrl.startsWith('github.com')) {
            repoUrl = `https://${repoUrl}`;
          } else {
            repoUrl = `https://github.com/${repoUrl}`;
          }
        }

        // Navigate to configure page with GitHub params
        const params = new URLSearchParams({
          source: 'github',
          url: repoUrl,
          branch: branch,
        });
        router.push(`/applications/${appId}/configure-scan?${params.toString()}`);
      } else if (sourceType === 'upload' && uploadedFile) {
        // Upload the file first
        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('applicationId', appId);

        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || 'Failed to upload file');
        }

        const uploadData = await uploadRes.json();

        // Navigate to configure page with upload params
        const params = new URLSearchParams({
          source: 'upload',
          uploadId: uploadData.uploadId,
        });
        router.push(`/applications/${appId}/configure-scan?${params.toString()}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
      setUploading(false);
    }
  };

  const copyExample = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Example copied to clipboard',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-8 max-w-3xl">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/applications/${appId}/get-started`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Let&apos;s scan your code</h1>
          <p className="text-muted-foreground text-lg">
            First, tell us where your code lives
          </p>
        </div>

        {/* Source Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* GitHub Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              sourceType === 'github'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSourceType('github')}
          >
            <CardContent className="pt-6 text-center">
              <Github className="w-10 h-10 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">GitHub Repository</h3>
              <p className="text-sm text-muted-foreground">
                Paste a link to your GitHub repo
              </p>
              {sourceType === 'github' && (
                <Badge className="mt-3" variant="secondary">Selected</Badge>
              )}
            </CardContent>
          </Card>

          {/* Upload Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              sourceType === 'upload'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSourceType('upload')}
          >
            <CardContent className="pt-6 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Upload ZIP File</h3>
              <p className="text-sm text-muted-foreground">
                Upload your code as a ZIP archive
              </p>
              {sourceType === 'upload' && (
                <Badge className="mt-3" variant="secondary">Selected</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GitHub Input */}
        {sourceType === 'github' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                Enter your GitHub repository
              </CardTitle>
              <CardDescription>
                Paste the URL or just type username/repo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* GitHub Connection Status */}
              {!loadingConnection && (
                <div className={cn(
                  'p-3 rounded-lg border text-sm',
                  githubConnection?.connected
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                )}>
                  {githubConnection?.connected ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>
                        Connected as <strong>@{githubConnection.connection?.githubUsername}</strong> - Private repos enabled
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>Public repos only. Connect GitHub for private repos.</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleConnectGitHub}>
                        Connect
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <Input
                  value={githubUrl}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    setUrlError(null);
                  }}
                  placeholder="github.com/username/repo"
                  className={cn('h-12', urlError && 'border-destructive')}
                />
                {urlError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {urlError}
                  </p>
                )}
              </div>

              {/* Branch Input */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Branch:</span>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="max-w-[150px] h-9"
                />
              </div>

              {/* Examples */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Examples - click to copy</span>
                </div>
                <div className="space-y-2 text-sm font-mono">
                  {[
                    'facebook/react',
                    'github.com/vercel/next.js',
                    'https://github.com/microsoft/vscode',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setGithubUrl(example);
                        copyExample(example);
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Input */}
        {sourceType === 'upload' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="w-5 h-5" />
                Upload your code
              </CardTitle>
              <CardDescription>
                ZIP your project folder and upload it here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* How to create a ZIP */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">How to create a ZIP file</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Windows:</p>
                    <p className="text-muted-foreground">
                      Right-click your project folder → Send to → Compressed (zipped) folder
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Mac:</p>
                    <p className="text-muted-foreground">
                      Right-click your project folder → Compress
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Linux:</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      zip -r myproject.zip myproject/
                    </p>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="border-2 border-dashed border-green-500/50 bg-green-500/5 rounded-lg p-6 text-center">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="mt-2"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Click to select a ZIP file</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or drag and drop (max 100MB)
                  </p>
                </button>
              )}

              {/* Tips */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>💡 <strong>Tip:</strong> Exclude node_modules and other large folders to keep the file small</p>
                <p>🔒 Your code is automatically deleted after scanning</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        {sourceType && (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={
                analyzing ||
                uploading ||
                (sourceType === 'github' && !githubUrl.trim()) ||
                (sourceType === 'upload' && !uploadedFile)
              }
              className="min-w-[200px]"
            >
              {analyzing || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  Analyze Code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
