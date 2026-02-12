'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ArrowLeft,
  TestTube,
  Chrome,
  Smartphone,
  Monitor,
  Eye,
  Construction,
} from 'lucide-react';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { devConsole } from '@/lib/console';

export default function SetupTestPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && appId) {
      fetchApplication();
    }
  }, [user, authLoading, appId, router]);

  const fetchApplication = async () => {
    try {
      const res = await apiClient.get<{ application: Application }>(
        user!,
        `/api/applications/${appId}`
      );
      if (res.ok && res.data) {
        setApplication(res.data.application);
      }
    } catch (error) {
      devConsole.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-8 max-w-3xl">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/applications/${appId}/get-started`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <TestTube className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Cross-Platform Testing</h1>
          <p className="text-muted-foreground text-lg">
            Make sure {application?.name || 'your app'} works everywhere
          </p>
        </div>

        {/* Coming Soon */}
        <Card className="mb-8 border-dashed">
          <CardContent className="py-12 text-center">
            <Construction className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Cross-platform testing is currently in development. For now, you can use our
              <strong> Code Scanning</strong> feature to find security issues, bugs, and
              improvements in your code.
            </p>
          </CardContent>
        </Card>

        {/* What's Coming */}
        <Card>
          <CardHeader>
            <CardTitle>What you&apos;ll be able to test</CardTitle>
            <CardDescription>
              Automated testing across all platforms and devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <Chrome className="w-6 h-6 mb-2 text-blue-500" />
                <h4 className="font-medium mb-1">Web Browsers</h4>
                <p className="text-sm text-muted-foreground">
                  Chrome, Firefox, Safari, Edge - all versions
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <Smartphone className="w-6 h-6 mb-2 text-green-500" />
                <h4 className="font-medium mb-1">Mobile Devices</h4>
                <p className="text-sm text-muted-foreground">
                  iPhone, iPad, Android phones and tablets
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <Monitor className="w-6 h-6 mb-2 text-purple-500" />
                <h4 className="font-medium mb-1">Desktop Platforms</h4>
                <p className="text-sm text-muted-foreground">
                  Windows, macOS, Linux native apps
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <Eye className="w-6 h-6 mb-2 text-orange-500" />
                <h4 className="font-medium mb-1">Accessibility</h4>
                <p className="text-sm text-muted-foreground">
                  Screen readers, keyboard navigation, WCAG
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternative CTA */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            In the meantime, scan your code for issues
          </p>
          <Button
            onClick={() => router.push(`/applications/${appId}/setup-scan`)}
          >
            Try Code Scanning Instead
          </Button>
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
}
