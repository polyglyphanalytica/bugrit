'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Application, ApiKey, ApiKeyPermission } from '@/lib/types';

const ALL_PERMISSIONS: { value: ApiKeyPermission; label: string }[] = [
  { value: 'scripts:submit', label: 'Submit Scripts' },
  { value: 'scripts:read', label: 'Read Scripts' },
  { value: 'executions:trigger', label: 'Trigger Executions' },
  { value: 'executions:read', label: 'Read Executions' },
  { value: 'results:read', label: 'Read Results' },
];

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  // New key form state
  const [newKey, setNewKey] = useState({
    name: '',
    permissions: ['scripts:read', 'executions:read', 'results:read'] as ApiKeyPermission[],
    expiresInDays: 90,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && resolvedParams.id) {
      fetchApplication();
      fetchApiKeys();
    }
  }, [user, authLoading, router, resolvedParams.id]);

  const fetchApplication = async () => {
    try {
      const res = await fetch(`/api/applications/${resolvedParams.id}`, {
        headers: { 'x-user-id': user!.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
      } else if (res.status === 404) {
        router.push('/applications');
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`/api/applications/${resolvedParams.id}/keys`, {
        headers: { 'x-user-id': user!.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const handleCreateKey = async () => {
    if (!newKey.name) {
      toast({
        title: 'Error',
        description: 'Please provide a name for the API key.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingKey(true);
    try {
      const res = await fetch(`/api/applications/${resolvedParams.id}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.uid,
        },
        body: JSON.stringify(newKey),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKeyResult(data.key.fullKey);
        fetchApiKeys();
        toast({
          title: 'API Key Created',
          description: 'Make sure to copy the key now. It won\'t be shown again.',
        });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create API key');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/applications/${resolvedParams.id}/keys?keyId=${keyId}&action=revoke`,
        {
          method: 'DELETE',
          headers: { 'x-user-id': user!.uid },
        }
      );

      if (res.ok) {
        toast({ title: 'API Key Revoked', description: `${keyName} has been revoked.` });
        fetchApiKeys();
      } else {
        throw new Error('Failed to revoke API key');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${keyName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/applications/${resolvedParams.id}/keys?keyId=${keyId}&action=delete`,
        {
          method: 'DELETE',
          headers: { 'x-user-id': user!.uid },
        }
      );

      if (res.ok) {
        toast({ title: 'API Key Deleted', description: `${keyName} has been deleted.` });
        fetchApiKeys();
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API key.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'API key copied to clipboard.' });
  };

  const togglePermission = (permission: ApiKeyPermission) => {
    setNewKey((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
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

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
          <p className="text-muted-foreground">Application not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link href="/applications" className="hover:text-foreground">
            Applications
          </Link>
          <span>/</span>
          <span className="text-foreground">{application.name}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{application.name}</h1>
            <p className="text-muted-foreground">{application.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{application.type}</Badge>
            <Button asChild>
              <Link href={`/applications/${resolvedParams.id}/new-scan`}>
                New Scan
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p>{application.type}</p>
                  </div>
                  {application.targetUrl && (
                    <div>
                      <Label className="text-muted-foreground">Target URL</Label>
                      <p>{application.targetUrl}</p>
                    </div>
                  )}
                  {application.packageId && (
                    <div>
                      <Label className="text-muted-foreground">Android Package</Label>
                      <p>{application.packageId}</p>
                    </div>
                  )}
                  {application.bundleId && (
                    <div>
                      <Label className="text-muted-foreground">iOS Bundle</Label>
                      <p>{application.bundleId}</p>
                    </div>
                  )}
                  {application.platforms && application.platforms.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Platforms</Label>
                      <div className="flex gap-2 mt-1">
                        {application.platforms.map((p) => (
                          <Badge key={p} variant="outline">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Keys</span>
                    <span className="font-medium">{apiKeys.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Keys</span>
                    <span className="font-medium">
                      {apiKeys.filter((k) => k.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Scan History</CardTitle>
                  <CardDescription>
                    View past scans and their reports
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/applications/${resolvedParams.id}/new-scan`}>
                    New Scan
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No Scans Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Start your first scan to analyze your application with 69 tools
                    and get a unified, prioritized report.
                  </p>
                  <Button asChild>
                    <Link href={`/applications/${resolvedParams.id}/new-scan`}>
                      Start First Scan
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage API keys for this application
                  </CardDescription>
                </div>
                <Dialog
                  open={createKeyDialogOpen}
                  onOpenChange={(open) => {
                    setCreateKeyDialogOpen(open);
                    if (!open) {
                      setNewKeyResult(null);
                      setNewKey({
                        name: '',
                        permissions: ['scripts:read', 'executions:read', 'results:read'],
                        expiresInDays: 90,
                      });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>Create API Key</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {newKeyResult ? 'API Key Created' : 'Create API Key'}
                      </DialogTitle>
                      <DialogDescription>
                        {newKeyResult
                          ? 'Copy this key now. It will not be shown again.'
                          : 'Create a new API key for CI/CD integration.'}
                      </DialogDescription>
                    </DialogHeader>
                    {newKeyResult ? (
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                          {newKeyResult}
                        </div>
                        <Button
                          onClick={() => copyToClipboard(newKeyResult)}
                          className="w-full"
                        >
                          Copy to Clipboard
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="keyName">Name</Label>
                            <Input
                              id="keyName"
                              value={newKey.name}
                              onChange={(e) =>
                                setNewKey({ ...newKey, name: e.target.value })
                              }
                              placeholder="CI/CD Pipeline Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="space-y-2">
                              {ALL_PERMISSIONS.map((perm) => (
                                <div
                                  key={perm.value}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={perm.value}
                                    checked={newKey.permissions.includes(perm.value)}
                                    onCheckedChange={() => togglePermission(perm.value)}
                                  />
                                  <label
                                    htmlFor={perm.value}
                                    className="text-sm cursor-pointer"
                                  >
                                    {perm.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expires">Expires In</Label>
                            <Select
                              value={String(newKey.expiresInDays)}
                              onValueChange={(v) =>
                                setNewKey({ ...newKey, expiresInDays: Number(v) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                                <SelectItem value="180">180 days</SelectItem>
                                <SelectItem value="365">1 year</SelectItem>
                                <SelectItem value="0">Never</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setCreateKeyDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleCreateKey} disabled={creatingKey}>
                            {creatingKey ? 'Creating...' : 'Create Key'}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No API keys yet. Create one to get started.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell className="font-mono text-sm">{key.key}</TableCell>
                          <TableCell>
                            <Badge
                              variant={key.status === 'active' ? 'default' : 'secondary'}
                            >
                              {key.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(key.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{key.usageCount} requests</TableCell>
                          <TableCell className="text-right">
                            {key.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeKey(key.id, key.name)}
                              >
                                Revoke
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteKey(key.id, key.name)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to be notified about scan results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send scan results via email
                      </p>
                    </div>
                    <Switch checked={application.settings?.emailEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Recipients</Label>
                    <Input
                      placeholder="email@example.com, another@example.com"
                      defaultValue={application.settings?.emailRecipients?.join(', ')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Slack Integration</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Slack Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send scan results to Slack
                      </p>
                    </div>
                    <Switch checked={application.settings?.slackEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      defaultValue={application.settings?.slackWebhookUrl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Input
                      placeholder="#testing"
                      defaultValue={application.settings?.slackChannel}
                    />
                  </div>
                </div>

                <Button>Save Notification Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling">
            <Card>
              <CardHeader>
                <CardTitle>Scan Scheduling</CardTitle>
                <CardDescription>
                  Configure automated scans and uptime monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Uptime Monitoring</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Uptime Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Ping your endpoints every 5 minutes
                      </p>
                    </div>
                    <Switch
                      checked={application.settings?.scheduling?.enableUptimeMonitoring}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Daily Smoke Scans</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Daily Smoke Scans</Label>
                      <p className="text-sm text-muted-foreground">
                        Run quick scans automatically every day
                      </p>
                    </div>
                    <Switch
                      checked={application.settings?.scheduling?.enableDailySmoke}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Weekly Full Scans</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Weekly Full Scans</Label>
                      <p className="text-sm text-muted-foreground">
                        Run comprehensive scans weekly
                      </p>
                    </div>
                    <Switch
                      checked={application.settings?.scheduling?.enableWeeklyRegression}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Deployment Triggers</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Run Scans on Deployment</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically run scans when deployment is detected
                      </p>
                    </div>
                    <Switch
                      checked={application.settings?.scheduling?.runOnDeployment}
                    />
                  </div>
                </div>

                <Button>Save Scheduling Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <DashboardFooter />
    </div>
  );
}
