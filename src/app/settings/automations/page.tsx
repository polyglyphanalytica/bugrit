'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type TriggerType =
  | 'github_push'
  | 'github_pr'
  | 'gitlab_push'
  | 'gitlab_mr'
  | 'schedule'
  | 'webhook';

interface Automation {
  id: string;
  name: string;
  projectId: string;
  trigger: {
    type: TriggerType;
    config: Record<string, unknown>;
  };
  action: {
    type: 'scan';
    config: {
      platform: string;
      tools?: string | string[];
      failOn?: string | null;
    };
  };
  webhookUrl?: string | null;
  enabled: boolean;
  lastTriggeredAt?: string | null;
  triggerCount: number;
  creditsPerScan?: number;
  estimatedMonthlyCredits?: number;
  estimatedTriggersPerMonth?: number;
  createdAt: string;
  updatedAt: string;
}

// Credit costs for different tool configurations
const TOOL_CREDITS: Record<string, number> = {
  all: 12,           // Base + security + accessibility + performance
  security: 2,       // Base + security tools
  quality: 1,        // Base + free tools
  dependencies: 1,   // Base + free tools
};

// Estimated triggers per month by trigger type
const DEFAULT_TRIGGERS_PER_MONTH: Record<TriggerType, number> = {
  github_push: 60,     // ~2 pushes per day
  github_pr: 20,       // ~5 PRs per week
  gitlab_push: 60,
  gitlab_mr: 20,
  schedule: 30,        // Once per day (default cron)
  webhook: 10,         // Manual/occasional
};

// Parse cron to estimate monthly triggers
function estimateTriggersFromCron(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return 30;

  const [, , dayOfMonth, , dayOfWeek] = parts;

  // Daily: * * * * * or 0 2 * * *
  if (dayOfMonth === '*' && dayOfWeek === '*') return 30;

  // Weekly: 0 2 * * 0
  if (dayOfMonth === '*' && dayOfWeek !== '*') {
    const days = dayOfWeek.split(',').length;
    return days * 4;
  }

  // Monthly: 0 2 1 * *
  if (dayOfMonth !== '*') {
    const days = dayOfMonth.split(',').length;
    return days;
  }

  return 30;
}

interface Project {
  id: string;
  name: string;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  github_push: 'GitHub Push',
  github_pr: 'GitHub Pull Request',
  gitlab_push: 'GitLab Push',
  gitlab_mr: 'GitLab Merge Request',
  schedule: 'Scheduled',
  webhook: 'Webhook',
};

const TRIGGER_ICONS: Record<TriggerType, string> = {
  github_push: '🐙',
  github_pr: '🔀',
  gitlab_push: '🦊',
  gitlab_mr: '🔀',
  schedule: '⏰',
  webhook: '📡',
};

export default function AutomationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    projectId: '',
    triggerType: 'github_push' as TriggerType,
    repository: '',
    branches: 'main',
    cron: '0 2 * * *',
    platform: 'web',
    tools: 'all',
    failOn: 'critical',
    estimatedTriggersPerMonth: 60,
  });

  // Calculate credit estimates based on current form state
  const creditsPerScan = TOOL_CREDITS[newAutomation.tools] || TOOL_CREDITS.all;
  const estimatedTriggersPerMonth =
    newAutomation.triggerType === 'schedule'
      ? estimateTriggersFromCron(newAutomation.cron)
      : newAutomation.estimatedTriggersPerMonth ||
        DEFAULT_TRIGGERS_PER_MONTH[newAutomation.triggerType];
  const estimatedMonthlyCredits = creditsPerScan * estimatedTriggersPerMonth;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchAutomations();
      fetchProjects();
    }
  }, [user, authLoading, router]);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/v1/automations');
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.data?.automations || []);
      }
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleCreateAutomation = async () => {
    if (!newAutomation.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the automation',
        variant: 'destructive',
      });
      return;
    }

    if (!newAutomation.projectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const trigger: { type: TriggerType; config: Record<string, unknown> } = {
        type: newAutomation.triggerType,
        config: {},
      };

      // Build trigger config based on type
      switch (newAutomation.triggerType) {
        case 'github_push':
        case 'github_pr':
          trigger.config = {
            repository: newAutomation.repository,
            branches: newAutomation.branches.split(',').map((b) => b.trim()),
          };
          break;
        case 'gitlab_push':
        case 'gitlab_mr':
          trigger.config = {
            projectPath: newAutomation.repository,
            branches: newAutomation.branches.split(',').map((b) => b.trim()),
          };
          break;
        case 'schedule':
          trigger.config = {
            cron: newAutomation.cron,
            timezone: 'UTC',
          };
          break;
        case 'webhook':
          trigger.config = {};
          break;
      }

      const res = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAutomation.name,
          projectId: newAutomation.projectId,
          trigger,
          action: {
            type: 'scan',
            config: {
              platform: newAutomation.platform,
              tools: newAutomation.tools,
              failOn: newAutomation.failOn || null,
            },
          },
          enabled: true,
          creditsPerScan,
          estimatedTriggersPerMonth,
          estimatedMonthlyCredits,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Automation created successfully',
        });
        setShowCreateDialog(false);
        fetchAutomations();
        setNewAutomation({
          name: '',
          projectId: '',
          triggerType: 'github_push',
          repository: '',
          branches: 'main',
          cron: '0 2 * * *',
          platform: 'web',
          tools: 'all',
          failOn: 'critical',
          estimatedTriggersPerMonth: 60,
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error?.message || 'Failed to create automation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create automation',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleEnabled = async (automation: Automation) => {
    try {
      const res = await fetch(`/api/v1/automations/${automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !automation.enabled }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Automation ${automation.enabled ? 'disabled' : 'enabled'}`,
        });
        fetchAutomations();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update automation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update automation',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    try {
      const res = await fetch(`/api/v1/automations/${automationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Automation deleted successfully',
        });
        fetchAutomations();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete automation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete automation',
        variant: 'destructive',
      });
    }
  };

  const copyWebhookUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automations</h2>
          <p className="text-muted-foreground mt-1">
            Set up automatic scans triggered by git events, schedules, or webhooks
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Create Automation</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
              <DialogDescription>
                Configure when and how scans should be triggered automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Automation Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Scan PRs to main"
                  value={newAutomation.name}
                  onChange={(e) =>
                    setNewAutomation((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={newAutomation.projectId}
                  onValueChange={(value) =>
                    setNewAutomation((prev) => ({ ...prev, projectId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No projects found.{' '}
                    <Link href="/dashboard" className="text-primary hover:underline">
                      Create a project first
                    </Link>
                    .
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newAutomation.triggerType}
                  onValueChange={(value: TriggerType) =>
                    setNewAutomation((prev) => ({
                      ...prev,
                      triggerType: value,
                      estimatedTriggersPerMonth: DEFAULT_TRIGGERS_PER_MONTH[value],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github_push">
                      <span className="flex items-center gap-2">
                        <span>🐙</span> GitHub Push
                      </span>
                    </SelectItem>
                    <SelectItem value="github_pr">
                      <span className="flex items-center gap-2">
                        <span>🔀</span> GitHub Pull Request
                      </span>
                    </SelectItem>
                    <SelectItem value="gitlab_push">
                      <span className="flex items-center gap-2">
                        <span>🦊</span> GitLab Push
                      </span>
                    </SelectItem>
                    <SelectItem value="gitlab_mr">
                      <span className="flex items-center gap-2">
                        <span>🔀</span> GitLab Merge Request
                      </span>
                    </SelectItem>
                    <SelectItem value="schedule">
                      <span className="flex items-center gap-2">
                        <span>⏰</span> Scheduled (Cron)
                      </span>
                    </SelectItem>
                    <SelectItem value="webhook">
                      <span className="flex items-center gap-2">
                        <span>📡</span> Webhook
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger-specific config */}
              {(newAutomation.triggerType === 'github_push' ||
                newAutomation.triggerType === 'github_pr' ||
                newAutomation.triggerType === 'gitlab_push' ||
                newAutomation.triggerType === 'gitlab_mr') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="repository">
                      {newAutomation.triggerType.startsWith('github')
                        ? 'Repository (owner/repo)'
                        : 'Project Path (group/project)'}
                    </Label>
                    <Input
                      id="repository"
                      placeholder={
                        newAutomation.triggerType.startsWith('github')
                          ? 'yourorg/yourrepo'
                          : 'yourgroup/yourproject'
                      }
                      value={newAutomation.repository}
                      onChange={(e) =>
                        setNewAutomation((prev) => ({ ...prev, repository: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branches">Branches (comma-separated)</Label>
                    <Input
                      id="branches"
                      placeholder="main, develop"
                      value={newAutomation.branches}
                      onChange={(e) =>
                        setNewAutomation((prev) => ({ ...prev, branches: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              {newAutomation.triggerType === 'schedule' && (
                <div className="space-y-2">
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Input
                    id="cron"
                    placeholder="0 2 * * *"
                    value={newAutomation.cron}
                    onChange={(e) =>
                      setNewAutomation((prev) => ({ ...prev, cron: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: &quot;0 2 * * *&quot; runs at 2 AM UTC daily
                  </p>
                </div>
              )}

              {newAutomation.triggerType === 'webhook' && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    A unique webhook URL will be generated after creation. Use this URL to trigger
                    scans from any external service.
                  </p>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm">Scan Configuration</h4>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={newAutomation.platform}
                    onValueChange={(value) =>
                      setNewAutomation((prev) => ({ ...prev, platform: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tools</Label>
                  <Select
                    value={newAutomation.tools}
                    onValueChange={(value) =>
                      setNewAutomation((prev) => ({ ...prev, tools: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tools (69)</SelectItem>
                      <SelectItem value="security">Security Only</SelectItem>
                      <SelectItem value="quality">Code Quality Only</SelectItem>
                      <SelectItem value="dependencies">Dependencies Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fail Build On</Label>
                  <Select
                    value={newAutomation.failOn}
                    onValueChange={(value) =>
                      setNewAutomation((prev) => ({ ...prev, failOn: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical Issues</SelectItem>
                      <SelectItem value="high">High or Above</SelectItem>
                      <SelectItem value="medium">Medium or Above</SelectItem>
                      <SelectItem value="low">Any Issue</SelectItem>
                      <SelectItem value="">Never (Report Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credit Estimate Section */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span>💰</span> Credit Budget Estimate
                </h4>

                {newAutomation.triggerType !== 'schedule' && (
                  <div className="space-y-2">
                    <Label htmlFor="triggers">Expected triggers per month</Label>
                    <Input
                      id="triggers"
                      type="number"
                      min="1"
                      max="1000"
                      value={newAutomation.estimatedTriggersPerMonth}
                      onChange={(e) =>
                        setNewAutomation((prev) => ({
                          ...prev,
                          estimatedTriggersPerMonth: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      How many times do you expect this automation to trigger each month?
                    </p>
                  </div>
                )}

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Credits per scan</p>
                      <p className="text-lg font-semibold">{creditsPerScan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. triggers/month</p>
                      <p className="text-lg font-semibold">{estimatedTriggersPerMonth}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-muted-foreground text-sm">Estimated monthly budget</p>
                    <p className="text-2xl font-bold text-primary">
                      {estimatedMonthlyCredits} credits
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Actual credit usage depends on repository size and issues found.
                  See <Link href="/docs/pricing" className="text-primary hover:underline">pricing docs</Link> for details.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAutomation} disabled={creating}>
                {creating ? 'Creating...' : 'Create Automation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>💡</span> How Automations Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-semibold mb-1">1. Choose a Trigger</p>
              <p className="text-muted-foreground">
                Git push, PR, schedule, or webhook
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-semibold mb-1">2. Configure the Scan</p>
              <p className="text-muted-foreground">
                Select tools and quality gates
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-semibold mb-1">3. Connect Your Repo</p>
              <p className="text-muted-foreground">
                Add webhook or use our GitHub Action
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            See the{' '}
            <Link href="/docs/clever-automation" className="text-primary hover:underline">
              Clever Automation docs
            </Link>{' '}
            for detailed setup guides and examples.
          </p>
        </CardContent>
      </Card>

      {/* Automations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Automations</CardTitle>
          <CardDescription>
            Manage automations that trigger scans automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No automations configured yet. Create your first automation to start scanning
                automatically.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>Create Automation</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Monthly Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell className="font-medium">{automation.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{TRIGGER_ICONS[automation.trigger.type]}</span>
                        <span>{TRIGGER_LABELS[automation.trigger.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {automation.estimatedMonthlyCredits ? (
                        <div className="text-sm">
                          <span className="font-semibold text-primary">
                            {automation.estimatedMonthlyCredits}
                          </span>
                          <span className="text-muted-foreground"> credits</span>
                          <div className="text-xs text-muted-foreground">
                            {automation.creditsPerScan}/scan × {automation.estimatedTriggersPerMonth}/mo
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={() => handleToggleEnabled(automation)}
                        />
                        <Badge variant={automation.enabled ? 'default' : 'secondary'}>
                          {automation.enabled ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {automation.lastTriggeredAt
                        ? formatDistanceToNow(new Date(automation.lastTriggeredAt), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {automation.triggerCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {automation.webhookUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyWebhookUrl(automation.webhookUrl!)}
                          >
                            Copy URL
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Automation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{automation.name}&quot;? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAutomation(automation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup: GitHub Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The easiest way to get started. Add this workflow file to your repository:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# .github/workflows/bugrit.yml
name: Bugrit Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Bugrit Scan
        run: |
          curl -X POST https://bugrit.dev/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "projectId": "\${{ secrets.BUGRIT_PROJECT_ID }}",
              "platform": "web",
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "\${{ github.ref_name }}"
            }'`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Add <code className="px-1 bg-muted rounded">BUGRIT_API_KEY</code> and{' '}
            <code className="px-1 bg-muted rounded">BUGRIT_PROJECT_ID</code> to your repository
            secrets in Settings → Secrets and variables → Actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
