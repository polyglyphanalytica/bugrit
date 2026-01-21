'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Application } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ScanStats {
  totalScans: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
}

interface Scan {
  id: string;
  applicationId: string;
  applicationName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  sourceType: string;
  toolsTotal: number;
  toolsCompleted: number;
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  createdAt: string;
  completedAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, scansRes, appsRes] = await Promise.all([
        fetch('/api/scans/stats'),
        fetch('/api/scans?limit=10'),
        fetch('/api/applications'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (scansRes.ok) {
        const scansData = await scansRes.json();
        setRecentScans(scansData.scans || []);
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
      case 'pending':
        return 'secondary';
      case 'canceled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getAppTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return '🌐';
      case 'mobile':
        return '📱';
      case 'desktop':
        return '💻';
      case 'hybrid':
        return '🔄';
      default:
        return '📦';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/applications">Manage Applications</Link>
          </Button>
        </div>

        {/* Two Pillars Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                Testing
              </CardTitle>
              <CardDescription>
                Make sure your app works everywhere your users are
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Web Browsers</Badge>
                <Badge variant="outline">iPhone & Android</Badge>
                <Badge variant="outline">Mac, Win, Linux</Badge>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/docs/integrations/playwright">View Testing Docs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                Code Scanning
              </CardTitle>
              <CardDescription>
                Analyze your code with 69 built-in security and quality tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Security</Badge>
                <Badge variant="outline">Linting</Badge>
                <Badge variant="outline">Dependencies</Badge>
                <Badge variant="outline">+5 more</Badge>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/docs">View Scanning Docs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Overall Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">registered apps</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.criticalFindings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                open findings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.highFindings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                open findings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.mediumFindings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                open findings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        {applications.length > 0 ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Applications</CardTitle>
              <CardDescription>
                Applications registered for scanning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {applications.slice(0, 6).map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getAppTypeIcon(app.type)}</span>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{app.type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {applications.length > 6 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link href="/applications">View All Applications</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Register your first application to run tests with Playwright, Appium, or Tauri,
                and scan with 69 analysis tools. Get one unified, AI-powered report.
              </p>
              <Button asChild>
                <Link href="/applications">Create Application</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Latest scans across all applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No scans yet. Start a scan from any application to see results here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-medium">
                        {scan.applicationName || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {scan.sourceType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(scan.status)}>
                          {scan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scan.summary ? (
                          <div className="flex gap-2 text-xs">
                            {scan.summary.critical > 0 && (
                              <span className={getSeverityColor('critical')}>
                                {scan.summary.critical}C
                              </span>
                            )}
                            {scan.summary.high > 0 && (
                              <span className={getSeverityColor('high')}>
                                {scan.summary.high}H
                              </span>
                            )}
                            {scan.summary.medium > 0 && (
                              <span className={getSeverityColor('medium')}>
                                {scan.summary.medium}M
                              </span>
                            )}
                            {scan.summary.low > 0 && (
                              <span className={getSeverityColor('low')}>
                                {scan.summary.low}L
                              </span>
                            )}
                            {!scan.summary.critical && !scan.summary.high && !scan.summary.medium && !scan.summary.low && (
                              <span className="text-green-600">Clean</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(scan.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <DashboardFooter />
    </div>
  );
}
