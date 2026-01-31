'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    type: '' as '' | 'web' | 'mobile' | 'desktop' | 'hybrid',
    targetUrl: '',
    packageId: '',
    bundleId: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchApplications();
    }
  }, [user, authLoading, router]);

  const fetchApplications = async () => {
    try {
      const res = await apiClient.get<{ applications: Application[] }>(user!, '/api/applications');
      if (res.ok && res.data) {
        setApplications(res.data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async () => {
    if (!newApp.name || !newApp.description || !newApp.type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await apiClient.post<{ application: Application }>(user!, '/api/applications', newApp);

      if (res.ok && res.data) {
        toast({
          title: 'Application Created',
          description: `${res.data.application.name} has been created successfully.`,
        });
        setCreateDialogOpen(false);
        // Redirect to get-started page to guide them through next steps
        router.push(`/applications/${res.data.application.id}/get-started`);
      } else {
        throw new Error(res.error || 'Failed to create application');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create application',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to delete "${appName}"? This will also delete all associated API keys.`)) {
      return;
    }

    try {
      const res = await apiClient.delete(user!, `/api/applications/${appId}`);

      if (res.ok) {
        toast({
          title: 'Application Deleted',
          description: `${appName} has been deleted.`,
        });
        setApplications(applications.filter((app) => app.id !== appId));
      } else {
        throw new Error(res.error || 'Failed to delete application');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete application.',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return '🌐';
      case 'mobile':
        return '📱';
      case 'desktop':
        return '🖥️';
      case 'hybrid':
        return '🔀';
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Applications</h1>
            <p className="text-sm text-muted-foreground">
              Manage your registered applications and their settings
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">New Application</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Application</DialogTitle>
                <DialogDescription>
                  Add a new application to start running code analysis scans.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    placeholder="My Application"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newApp.description}
                    onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                    placeholder="Brief description of your application"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={newApp.type || undefined}
                    onValueChange={(v) => setNewApp({ ...newApp, type: v as typeof newApp.type })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select application type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile">Mobile App (Capacitor)</SelectItem>
                      <SelectItem value="desktop">Desktop App (Tauri)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Web + Mobile + Desktop)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newApp.type === 'web' || newApp.type === 'hybrid') && (
                  <div className="space-y-2">
                    <Label htmlFor="targetUrl">Target URL</Label>
                    <Input
                      id="targetUrl"
                      value={newApp.targetUrl}
                      onChange={(e) => setNewApp({ ...newApp, targetUrl: e.target.value })}
                      placeholder="https://your-app.com"
                    />
                  </div>
                )}
                {(newApp.type === 'mobile' || newApp.type === 'hybrid') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="packageId">Android Package ID</Label>
                      <Input
                        id="packageId"
                        value={newApp.packageId}
                        onChange={(e) => setNewApp({ ...newApp, packageId: e.target.value })}
                        placeholder="com.example.app"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bundleId">iOS Bundle ID</Label>
                      <Input
                        id="bundleId"
                        value={newApp.bundleId}
                        onChange={(e) => setNewApp({ ...newApp, bundleId: e.target.value })}
                        placeholder="com.example.app"
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateApp} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Application'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No applications registered yet.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                Register Your First Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(app.type)}</span>
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {app.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {app.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {app.targetUrl && (
                      <p>URL: {app.targetUrl}</p>
                    )}
                    {app.platforms && app.platforms.length > 0 && (
                      <p>Platforms: {app.platforms.join(', ')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Link href={`/applications/${app.id}/get-started`} className="block">
                      <Button className="w-full">
                        Get Started
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Link href={`/applications/${app.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Manage
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteApp(app.id, app.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
