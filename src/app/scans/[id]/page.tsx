'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatDistanceToNow } from 'date-fns';
import { ScanProgress, PrioritizedResults, NoIssuesFound, type Finding } from '@/components/scan';
import { PlainEnglishProvider } from '@/contexts/plain-english-context';

interface ToolResult {
  toolId: string;
  toolName: string;
  category: string;
  success: boolean;
  duration: number;
  findings: Finding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
  error?: string;
}

interface Scan {
  id: string;
  applicationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  source: {
    type: string;
    repoUrl?: string;
    branch?: string;
    fileName?: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  toolsCompleted: number;
  toolsTotal: number;
  results?: ToolResult[];
  summary?: {
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    byTool: Record<string, number>;
  };
  error?: string;
}

export default function ScanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  const scanId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && scanId) {
      fetchScan();
      // Poll for updates if scan is running
      const interval = setInterval(() => {
        if (scan?.status === 'running' || scan?.status === 'pending') {
          fetchScan();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [user, authLoading, scanId, scan?.status]);

  const fetchScan = async () => {
    try {
      const res = await fetch(`/api/scans?scanId=${scanId}`);
      if (res.ok) {
        const data = await res.json();
        setScan(data.scan);
      }
    } catch (error) {
      console.error('Failed to fetch scan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'linting':
        return '📝';
      case 'security':
        return '🔒';
      case 'dependencies':
        return '📦';
      case 'accessibility':
        return '♿';
      case 'quality':
        return '✨';
      case 'documentation':
        return '📚';
      case 'git':
        return '🔀';
      case 'performance':
        return '⚡';
      default:
        return '🔧';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading scan results...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Scan not found</p>
            <Link href="/scans">
              <Button>Back to Scans</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const progress = (scan.toolsCompleted / scan.toolsTotal) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/scans" className="text-muted-foreground hover:text-foreground">
                Scans
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{scan.id}</span>
            </div>
            <h1 className="text-3xl font-bold">Scan Results</h1>
            <p className="text-muted-foreground">
              {scan.source.fileName || scan.source.repoUrl || 'Unknown source'}
              {scan.source.branch && ` (${scan.source.branch})`}
            </p>
          </div>
          <div className="text-right">
            {scan.status === 'completed' && (
              <Badge variant="default" className="bg-green-600">Completed</Badge>
            )}
            {scan.status === 'running' && (
              <Badge variant="default" className="bg-blue-600">Running</Badge>
            )}
            {scan.status === 'pending' && (
              <Badge variant="secondary">Pending</Badge>
            )}
            {scan.status === 'failed' && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </div>
        </div>

        {/* Progress (if running) - Using new component */}
        {(scan.status === 'running' || scan.status === 'pending') && (
          <ScanProgress
            toolsCompleted={scan.toolsCompleted}
            toolsTotal={scan.toolsTotal}
            status={scan.status}
            className="mb-6"
          />
        )}

        {/* Error message */}
        {scan.error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{scan.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Prioritized Results - New UX */}
        {scan.summary && scan.status === 'completed' && scan.results && (
          <PlainEnglishProvider>
            {scan.summary.totalFindings === 0 ? (
              <NoIssuesFound className="mb-6" />
            ) : (
              <PrioritizedResults
                results={scan.results.map(r => ({
                  ...r,
                  findings: r.findings.map((f, i) => ({
                    ...f,
                    id: f.id || `${r.toolId}-${i}`,
                    toolName: r.toolName,
                  })) as Finding[],
                }))}
                summary={scan.summary}
                className="mb-6"
              />
            )}
          </PlainEnglishProvider>
        )}

        {/* Legacy Tool Results - Collapsed */}
        {scan.results && scan.results.length > 0 && scan.summary && scan.summary.totalFindings > 0 && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-4">
              View results by tool (advanced)
            </summary>
        {scan.results && scan.results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tool Results</CardTitle>
              <CardDescription>
                {scan.results.filter(r => r.success).length} tools completed successfully,{' '}
                {scan.results.filter(r => !r.success).length} failed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {scan.results.map((result) => (
                  <AccordionItem
                    key={result.toolId}
                    value={result.toolId}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getCategoryIcon(result.category)}</span>
                          <div className="text-left">
                            <div className="font-medium">{result.toolName}</div>
                            <div className="text-sm text-muted-foreground">
                              {result.category} • {result.duration}ms
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <>
                              {result.summary.errors > 0 && (
                                <Badge variant="destructive">{result.summary.errors} errors</Badge>
                              )}
                              {result.summary.warnings > 0 && (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                  {result.summary.warnings} warnings
                                </Badge>
                              )}
                              {result.summary.total === 0 && (
                                <Badge variant="outline" className="border-green-500 text-green-600">
                                  Clean
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {result.error ? (
                        <p className="text-red-600 py-2">{result.error}</p>
                      ) : result.findings.length === 0 ? (
                        <p className="text-green-600 py-2">No issues found</p>
                      ) : (
                        <div className="space-y-2 py-2">
                          {result.findings.slice(0, 50).map((finding, idx) => (
                            <div
                              key={finding.id || idx}
                              className={`p-3 rounded-lg border ${getSeverityColor(finding.severity)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{finding.message}</p>
                                  {finding.file && (
                                    <p className="text-sm opacity-75 mt-1">
                                      {finding.file}
                                      {finding.line && `:${finding.line}`}
                                      {finding.column && `:${finding.column}`}
                                    </p>
                                  )}
                                  {finding.rule && (
                                    <p className="text-xs opacity-60 mt-1">Rule: {finding.rule}</p>
                                  )}
                                  {finding.suggestion && (
                                    <p className="text-sm mt-2 opacity-75">
                                      Suggestion: {finding.suggestion}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    finding.severity === 'error'
                                      ? 'border-red-500'
                                      : finding.severity === 'warning'
                                        ? 'border-yellow-500'
                                        : 'border-blue-500'
                                  }
                                >
                                  {finding.severity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {result.findings.length > 50 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              And {result.findings.length - 50} more findings...
                            </p>
                          )}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
          </details>
        )}

        {/* Metadata */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Scan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Scan ID</dt>
                <dd className="font-mono">{scan.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source Type</dt>
                <dd className="capitalize">{scan.source.type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}</dd>
              </div>
              {scan.completedAt && (
                <div>
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd>{formatDistanceToNow(new Date(scan.completedAt), { addSuffix: true })}</dd>
                </div>
              )}
              {scan.startedAt && scan.completedAt && (
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>
                    {Math.round(
                      (new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) /
                        1000
                    )}
                    s
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </main>
      <DashboardFooter />
    </div>
  );
}
