'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  AlertCircle,
  Shield,
  Package,
  Zap,
  Eye,
  FileCode,
  Info,
  Sparkles,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Application } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface RepoAnalysis {
  name: string;
  description?: string;
  type: string;
  techStack: string[];
  languages: string[];
  hasPackageJson: boolean;
}

interface ModuleRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  reason: string;
  priority: 'critical' | 'recommended' | 'optional';
  credits: number;
}

interface CoverageAdvice {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  suggestions: string[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  security: <Shield className="w-4 h-4" />,
  dependencies: <Package className="w-4 h-4" />,
  quality: <Sparkles className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  accessibility: <Eye className="w-4 h-4" />,
  linting: <FileCode className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  security: 'Security',
  dependencies: 'Dependencies',
  quality: 'Code Quality',
  performance: 'Performance',
  accessibility: 'Accessibility',
  linting: 'Linting',
  documentation: 'Documentation',
  'api-security': 'API Security',
  'cloud-native': 'Cloud Native',
  mobile: 'Mobile',
  git: 'Git',
  container: 'Container Security',
  sbom: 'SBOM & Supply Chain',
};

function ConfigureScanInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const appId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // URL params
  const source = searchParams.get('source') as 'github' | 'upload' | null;
  const repoUrl = searchParams.get('url');
  const branch = searchParams.get('branch') || 'main';
  const uploadId = searchParams.get('uploadId');

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);

  // Analysis results
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ModuleRecommendation[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  // Credits
  const [creditBalance, setCreditBalance] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['security', 'dependencies']));

  // Scan mode: incremental (default) or full
  const [scanMode, setScanMode] = useState<'incremental' | 'full'>('incremental');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && appId) {
      fetchApplication();
      fetchCredits();
      analyzeCode();
    }
  }, [user, authLoading, appId]);

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
      console.error('Failed to fetch application:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/billing/credits', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance || 0);
      }
    } catch {
      // Ignore
    }
  };

  const analyzeCode = async () => {
    if (!source) {
      toast({
        title: 'Missing source',
        description: 'Please go back and select how to provide your code',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);

    try {
      const idToken = await user!.getIdToken();

      const body: Record<string, string> = { applicationId: appId };

      if (source === 'github' && repoUrl) {
        body.repoUrl = repoUrl;
        body.branch = branch;
      } else if (source === 'upload' && uploadId) {
        body.uploadId = uploadId;
      }

      const res = await fetch('/api/scans/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze code');
      }

      const data = await res.json();
      setRepoAnalysis(data.analysis);
      setRecommendations(data.recommendations || []);

      // Pre-select critical and recommended modules
      const preSelected = new Set<string>(
        (data.recommendations || [])
          .filter((r: ModuleRecommendation) => r.priority !== 'optional')
          .map((r: ModuleRecommendation) => r.id)
      );
      setSelectedModules(preSelected);
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
      router.push(`/applications/${appId}/setup-scan`);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
    }
    setSelectedModules(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllInCategory = (category: string) => {
    const categoryModules = recommendations.filter(r => r.category === category);
    const newSelected = new Set(selectedModules);
    categoryModules.forEach(m => newSelected.add(m.id));
    setSelectedModules(newSelected);
  };

  const deselectAllInCategory = (category: string) => {
    const categoryModules = recommendations.filter(r => r.category === category);
    const newSelected = new Set(selectedModules);
    categoryModules.forEach(m => newSelected.delete(m.id));
    setSelectedModules(newSelected);
  };

  // Calculate totals and coverage
  const totalCredits = recommendations
    .filter(r => selectedModules.has(r.id))
    .reduce((sum, r) => sum + r.credits, 0);

  const hasEnoughCredits = creditBalance >= totalCredits;

  const getCoverageAdvice = (): CoverageAdvice => {
    const selected = recommendations.filter(r => selectedModules.has(r.id));
    const criticalSelected = selected.filter(r => r.priority === 'critical').length;
    const criticalTotal = recommendations.filter(r => r.priority === 'critical').length;
    const categories = new Set(selected.map(r => r.category));

    if (criticalSelected === criticalTotal && categories.size >= 3) {
      return {
        level: 'excellent',
        message: 'Excellent coverage! All critical checks included.',
        suggestions: [],
      };
    }

    if (criticalSelected === criticalTotal) {
      return {
        level: 'good',
        message: 'Good coverage with all critical checks.',
        suggestions: ['Consider adding more categories for comprehensive scanning'],
      };
    }

    if (criticalSelected > 0) {
      const missingSuggestions = recommendations
        .filter(r => r.priority === 'critical' && !selectedModules.has(r.id))
        .map(r => `Add ${r.name} for ${r.reason.toLowerCase()}`);
      return {
        level: 'fair',
        message: 'Fair coverage, but some critical checks are missing.',
        suggestions: missingSuggestions.slice(0, 2),
      };
    }

    return {
      level: 'poor',
      message: 'Low coverage. Consider adding critical security checks.',
      suggestions: ['Add at least the Critical modules for basic protection'],
    };
  };

  const coverage = getCoverageAdvice();

  const handleStartScan = async () => {
    if (selectedModules.size === 0) {
      toast({
        title: 'No modules selected',
        description: 'Please select at least one module to scan',
        variant: 'destructive',
      });
      return;
    }

    if (!hasEnoughCredits) {
      toast({
        title: 'Insufficient credits',
        description: `You need ${totalCredits} credits but only have ${creditBalance}`,
        variant: 'destructive',
      });
      return;
    }

    setStarting(true);

    try {
      const idToken = await user!.getIdToken();

      const body: Record<string, unknown> = {
        applicationId: appId,
        selectedModules: Array.from(selectedModules),
        scanMode,
      };

      if (source === 'github' && repoUrl) {
        body.sourceType = 'github';
        body.repoUrl = repoUrl;
        body.branch = branch;
      } else if (source === 'upload' && uploadId) {
        body.sourceType = 'upload';
        body.uploadId = uploadId;
      }

      // For incremental scans, estimate fewer lines (cost savings)
      if (scanMode === 'incremental') {
        body.estimatedLines = 1000; // Default for incremental
      }

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start scan');
      }

      const data = await res.json();

      toast({
        title: 'Scan started!',
        description: 'Your code is being analyzed. This usually takes less than 2 minutes.',
      });

      router.push(`/scans/${data.scan.id}`);
    } catch (error) {
      toast({
        title: 'Failed to start scan',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  // Group recommendations by category
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) {
      acc[rec.category] = [];
    }
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, ModuleRecommendation[]>);

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedRecommendations).sort((a, b) => {
    const priorityOrder = ['security', 'dependencies', 'quality', 'linting', 'accessibility', 'performance'];
    return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'recommended': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCoverageColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getCoverageIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <Check className="w-5 h-5" />;
      case 'good': return <Check className="w-5 h-5" />;
      case 'fair': return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (authLoading || loading || analyzing) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">
              {analyzing ? 'Analyzing your code...' : 'Loading...'}
            </p>
            {analyzing && (
              <p className="text-sm text-muted-foreground mt-1">
                Detecting tech stack and recommending security modules
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/applications/${appId}/setup-scan`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configure your scan</h1>
          <p className="text-muted-foreground">
            We analyzed your code and recommend these checks
          </p>
        </div>

        {/* Scan Mode Selector */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium mb-1">Scan Mode</p>
                <p className="text-sm text-muted-foreground">
                  {scanMode === 'incremental'
                    ? 'Only scan changed files — fast and cheap (1-2 credits)'
                    : 'Scan entire repository — comprehensive but uses more credits'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={scanMode === 'incremental' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScanMode('incremental')}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Incremental
                  <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                </Button>
                <Button
                  variant={scanMode === 'full' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScanMode('full')}
                  className="flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Full Scan
                </Button>
              </div>
            </div>
            {scanMode === 'incremental' && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Smart default:</span>
                  <span>Uses ~80% fewer credits by scanning only what changed</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tech Stack Summary */}
        {repoAnalysis && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Detected:</span>
                {repoAnalysis.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coverage Advisor */}
        <Card className={cn('mb-6 border', getCoverageColor(coverage.level))}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-full', getCoverageColor(coverage.level))}>
                {getCoverageIcon(coverage.level)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{coverage.message}</p>
                {coverage.suggestions.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {coverage.suggestions.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-muted-foreground">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedModules.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Selection by Category */}
        <div className="space-y-4 mb-8">
          {sortedCategories.map((category) => {
            const modules = groupedRecommendations[category];
            const selectedInCategory = modules.filter(m => selectedModules.has(m.id)).length;
            const isExpanded = expandedCategories.has(category);
            const categoryCredits = modules
              .filter(m => selectedModules.has(m.id))
              .reduce((sum, m) => sum + m.credits, 0);

            return (
              <Card key={category}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {CATEGORY_ICONS[category] || <FileCode className="w-4 h-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {CATEGORY_LABELS[category] || category}
                        </CardTitle>
                        <CardDescription>
                          {selectedInCategory} of {modules.length} selected
                          {categoryCredits > 0 && ` • ${categoryCredits} credits`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {modules.some(m => m.priority === 'critical') && (
                        <Badge variant="destructive" className="text-xs">
                          Has Critical
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* Select/Deselect All */}
                    <div className="flex gap-2 mb-4 pb-4 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInCategory(category);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deselectAllInCategory(category);
                        }}
                      >
                        Deselect All
                      </Button>
                    </div>

                    {/* Modules */}
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <div
                          key={module.id}
                          onClick={() => toggleModule(module.id)}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-all',
                            selectedModules.has(module.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0',
                              selectedModules.has(module.id)
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground'
                            )}>
                              {selectedModules.has(module.id) && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{module.name}</span>
                                <Badge className={cn('text-xs', getPriorityColor(module.priority))}>
                                  {module.priority}
                                </Badge>
                                {module.credits > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {module.credits} credit{module.credits !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {module.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-background border-t py-4 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold flex items-center gap-1">
                    <CreditCard className="w-4 h-4" />
                    {totalCredits} credits
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className={cn(
                    'text-xl font-bold',
                    hasEnoughCredits ? 'text-green-600' : 'text-red-600'
                  )}>
                    {creditBalance} credits
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!hasEnoughCredits && (
                  <Button variant="outline" asChild>
                    <Link href="/settings/subscription">
                      Add Credits
                    </Link>
                  </Button>
                )}
                <Button
                  size="lg"
                  onClick={handleStartScan}
                  disabled={starting || selectedModules.size === 0 || !hasEnoughCredits}
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Start Scan
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
}

export default function ConfigureScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ConfigureScanInner />
    </Suspense>
  );
}
