'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { QuickScan, ScanSource } from '@/components/scan';

type SourceType = 'url' | 'github' | 'gitlab' | 'upload' | 'docker' | 'npm' | 'mobile';

interface ScanConfig {
  sourceType: SourceType;
  // URL
  targetUrl?: string;
  // Repository
  repoUrl?: string;
  branch?: string;
  accessToken?: string;
  // Upload
  uploadFile?: File;
  // Docker
  dockerImage?: string;
  dockerTag?: string;
  registryUrl?: string;
  registryCredentials?: string;
  // npm
  npmPackage?: string;
  npmVersion?: string;
  // Mobile
  mobileFile?: File;
  mobilePlatform?: 'ios' | 'android';
}

export default function NewScanPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SourceType>('url');

  const [config, setConfig] = useState<ScanConfig>({
    sourceType: 'url',
    branch: 'main',
    dockerTag: 'latest',
    npmVersion: 'latest',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && appId) {
      fetchApplication();
    }
  }, [user, authLoading, appId, router]);

  const fetchApplication = async () => {
    try {
      const res = await apiClient.get<{ application: Application }>(user!, `/api/applications/${appId}`);
      if (res.ok && res.data) {
        setApplication(res.data.application);
        // Pre-fill URL if exists
        if (res.data.application?.targetUrl) {
          setConfig(prev => ({ ...prev, targetUrl: res.data!.application.targetUrl }));
        }
      } else {
        router.push('/applications');
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
      router.push('/applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    // Validate based on source type
    let isValid = false;
    let errorMessage = '';

    switch (activeTab) {
      case 'url':
        isValid = !!config.targetUrl?.trim();
        errorMessage = 'Please enter a valid URL';
        break;
      case 'github':
      case 'gitlab':
        isValid = !!config.repoUrl?.trim();
        errorMessage = 'Please enter a repository URL';
        break;
      case 'upload':
        isValid = !!config.uploadFile;
        errorMessage = 'Please select a file to upload';
        break;
      case 'docker':
        isValid = !!config.dockerImage?.trim();
        errorMessage = 'Please enter a Docker image name';
        break;
      case 'npm':
        isValid = !!config.npmPackage?.trim();
        errorMessage = 'Please enter an npm package name';
        break;
      case 'mobile':
        isValid = !!config.mobileFile && !!config.mobilePlatform;
        errorMessage = 'Please select a mobile binary and platform';
        break;
    }

    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('applicationId', appId);
      formData.append('sourceType', activeTab);

      // Add source-specific data
      switch (activeTab) {
        case 'url':
          formData.append('targetUrl', config.targetUrl!);
          break;
        case 'github':
        case 'gitlab':
          formData.append('repoUrl', config.repoUrl!);
          formData.append('branch', config.branch || 'main');
          if (config.accessToken) {
            formData.append('accessToken', config.accessToken);
          }
          break;
        case 'upload':
          formData.append('file', config.uploadFile!);
          break;
        case 'docker':
          formData.append('dockerImage', config.dockerImage!);
          formData.append('dockerTag', config.dockerTag || 'latest');
          if (config.registryUrl) {
            formData.append('registryUrl', config.registryUrl);
          }
          if (config.registryCredentials) {
            formData.append('registryCredentials', config.registryCredentials);
          }
          break;
        case 'npm':
          formData.append('npmPackage', config.npmPackage!);
          formData.append('npmVersion', config.npmVersion || 'latest');
          break;
        case 'mobile':
          formData.append('file', config.mobileFile!);
          formData.append('platform', config.mobilePlatform!);
          break;
      }

      // Get Firebase ID token for authentication
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Scan Started',
          description: '150 modules are now analyzing your application. This typically takes under 60 seconds.',
        });
        router.push(`/applications/${appId}/scans/${data.scan.id}`);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start scan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start scan',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'uploadFile' | 'mobileFile') => {
    const file = e.target.files?.[0];
    if (file) {
      setConfig(prev => ({ ...prev, [field]: file }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Handle QuickScan submission
  const handleQuickScan = async (source: ScanSource) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('applicationId', appId);

      if (source.type === 'github') {
        formData.append('sourceType', 'github');
        formData.append('repoUrl', source.value);
        formData.append('branch', source.branch || 'main');
        if (source.accessToken) {
          formData.append('accessToken', source.accessToken);
        }
      } else if (source.type === 'url') {
        formData.append('sourceType', 'url');
        formData.append('targetUrl', source.value);
      } else if (source.type === 'upload' && source.file) {
        formData.append('sourceType', 'upload');
        formData.append('file', source.file);
      }

      const idToken = await user!.getIdToken();
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Scan Started!',
          description: 'We\'re checking your code now. This usually takes less than 2 minutes.',
        });
        router.push(`/scans/${data.scan.id}`);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start scan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start scan',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/applications/${appId}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to {application?.name}
          </Link>
          <h1 className="text-3xl font-bold mt-2">New Scan</h1>
          <p className="text-muted-foreground">
            Paste your GitHub URL or upload your code. We&apos;ll check everything.
          </p>
        </div>

        {/* Quick Scan - Primary Option */}
        <div className="mb-8">
          <QuickScan onScan={handleQuickScan} isSubmitting={submitting} />
        </div>

        {/* Advanced Options - Collapsed by default */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            More options (Docker, npm, GitLab, Mobile)
          </summary>

        {/* Source Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Application Source</CardTitle>
            <CardDescription>
              Choose how to provide your application for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SourceType)}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto gap-1 mb-6">
                <TabsTrigger value="url" className="text-xs px-2 py-1.5">URL</TabsTrigger>
                <TabsTrigger value="github" className="text-xs px-2 py-1.5">GitHub</TabsTrigger>
                <TabsTrigger value="gitlab" className="text-xs px-2 py-1.5">GitLab</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs px-2 py-1.5">Upload</TabsTrigger>
                <TabsTrigger value="docker" className="text-xs px-2 py-1.5">Docker</TabsTrigger>
                <TabsTrigger value="npm" className="text-xs px-2 py-1.5">npm</TabsTrigger>
                <TabsTrigger value="mobile" className="text-xs px-2 py-1.5">Mobile</TabsTrigger>
              </TabsList>

              {/* URL Tab */}
              <TabsContent value="url" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the URL of your deployed web application. We'll crawl it and run
                    accessibility, performance, security, and SEO tools.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">Application URL</Label>
                  <Input
                    id="targetUrl"
                    type="url"
                    placeholder="https://your-app.com"
                    value={config.targetUrl || ''}
                    onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
                  />
                </div>
              </TabsContent>

              {/* GitHub Tab */}
              <TabsContent value="github" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Connect a GitHub repository. For private repos, provide a Personal Access Token
                    with read access.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubUrl">Repository URL</Label>
                  <Input
                    id="githubUrl"
                    placeholder="https://github.com/username/repo"
                    value={config.repoUrl || ''}
                    onChange={(e) => setConfig({ ...config, repoUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="githubBranch">Branch</Label>
                    <Input
                      id="githubBranch"
                      placeholder="main"
                      value={config.branch || ''}
                      onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="githubToken">Access Token (optional)</Label>
                    <Input
                      id="githubToken"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={config.accessToken || ''}
                      onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* GitLab Tab */}
              <TabsContent value="gitlab" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Connect a GitLab repository. Works with GitLab.com and self-hosted instances.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gitlabUrl">Repository URL</Label>
                  <Input
                    id="gitlabUrl"
                    placeholder="https://gitlab.com/username/repo"
                    value={config.repoUrl || ''}
                    onChange={(e) => setConfig({ ...config, repoUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gitlabBranch">Branch</Label>
                    <Input
                      id="gitlabBranch"
                      placeholder="main"
                      value={config.branch || ''}
                      onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gitlabToken">Access Token (optional)</Label>
                    <Input
                      id="gitlabToken"
                      type="password"
                      placeholder="glpat-xxxxxxxxxxxx"
                      value={config.accessToken || ''}
                      onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Upload Tab */}
              <TabsContent value="upload" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a ZIP file containing your source code. Maximum file size: 100MB.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uploadFile">Source Code (ZIP)</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      id="uploadFile"
                      type="file"
                      accept=".zip"
                      onChange={(e) => handleFileChange(e, 'uploadFile')}
                      className="hidden"
                    />
                    {config.uploadFile ? (
                      <div>
                        <p className="font-medium">{config.uploadFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(config.uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setConfig({ ...config, uploadFile: undefined })}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="uploadFile" className="cursor-pointer">
                        <div className="text-4xl mb-2">📁</div>
                        <p className="font-medium">Drop your ZIP file here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </label>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Docker Tab */}
              <TabsContent value="docker" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Pull and analyze a Docker image. Works with Docker Hub and private registries.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dockerImage">Image Name</Label>
                    <Input
                      id="dockerImage"
                      placeholder="username/image-name"
                      value={config.dockerImage || ''}
                      onChange={(e) => setConfig({ ...config, dockerImage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dockerTag">Tag</Label>
                    <Input
                      id="dockerTag"
                      placeholder="latest"
                      value={config.dockerTag || ''}
                      onChange={(e) => setConfig({ ...config, dockerTag: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registryUrl">Private Registry URL (optional)</Label>
                  <Input
                    id="registryUrl"
                    placeholder="registry.example.com"
                    value={config.registryUrl || ''}
                    onChange={(e) => setConfig({ ...config, registryUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registryCredentials">Registry Credentials (optional)</Label>
                  <Input
                    id="registryCredentials"
                    type="password"
                    placeholder="username:password or token"
                    value={config.registryCredentials || ''}
                    onChange={(e) => setConfig({ ...config, registryCredentials: e.target.value })}
                  />
                </div>
              </TabsContent>

              {/* npm Tab */}
              <TabsContent value="npm" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Analyze an npm package directly from the registry. Great for library authors.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="npmPackage">Package Name</Label>
                    <Input
                      id="npmPackage"
                      placeholder="@scope/package-name"
                      value={config.npmPackage || ''}
                      onChange={(e) => setConfig({ ...config, npmPackage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="npmVersion">Version</Label>
                    <Input
                      id="npmVersion"
                      placeholder="latest"
                      value={config.npmVersion || ''}
                      onChange={(e) => setConfig({ ...config, npmVersion: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Mobile Tab */}
              <TabsContent value="mobile" className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an APK (Android) or IPA (iOS) file for mobile-specific analysis
                    including permissions, security, and compliance checks.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobilePlatform">Platform</Label>
                  <Select
                    value={config.mobilePlatform}
                    onValueChange={(v) => setConfig({ ...config, mobilePlatform: v as 'ios' | 'android' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android (APK)</SelectItem>
                      <SelectItem value="ios">iOS (IPA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileFile">Mobile Binary</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      id="mobileFile"
                      type="file"
                      accept=".apk,.ipa"
                      onChange={(e) => handleFileChange(e, 'mobileFile')}
                      className="hidden"
                    />
                    {config.mobileFile ? (
                      <div>
                        <p className="font-medium">{config.mobileFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(config.mobileFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setConfig({ ...config, mobileFile: undefined })}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="mobileFile" className="cursor-pointer">
                        <div className="text-4xl mb-2">📱</div>
                        <p className="font-medium">Drop your APK or IPA here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </label>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* What Gets Analyzed - Simplified */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">What We Check</CardTitle>
            <CardDescription>100+ tools run automatically in under 2 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="font-semibold text-red-500">Security Holes</div>
                <div className="text-xs text-muted-foreground">Ways hackers could break in</div>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="font-semibold text-orange-500">Leaked Secrets</div>
                <div className="text-xs text-muted-foreground">Exposed passwords & API keys</div>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="font-semibold text-yellow-500">Risky Packages</div>
                <div className="text-xs text-muted-foreground">Vulnerable dependencies</div>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="font-semibold text-purple-500">Accessibility</div>
                <div className="text-xs text-muted-foreground">Issues blocking users</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="font-semibold text-blue-500">Code Bugs</div>
                <div className="text-xs text-muted-foreground">Problems that cause crashes</div>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <div className="font-semibold text-cyan-500">Speed Issues</div>
                <div className="text-xs text-muted-foreground">Things slowing your app</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button for advanced options */}
        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href={`/applications/${appId}`}>Cancel</Link>
          </Button>
          <Button onClick={handleStartScan} disabled={submitting}>
            {submitting ? 'Starting Scan...' : 'Start Advanced Scan'}
          </Button>
        </div>

        </details>
      </main>
      <DashboardFooter />
    </div>
  );
}
