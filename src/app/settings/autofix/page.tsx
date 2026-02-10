'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface AutofixSettings {
  enabled: boolean;
  autoRun: boolean;
  provider: {
    providerId: string;
    model: string;
    keyId: string;
  } | null;
  github: {
    createPR: boolean;
    branchPrefix: string;
    minSeverity: string;
    maxFindings: number;
  };
}

interface AIProvider {
  id: string;
  name: string;
  description: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
  docsUrl: string;
}

interface StoredKey {
  id: string;
  providerId: string;
  keyPrefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function AutofixSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AutofixSettings | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnterprise, setIsEnterprise] = useState(true);

  // Add key dialog
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [newKey, setNewKey] = useState({ providerId: '', apiKey: '', label: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadSettings();
      loadKeys();
    }
  }, [user, authLoading, router]);

  const getIdToken = async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  };

  const loadSettings = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/autofix/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setIsEnterprise(false);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load autofix settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKeys = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/autofix/keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  };

  const saveSettings = async (updates: Partial<AutofixSettings>) => {
    setSaving(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/autofix/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        toast({ title: 'Settings saved' });
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.providerId || !newKey.apiKey || !newKey.label.trim()) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setAddingKey(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/autofix/keys', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: newKey.providerId,
          apiKey: newKey.apiKey,
          label: newKey.label.trim(),
        }),
      });

      if (res.ok) {
        toast({ title: 'API key added' });
        setShowAddKeyDialog(false);
        setNewKey({ providerId: '', apiKey: '', label: '' });
        loadKeys();
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add key', variant: 'destructive' });
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/autofix/keys?keyId=${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ title: 'API key deleted' });
        loadKeys();
      } else {
        toast({ title: 'Error', description: 'Failed to delete key', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete key', variant: 'destructive' });
    }
  };

  const handleSelectProvider = async (providerId: string, model: string) => {
    // Find a key for this provider
    const providerKey = keys.find(k => k.providerId === providerId);
    if (!providerKey) {
      toast({
        title: 'No API key',
        description: `Add an API key for this provider first`,
        variant: 'destructive',
      });
      return;
    }

    await saveSettings({
      provider: { providerId, model, keyId: providerKey.id },
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isEnterprise) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Autofix</h2>
          <p className="text-muted-foreground mt-1">
            AI-powered code fixes pushed directly to your repository
          </p>
        </div>
        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">&#x1F512;</div>
              <h3 className="text-xl font-semibold">Enterprise Feature</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Autofix is available on the Enterprise plan. Upgrade to get AI-powered code fixes,
                automated integration code generation, and direct GitHub PR creation.
              </p>
              <Button asChild>
                <Link href="/pricing">View Enterprise Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedProvider = providers.find(p => p.id === settings?.provider?.providerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Autofix</h2>
        <p className="text-muted-foreground mt-1">
          AI-powered code fixes and integration code, pushed directly to your repository
        </p>
      </div>

      {/* Enable / Auto-run Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Autofix Settings</CardTitle>
          <CardDescription>
            When enabled, Bugrit uses your AI provider to generate code fixes for scan findings and
            pushes them to a branch on your GitHub repo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Autofix</Label>
              <p className="text-sm text-muted-foreground">
                Allow autofix to generate and push code fixes
              </p>
            </div>
            <Switch
              checked={settings?.enabled ?? false}
              onCheckedChange={(checked) => saveSettings({ enabled: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Auto-run after scans</Label>
              <p className="text-sm text-muted-foreground">
                Automatically trigger autofix when a scan completes (GitHub repos only)
              </p>
            </div>
            <Switch
              checked={settings?.autoRun ?? false}
              onCheckedChange={(checked) => saveSettings({ autoRun: checked })}
              disabled={saving || !settings?.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Isolation Notice */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-2xl">&#x1F512;</div>
            <div>
              <p className="font-medium text-sm">Strict Key Isolation</p>
              <p className="text-sm text-muted-foreground">
                Your AI provider keys are encrypted with AES-256-GCM and are used exclusively for
                your autofix and integration jobs. Bugrit&apos;s internal AI features (Sensei, vibe
                scores, etc.) use separate platform keys and never access your BYOK keys.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Choose which AI provider generates your code fixes. Bring your own API key (BYOK).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => {
              const isSelected = settings?.provider?.providerId === provider.id;
              const hasKey = keys.some(k => k.providerId === provider.id);

              return (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id, provider.defaultModel)}
                  disabled={!hasKey}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/50'
                      : hasKey
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{provider.name}</span>
                    {isSelected && <Badge className="bg-orange-500">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                  {!hasKey && (
                    <p className="text-xs text-orange-600 mt-2">Add API key first</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Model Selection */}
          {selectedProvider && settings?.provider && (
            <div className="mt-4 space-y-2">
              <Label>Model</Label>
              <Select
                value={settings.provider.model}
                onValueChange={(model) =>
                  saveSettings({
                    provider: { ...settings.provider!, model },
                  })
                }
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Your encrypted API keys for AI providers. Keys are stored with AES-256-GCM encryption.
              </CardDescription>
            </div>
            <Dialog open={showAddKeyDialog} onOpenChange={setShowAddKeyDialog}>
              <DialogTrigger asChild>
                <Button size="sm">Add Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add API Key</DialogTitle>
                  <DialogDescription>
                    Your key will be encrypted before storage. Bugrit never stores raw keys.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={newKey.providerId}
                      onValueChange={(v) => setNewKey(prev => ({ ...prev, providerId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder={providers.find(p => p.id === newKey.providerId)?.keyPlaceholder || 'Paste your API key'}
                      value={newKey.apiKey}
                      onChange={(e) => setNewKey(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                    {newKey.providerId && (
                      <p className="text-xs text-muted-foreground">
                        Get a key from{' '}
                        <a
                          href={providers.find(p => p.id === newKey.providerId)?.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {providers.find(p => p.id === newKey.providerId)?.name} docs
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      placeholder="e.g., Production key"
                      value={newKey.label}
                      onChange={(e) => setNewKey(prev => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddKeyDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddKey} disabled={addingKey}>
                    {addingKey ? 'Adding...' : 'Add Key'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">
                No API keys stored yet. Add a key to start using autofix.
              </p>
              <Button variant="outline" onClick={() => setShowAddKeyDialog(true)}>
                Add Your First Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <Badge variant="outline">{key.providerId}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{key.label}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {key.keyPrefix}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the encrypted key &quot;{key.label}&quot;.
                              Autofix will stop working if this is your active provider key.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteKey(key.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* GitHub Settings */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Settings</CardTitle>
          <CardDescription>
            Configure how autofix creates branches and pull requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Create Pull Request</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a PR (vs. just pushing the branch)
              </p>
            </div>
            <Switch
              checked={settings?.github.createPR ?? true}
              onCheckedChange={(checked) =>
                saveSettings({ github: { ...settings!.github, createPR: checked } })
              }
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch Prefix</Label>
              <Input
                value={settings?.github.branchPrefix || 'bugrit/autofix'}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9/_-]/g, '');
                  setSettings(prev => prev ? {
                    ...prev,
                    github: { ...prev.github, branchPrefix: val },
                  } : prev);
                }}
                onBlur={() => {
                  if (settings) saveSettings({ github: settings.github });
                }}
                placeholder="bugrit/autofix"
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Severity</Label>
              <Select
                value={settings?.github.minSeverity || 'high'}
                onValueChange={(value) =>
                  saveSettings({ github: { ...settings!.github, minSeverity: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical only</SelectItem>
                  <SelectItem value="high">High and above</SelectItem>
                  <SelectItem value="medium">Medium and above</SelectItem>
                  <SelectItem value="low">All severities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Findings per Run</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={settings?.github.maxFindings || 25}
              onChange={(e) => {
                const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 25));
                setSettings(prev => prev ? {
                  ...prev,
                  github: { ...prev.github, maxFindings: val },
                } : prev);
              }}
              onBlur={() => {
                if (settings) saveSettings({ github: settings.github });
              }}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Limits AI API calls per autofix run (cost control). Max 100.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Generator</CardTitle>
          <CardDescription>
            Use your AI provider to generate complete Bugrit integration code for your app —
            CI/CD pipelines, pre-commit hooks, API clients, and more. Code is pushed to a branch
            on your repo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { target: 'ci_cd', label: 'CI/CD Pipeline', desc: 'GitHub Actions, GitLab CI, Jenkins', icon: '&#x2699;&#xFE0F;' },
              { target: 'pre_commit', label: 'Pre-commit Hook', desc: 'Scan before every commit', icon: '&#x1F6A7;' },
              { target: 'api_client', label: 'API Client', desc: 'Bugrit API wrapper for your language', icon: '&#x1F4E1;' },
              { target: 'webhook', label: 'Webhook Handler', desc: 'Receive scan result notifications', icon: '&#x1F514;' },
              { target: 'monitoring', label: 'Monitoring', desc: 'Scheduled scan + tracking', icon: '&#x1F4CA;' },
              { target: 'custom', label: 'Custom', desc: 'Describe what you need', icon: '&#x2728;' },
            ].map(({ target, label, desc, icon }) => (
              <Link
                key={target}
                href={`/settings/autofix/integrate?target=${target}`}
                className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-left"
              >
                <div className="text-2xl mb-2" dangerouslySetInnerHTML={{ __html: icon }} />
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
