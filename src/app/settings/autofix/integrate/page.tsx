'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const TARGET_INFO: Record<string, { label: string; description: string }> = {
  ci_cd: {
    label: 'CI/CD Pipeline',
    description: 'Generate a GitHub Actions, GitLab CI, or Jenkins pipeline that runs Bugrit scans on every push or PR.',
  },
  pre_commit: {
    label: 'Pre-commit Hook',
    description: 'Generate a git pre-commit hook that runs a quick Bugrit scan before each commit.',
  },
  api_client: {
    label: 'API Client',
    description: 'Generate a typed API client/wrapper for the Bugrit REST API in your language.',
  },
  webhook: {
    label: 'Webhook Handler',
    description: 'Generate a webhook endpoint that receives and processes Bugrit scan result notifications.',
  },
  monitoring: {
    label: 'Monitoring Setup',
    description: 'Generate a scheduled monitoring setup that runs Bugrit scans regularly and tracks results.',
  },
  custom: {
    label: 'Custom Integration',
    description: 'Describe exactly what you need and AI will generate the integration code.',
  },
};

function IntegratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const target = searchParams.get('target') || 'ci_cd';
  const info = TARGET_INFO[target] || TARGET_INFO.ci_cd;

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    branch: string;
    prUrl?: string;
    filesCreated: string[];
    explanation: string;
  } | null>(null);

  const [form, setForm] = useState({
    appId: '',
    repoOwner: '',
    repoName: '',
    language: 'typescript',
    framework: '',
    packageManager: 'npm',
    customPrompt: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleGenerate = async () => {
    if (!form.appId || !form.repoOwner || !form.repoName) {
      toast({ title: 'Error', description: 'App ID, repo owner, and repo name are required', variant: 'destructive' });
      return;
    }

    if (target === 'custom' && !form.customPrompt.trim()) {
      toast({ title: 'Error', description: 'Describe what you need for custom integrations', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/autofix/integrate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          ...form,
          customPrompt: target === 'custom' ? form.customPrompt : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({
          branch: data.branch,
          prUrl: data.prUrl,
          filesCreated: data.filesCreated,
          explanation: data.explanation,
        });
        toast({ title: 'Integration generated!' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: 'Unable to generate integration. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Unable to generate integration. Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/settings/autofix" className="text-muted-foreground hover:text-foreground text-sm">
            Autofix
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Integration</span>
        </div>
        <h2 className="text-2xl font-bold">{info.label}</h2>
        <p className="text-muted-foreground mt-1">{info.description}</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Provide your app details. The AI will use your BYOK key to generate integration code,
            then push it to a branch on your repo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="repoOwner">GitHub Owner</Label>
              <Input
                id="repoOwner"
                placeholder="your-org"
                value={form.repoOwner}
                onChange={(e) => setForm(prev => ({ ...prev, repoOwner: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repoName">Repository Name</Label>
              <Input
                id="repoName"
                placeholder="your-app"
                value={form.repoName}
                onChange={(e) => setForm(prev => ({ ...prev, repoName: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appId">Bugrit App/Project ID</Label>
            <Input
              id="appId"
              placeholder="app_xxxxx"
              value={form.appId}
              onChange={(e) => setForm(prev => ({ ...prev, appId: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm(prev => ({ ...prev, language: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="ruby">Ruby</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="php">PHP</SelectItem>
                  <SelectItem value="swift">Swift</SelectItem>
                  <SelectItem value="kotlin">Kotlin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Framework (optional)</Label>
              <Input
                placeholder="e.g., nextjs, django, rails"
                value={form.framework}
                onChange={(e) => setForm(prev => ({ ...prev, framework: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Package Manager</Label>
              <Select
                value={form.packageManager}
                onValueChange={(v) => setForm(prev => ({ ...prev, packageManager: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="npm">npm</SelectItem>
                  <SelectItem value="yarn">yarn</SelectItem>
                  <SelectItem value="pnpm">pnpm</SelectItem>
                  <SelectItem value="pip">pip</SelectItem>
                  <SelectItem value="go mod">go mod</SelectItem>
                  <SelectItem value="cargo">cargo</SelectItem>
                  <SelectItem value="maven">Maven</SelectItem>
                  <SelectItem value="gradle">Gradle</SelectItem>
                  <SelectItem value="bundler">Bundler</SelectItem>
                  <SelectItem value="nuget">NuGet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {target === 'custom' && (
            <div className="space-y-2">
              <Label>Describe Your Integration</Label>
              <Textarea
                placeholder="Describe exactly what you want generated. For example: 'Create a Slack bot that posts Bugrit scan results to #security-alerts channel, with severity-based formatting and a direct link to the report.'"
                value={form.customPrompt}
                onChange={(e) => setForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                rows={4}
              />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating} className="w-full sm:w-auto">
            {generating ? 'Generating...' : 'Generate Integration'}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>&#x2705;</span> Integration Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{result.explanation}</p>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Files Created</Label>
              <div className="space-y-1">
                {result.filesCreated.map((file) => (
                  <div key={file} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {file}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Branch</Label>
                <p className="font-mono text-sm">{result.branch}</p>
              </div>
              {result.prUrl && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pull Request</Label>
                  <a
                    href={result.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    View PR on GitHub
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function IntegratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <IntegratePageContent />
    </Suspense>
  );
}
