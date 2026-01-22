'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ApiKey, ApiKeyPermission, API_PERMISSION_GROUPS } from '@/lib/types';

interface ApiKeyWithFullKey extends ApiKey {
  fullKey?: string;
}

const PERMISSION_LABELS: Record<ApiKeyPermission, string> = {
  'scripts:submit': 'Submit Scripts',
  'scripts:read': 'Read Scripts',
  'executions:trigger': 'Trigger Executions',
  'executions:read': 'Read Executions',
  'results:read': 'Read Results',
  'projects:read': 'Read Projects',
  'projects:write': 'Write Projects',
  'scans:read': 'Read Scans',
  'scans:write': 'Write Scans',
  'tests:read': 'Read Tests',
  'tests:write': 'Write Tests',
  'reports:read': 'Read Reports',
  'reports:write': 'Write Reports',
};

const V1_PERMISSIONS: ApiKeyPermission[] = [
  'projects:read',
  'projects:write',
  'scans:read',
  'scans:write',
  'tests:read',
  'tests:write',
  'reports:read',
  'reports:write',
];

export default function ApiKeysPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyWithFullKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ name: string; permissions: ApiKeyPermission[] }>({
    name: '',
    permissions: [...API_PERMISSION_GROUPS.execute],
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyMasked, setKeyMasked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchApiKeys();
    }
  }, [user, authLoading, router]);

  // Auto-mask the created key after 60 seconds for security
  useEffect(() => {
    if (createdKey && !keyMasked) {
      const timer = setTimeout(() => {
        setKeyMasked(true);
      }, 60000); // 60 seconds
      return () => clearTimeout(timer);
    }
  }, [createdKey, keyMasked]);

  // Clear created key from memory when dialog closes
  const handleKeyDialogClose = (open: boolean) => {
    setShowKeyDialog(open);
    if (!open) {
      // Clear sensitive data from memory after a brief delay for animation
      setTimeout(() => {
        setCreatedKey(null);
        setKeyMasked(false);
        setCopied(false);
      }, 300);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyData.name,
          permissions: newKeyData.permissions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.fullKey);
        setShowCreateDialog(false);
        setShowKeyDialog(true);
        fetchApiKeys();
        setNewKeyData({
          name: '',
          permissions: [...API_PERMISSION_GROUPS.execute],
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'API key revoked successfully',
        });
        fetchApiKeys();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to revoke API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePermission = (permission: ApiKeyPermission) => {
    setNewKeyData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const setPermissionGroup = (group: 'readonly' | 'execute' | 'full') => {
    setNewKeyData((prev) => ({
      ...prev,
      permissions: [...API_PERMISSION_GROUPS[group]],
    }));
  };

  const getStatusBadge = (status: ApiKey['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground mt-1">
              Manage API keys for programmatic access to the Bugrit API
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>Create API Key</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Create an API key to access the Bugrit API programmatically. The key will only
                  be shown once after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., CI/CD Pipeline"
                    value={newKeyData.name}
                    onChange={(e) =>
                      setNewKeyData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permission Presets</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPermissionGroup('readonly')}
                    >
                      Read Only
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPermissionGroup('execute')}
                    >
                      Execute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPermissionGroup('full')}
                    >
                      Full Access
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                    {V1_PERMISSIONS.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission}
                          checked={newKeyData.permissions.includes(permission)}
                          onCheckedChange={() => togglePermission(permission)}
                        />
                        <label
                          htmlFor={permission}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {PERMISSION_LABELS[permission]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* New Key Created Dialog */}
        <Dialog open={showKeyDialog} onOpenChange={handleKeyDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your API key now. You will not be able to see it again.
                {!keyMasked && ' Key will be masked in 60 seconds.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                {keyMasked ? (
                  <span className="text-muted-foreground">
                    {createdKey?.substring(0, 10)}••••••••••••••••••••
                  </span>
                ) : (
                  createdKey
                )}
              </div>
              {keyMasked ? (
                <p className="text-sm text-muted-foreground text-center">
                  Key has been masked for security. Please close this dialog.
                </p>
              ) : (
                <Button onClick={copyToClipboard} className="w-full">
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleKeyDialogClose(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rate Limits Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Rate Limits by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Starter</p>
                <p className="text-2xl font-bold">10</p>
                <p className="text-sm text-muted-foreground">requests/min</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="font-semibold">Pro</p>
                <p className="text-2xl font-bold">60</p>
                <p className="text-sm text-muted-foreground">requests/min</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">Business</p>
                <p className="text-2xl font-bold">300</p>
                <p className="text-sm text-muted-foreground">requests/min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              Manage your API keys. Keys are used to authenticate API requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No API keys created yet. Create your first API key to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {key.key}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(key.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(key.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.lastUsedAt
                          ? formatDistanceToNow(new Date(key.lastUsedAt), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {key.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevokeKey(key.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use your API key to authenticate requests:
            </p>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "your-app-id",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main"
  }'`}</pre>
            </div>
            <p className="text-muted-foreground mt-4">
              See the{' '}
              <a href="/docs" className="text-primary hover:underline">
                API documentation
              </a>{' '}
              for more details.
            </p>
          </CardContent>
        </Card>
      </main>
      <DashboardFooter />
    </div>
  );
}
