'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface Scan {
  id: string;
  applicationId: string;
  applicationName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  sourceType: 'github' | 'gitlab' | 'url' | 'upload';
  sourceRef?: string;
  branch?: string;
  startedAt: string;
  completedAt?: string;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  toolsRun: number;
}

export default function ScansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchScans();
    }
  }, [user, authLoading, router]);

  const fetchScans = async () => {
    try {
      const res = await fetch('/api/scans');
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Scan['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-600">Running</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceIcon = (sourceType: Scan['sourceType']) => {
    switch (sourceType) {
      case 'github':
        return '⚡';
      case 'gitlab':
        return '🦊';
      case 'url':
        return '🌐';
      case 'upload':
        return '📦';
      default:
        return '📁';
    }
  };

  const getTotalFindings = useCallback((findings: Scan['findings']) => {
    return findings.critical + findings.high + findings.medium + findings.low;
  }, []);

  const filteredScans = useMemo(() => {
    return statusFilter === 'all'
      ? scans
      : scans.filter((scan) => scan.status === statusFilter);
  }, [scans, statusFilter]);

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
          <div>
            <h1 className="text-3xl font-bold">Scan History</h1>
            <p className="text-muted-foreground">
              View all code analysis scans and their findings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scans</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/applications">
              <Button>New Scan</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredScans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {statusFilter === 'all'
                    ? 'No scans yet. Start by creating an application and running your first scan.'
                    : `No ${statusFilter} scans found.`}
                </p>
                {statusFilter === 'all' && (
                  <Link href="/applications">
                    <Button>Create Application</Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Tools</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        <Link
                          href={`/applications/${scan.applicationId}`}
                          className="font-medium hover:text-primary"
                        >
                          {scan.applicationName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getSourceIcon(scan.sourceType)}</span>
                          <span className="text-sm">
                            {scan.sourceType === 'github' || scan.sourceType === 'gitlab' ? (
                              <>
                                {scan.sourceRef}
                                {scan.branch && (
                                  <span className="text-muted-foreground"> ({scan.branch})</span>
                                )}
                              </>
                            ) : (
                              scan.sourceType
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(scan.status)}</TableCell>
                      <TableCell>
                        {scan.status === 'completed' ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            {scan.findings.critical > 0 && (
                              <span className="text-red-600 font-medium">
                                {scan.findings.critical}C
                              </span>
                            )}
                            {scan.findings.high > 0 && (
                              <span className="text-orange-500 font-medium">
                                {scan.findings.high}H
                              </span>
                            )}
                            {scan.findings.medium > 0 && (
                              <span className="text-yellow-600 font-medium">
                                {scan.findings.medium}M
                              </span>
                            )}
                            {scan.findings.low > 0 && (
                              <span className="text-gray-500">
                                {scan.findings.low}L
                              </span>
                            )}
                            {getTotalFindings(scan.findings) === 0 && (
                              <span className="text-green-600">Clean</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {scan.toolsRun}/69
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(scan.startedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/scans/${scan.id}`}>
                          <Button size="sm" variant="outline">
                            View Report
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Scan Stats */}
        {scans.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{scans.length}</div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {scans.filter((s) => s.status === 'completed').length}
                </div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {scans.reduce((acc, s) => acc + (s.findings?.critical || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Critical Findings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-500">
                  {scans.reduce((acc, s) => acc + (s.findings?.high || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">High Findings</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
