'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface AutofixJob {
  id: string;
  status: string;
  provider: string;
  model: string;
  progress: {
    totalFindings: number;
    fixedCount: number;
    skippedCount: number;
    failedCount: number;
    currentFinding?: string;
  };
  result?: {
    branch: string;
    prUrl?: string;
    prNumber?: number;
    filesChanged: number;
    summary: string;
  };
  error?: string;
  createdAt: string;
}

interface AutofixPanelProps {
  scanId: string;
  appId: string;
  repoUrl?: string;
  totalFindings: number;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Queued', variant: 'secondary' },
  fetching_code: { label: 'Fetching code', variant: 'outline' },
  generating_fixes: { label: 'Generating fixes', variant: 'default' },
  pushing_branch: { label: 'Pushing branch', variant: 'default' },
  creating_pr: { label: 'Creating PR', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export function AutofixPanel({ scanId, appId, repoUrl, totalFindings, className }: AutofixPanelProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AutofixJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [isEnterprise, setIsEnterprise] = useState(true);

  // Parse owner/name from repoUrl
  const repoMatch = repoUrl?.match(/github\.com\/([^/]+)\/([^/.]+)/);
  const repoOwner = repoMatch?.[1];
  const repoName = repoMatch?.[2];
  const isGitHub = !!repoOwner && !!repoName;

  useEffect(() => {
    if (user) {
      fetchJobs();
      // Poll for active jobs
      const interval = setInterval(() => {
        const hasActive = jobs.some(j =>
          !['completed', 'failed'].includes(j.status)
        );
        if (hasActive) fetchJobs();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, scanId]);

  const fetchJobs = async () => {
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/autofix?scanId=${scanId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.status === 403) {
        setIsEnterprise(false);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Silently fail — panel is optional
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    if (!isGitHub) return;
    setTriggering(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/autofix', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, appId, repoOwner, repoName }),
      });

      if (res.ok) {
        fetchJobs();
      } else {
        const error = await res.json();
        console.error('Autofix trigger failed:', error);
      }
    } catch (error) {
      console.error('Autofix trigger failed:', error);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) return null;

  // Don't show panel for non-enterprise users (soft hide, not error)
  if (!isEnterprise) return null;

  // Don't show for non-GitHub repos
  if (!isGitHub) return null;

  const latestJob = jobs[0];
  const isRunning = latestJob && !['completed', 'failed'].includes(latestJob.status);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Autofix
              <Badge variant="outline" className="text-xs font-normal">Enterprise</Badge>
            </CardTitle>
            <CardDescription>
              AI-powered code fixes pushed to a branch on your repo
            </CardDescription>
          </div>
          {!isRunning && totalFindings > 0 && (
            <Button
              onClick={handleTrigger}
              disabled={triggering}
              size="sm"
            >
              {triggering ? 'Starting...' : latestJob ? 'Run Again' : 'Fix with AI'}
            </Button>
          )}
        </div>
      </CardHeader>

      {jobs.length > 0 && (
        <CardContent className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[job.status]?.variant || 'secondary'}>
                    {STATUS_CONFIG[job.status]?.label || job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {job.provider} / {job.model}
                  </span>
                </div>
              </div>

              {/* Progress */}
              {isRunning && job.id === latestJob?.id && (
                <div className="space-y-1">
                  <Progress
                    value={
                      job.progress.totalFindings > 0
                        ? ((job.progress.fixedCount + job.progress.skippedCount) / job.progress.totalFindings) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {job.progress.fixedCount} fixed / {job.progress.totalFindings} findings
                    {job.progress.currentFinding && (
                      <span className="ml-2">— {job.progress.currentFinding}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Completed result */}
              {job.status === 'completed' && job.result && (
                <div className="space-y-2">
                  <p className="text-sm">{job.result.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {job.result.prUrl && (
                      <a
                        href={job.result.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View Pull Request #{job.result.prNumber}
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Branch: {job.result.branch} | {job.result.filesChanged} files changed
                    </span>
                  </div>
                </div>
              )}

              {/* Failed */}
              {job.status === 'failed' && job.error && (
                <p className="text-sm text-destructive">{job.error}</p>
              )}
            </div>
          ))}

          {/* Configure link */}
          <p className="text-xs text-muted-foreground">
            <Link href="/settings/autofix" className="text-primary hover:underline">
              Configure autofix settings
            </Link>
            {' '}— change AI provider, severity filter, or enable auto-run.
          </p>
        </CardContent>
      )}

      {jobs.length === 0 && totalFindings > 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No autofix runs for this scan yet. Click &quot;Fix with AI&quot; to generate code fixes and push them to a branch.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/settings/autofix" className="text-primary hover:underline">
              Set up your AI provider
            </Link>
            {' '}to get started.
          </p>
        </CardContent>
      )}

      {jobs.length === 0 && totalFindings === 0 && (
        <CardContent>
          <p className="text-sm text-green-600">
            No findings to fix — your code is clean!
          </p>
        </CardContent>
      )}
    </Card>
  );
}
