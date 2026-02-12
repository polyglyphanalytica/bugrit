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
import { Loader2, ArrowRight, Shield, TestTube, Check } from 'lucide-react';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { devConsole } from '@/lib/console';

type Journey = 'scan' | 'test' | null;

export default function GetStartedPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<Journey>(null);

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

  const getAppTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return '🌐';
      case 'mobile': return '📱';
      case 'desktop': return '💻';
      case 'hybrid': return '🔄';
      default: return '📦';
    }
  };

  const handleContinue = () => {
    if (selectedJourney === 'scan') {
      router.push(`/applications/${appId}/setup-scan`);
    } else if (selectedJourney === 'test') {
      router.push(`/applications/${appId}/setup-test`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Application not found</p>
            <Button asChild className="mt-4">
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-8 max-w-4xl">
        {/* App Info Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2 mb-4">
            <span className="text-2xl">{getAppTypeIcon(application.type)}</span>
            <span className="font-medium">{application.name}</span>
            <Badge variant="secondary">{application.type}</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">What would you like to do?</h1>
          <p className="text-muted-foreground text-lg">
            Choose how Bugrit can help you improve {application.name}
          </p>
        </div>

        {/* Journey Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Scanning Journey */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedJourney === 'scan'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedJourney('scan')}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Code Scanning</CardTitle>
              <CardDescription>
                Find security issues, bugs, and improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Security vulnerabilities</strong> - Find issues before hackers do</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Code quality</strong> - Catch bugs, typos, and bad practices</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Dependencies</strong> - Check for outdated or risky packages</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>150+ tools</strong> - Industry-standard security scanners</span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-sm text-orange-800">
                  <strong>Best for:</strong> Finding problems in your code before they reach users
                </p>
              </div>

              {selectedJourney === 'scan' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary font-medium">
                  <Check className="w-5 h-5" />
                  Selected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Testing Journey */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedJourney === 'test'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedJourney('test')}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <TestTube className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Testing</CardTitle>
              <CardDescription>
                Make sure your app works everywhere
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Cross-browser</strong> - Chrome, Firefox, Safari, Edge</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Mobile devices</strong> - iPhone, Android phones & tablets</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Desktop platforms</strong> - Windows, Mac, Linux</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Accessibility</strong> - Screen readers and keyboard navigation</span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Best for:</strong> Making sure your app works for all your users
                </p>
              </div>

              {selectedJourney === 'test' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary font-medium">
                  <Check className="w-5 h-5" />
                  Selected
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedJourney}
            className="min-w-[200px]"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Not sure hint */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Not sure? <strong>Code Scanning</strong> is the most popular choice.
          Sensei will recommend the right tools for your stack automatically.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Or skip this and <Link href="/scans/new" className="text-orange-500 hover:underline">scan a repo directly</Link> &mdash; no app registration needed.
        </p>
      </main>
      <DashboardFooter />
    </div>
  );
}
