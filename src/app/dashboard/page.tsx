'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
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

// Separate component to handle URL params (needs Suspense boundary)
function SubscriptionParamsHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const subscription = searchParams.get('subscription');
    if (subscription === 'success') {
      toast({
        title: 'Subscription activated!',
        description: 'Welcome to your new plan. Your credits have been added.',
      });
      router.replace('/dashboard', { scroll: false });
    } else if (subscription === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No charges were made. You can try again anytime.',
        variant: 'default',
      });
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, toast, router]);

  return null;
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
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const authHeaders = { Authorization: `Bearer ${idToken}` };
      const [statsRes, scansRes, appsRes] = await Promise.all([
        fetch('/api/scans/stats', { headers: authHeaders }),
        fetch('/api/scans?limit=10', { headers: authHeaders }),
        fetch('/api/applications', { headers: authHeaders }),
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
        return 'text-gray-500';
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
      <div className="min-h-screen bg-white">
        <DashboardNav />
        <main className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Suspense fallback={null}>
        <SubscriptionParamsHandler />
      </Suspense>
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild size="sm" className="flex-1 sm:flex-auto">
              <Link href="/scans/new">New Scan</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-auto">
              <Link href="/applications">Applications</Link>
            </Button>
          </div>
        </div>

        {/* Sensei welcome — shown when user has no scans */}
        {applications.length === 0 && (
          <Card className="mb-8 border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white">
            <CardContent className="py-10">
              <div className="grid md:grid-cols-[1fr,auto] gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">Sensei ready</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Paste a GitHub URL, Sensei does the rest.</h3>
                  <p className="text-gray-500 mb-6 max-w-lg">
                    No setup needed. Sensei auto-detects your tech stack, picks the right security modules,
                    and gives you actionable fixes with AI prompts you can paste into Cursor, Copilot, or Claude.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link href="/scans/new">Scan My Code</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/docs/getting-started">How it works</Link>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">10 free credits included &middot; No credit card required &middot; Results in under 2 minutes</p>
                </div>
                <div className="hidden md:block bg-slate-900/95 text-white rounded-2xl p-5 max-w-xs">
                  <p className="text-[11px] uppercase tracking-widest text-white/50 mb-2">Sensei</p>
                  <p className="text-sm leading-relaxed mb-3">Paste your GitHub URL and I&apos;ll recommend the right modules for your stack.</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-green-400"><span>&#10003;</span> Auto-detect language &amp; framework</div>
                    <div className="flex items-center gap-2 text-green-400"><span>&#10003;</span> Smart module recommendations</div>
                    <div className="flex items-center gap-2 text-green-400"><span>&#10003;</span> AI-powered fix suggestions</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions — action-oriented */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                Scan Code
              </CardTitle>
              <CardDescription>
                Check your code with 100+ security and quality tools in under 2 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Security</Badge>
                <Badge variant="outline">Dependencies</Badge>
                <Badge variant="outline">Accessibility</Badge>
                <Badge variant="outline">Performance</Badge>
                <Badge variant="outline">+8 more</Badge>
              </div>
              <Button asChild size="sm">
                <Link href="/scans/new">Start a Scan</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                Set Up Testing
              </CardTitle>
              <CardDescription>
                Test your app on every browser, phone, and desktop OS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Web Browsers</Badge>
                <Badge variant="outline">iPhone &amp; Android</Badge>
                <Badge variant="outline">Mac, Win, Linux</Badge>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/docs/integrations/playwright">Set Up Tests</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 mb-8">
          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-gray-400">registered apps</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
              <p className="text-xs text-gray-400">all time</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.criticalFindings || 0}
              </div>
              <p className="text-xs text-gray-400">
                open findings
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.highFindings || 0}
              </div>
              <p className="text-xs text-gray-400">
                open findings
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.mediumFindings || 0}
              </div>
              <p className="text-xs text-gray-400">
                open findings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List - only shown when user has applications */}
        {applications.length > 0 && (
          <Card className="mb-8 border border-gray-100">
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
                    <Card className="border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getAppTypeIcon(app.type)}</span>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{app.type}</p>
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
        )}

        {/* Recent Scans */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Latest scans across all applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">🔍</div>
                <p className="font-medium mb-1">No scans yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Your scan history will appear here after you run your first scan.
                </p>
                <Button variant="outline" asChild size="sm">
                  <Link href="/scans/new">
                    Run Your First Scan
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile: Card view */}
                <div className="space-y-3 md:hidden">
                  {recentScans.map((scan) => (
                    <Link key={scan.id} href={`/scans/${scan.id}`} className="block">
                      <div className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-medium">{scan.applicationName || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{scan.sourceType}</p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(scan.status)}>
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
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
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(scan.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop: Table view */}
                <div className="hidden md:block">
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
                            <span className="text-gray-500">
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
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {formatDistanceToNow(new Date(scan.createdAt), {
                              addSuffix: true,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <DashboardFooter />
    </div>
  );
}
