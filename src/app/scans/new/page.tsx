'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardFooter } from '@/components/dashboard-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Github,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Zap,
  Shield,
  Eye,
  Bug,
  CreditCard,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GitHubConnection {
  connected: boolean;
  connection?: {
    githubUsername: string;
    githubAvatarUrl?: string;
  };
}

interface RepoAnalysis {
  name: string;
  description?: string;
  type: 'web' | 'mobile' | 'desktop' | 'hybrid' | 'library';
  techStack: string[];
  hasPackageJson: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  estimatedLines?: number;
}

interface ModuleRecommendation {
  id: string;
  name: string;
  category: string;
  reason: string;
  priority: 'critical' | 'recommended' | 'optional';
}

interface CreditEstimate {
  modules: number;
  baseCredits: number;
  estimatedTotal: number;
  currentBalance: number;
  sufficient: boolean;
  shortfall: number;
}

type FlowStep = 'input' | 'analyzing' | 'recommendations' | 'scanning';

// Inner component that uses useSearchParams
function NewScanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Flow state
  const [step, setStep] = useState<FlowStep>('input');
  const [inputValue, setInputValue] = useState('');
  const [branch, setBranch] = useState('main');
  const [showBranchInput, setShowBranchInput] = useState(false);

  // GitHub connection
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  // Analysis results
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ModuleRecommendation[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [creditEstimate, setCreditEstimate] = useState<CreditEstimate | null>(null);

  // UI state
  const [analyzing, setAnalyzing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for GitHub OAuth return
  useEffect(() => {
    const success = searchParams.get('success');
    const username = searchParams.get('username');
    if (success === 'github_connected' && username) {
      toast({
        title: 'GitHub Connected',
        description: `Connected as @${username}. You can now scan private repositories.`,
      });
      // Refresh connection status
      checkGitHubConnection();
    }
  }, [searchParams]);

  // Check GitHub connection on mount
  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      if (res.ok) {
        const data = await res.json();
        setGithubConnection(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingConnection(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/scans/new');
    }
  }, [user, authLoading, router]);

  const handleConnectGitHub = () => {
    const returnUrl = encodeURIComponent('/scans/new');
    window.location.href = `/api/auth/github?returnUrl=${returnUrl}`;
  };

  const detectSourceType = (input: string): 'github' | 'url' | null => {
    if (!input.trim()) return null;
    if (input.includes('github.com/') || input.match(/^[\w-]+\/[\w.-]+$/)) {
      return 'github';
    }
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return 'url';
    }
    return null;
  };

  const sourceType = detectSourceType(inputValue);

  const handleAnalyze = async () => {
    if (!inputValue.trim() || !user) return;

    setError(null);
    setAnalyzing(true);
    setStep('analyzing');

    try {
      // Normalize GitHub URL
      let repoUrl = inputValue.trim();
      if (!repoUrl.startsWith('http')) {
        repoUrl = `https://github.com/${repoUrl}`;
      }

      const idToken = await user.getIdToken();

      // Call analyze endpoint
      const res = await fetch('/api/scans/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          repoUrl,
          branch,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze repository');
      }

      const data = await res.json();
      setRepoAnalysis(data.analysis);
      setRecommendations(data.recommendations || []);
      setCreditEstimate(data.creditEstimate);

      // Pre-select critical and recommended modules
      const preSelected = new Set<string>(
        (data.recommendations || [])
          .filter((r: ModuleRecommendation) => r.priority !== 'optional')
          .map((r: ModuleRecommendation) => r.id)
      );
      setSelectedModules(preSelected);

      setStep('recommendations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze repository');
      setStep('input');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartScan = async () => {
    if (!user || !repoAnalysis) return;

    setScanning(true);
    setStep('scanning');

    try {
      let repoUrl = inputValue.trim();
      if (!repoUrl.startsWith('http')) {
        repoUrl = `https://github.com/${repoUrl}`;
      }

      const idToken = await user.getIdToken();

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sourceType: 'github',
          repoUrl,
          branch,
          // Auto-create application from analysis
          autoCreateApp: true,
          appName: repoAnalysis.name,
          appType: repoAnalysis.type,
          selectedModules: Array.from(selectedModules),
        }),
      });

      if (!res.ok) {
        const data = await res.json();

        // Handle insufficient credits
        if (res.status === 402) {
          setError(`Insufficient credits. You need ${data.required} credits but have ${data.available}.`);
          setStep('recommendations');
          return;
        }

        throw new Error(data.error || 'Failed to start scan');
      }

      const data = await res.json();

      toast({
        title: 'Scan Started',
        description: 'Your code is being analyzed. This usually takes less than 2 minutes.',
      });

      // Redirect to scan results page
      router.push(`/scans/${data.scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setStep('recommendations');
    } finally {
      setScanning(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'recommended':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />
      <main className="flex-1 mx-auto w-full px-4 md:px-6 lg:px-8 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Scan Your Code</h1>
          <p className="text-muted-foreground">
            Paste a GitHub URL and we'll analyze it with 150+ security modules
          </p>
        </div>

        {/* Progress indicator with labels */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: 'input', label: 'Paste URL' },
            { key: 'analyzing', label: 'Analyzing' },
            { key: 'recommendations', label: 'Review' },
            { key: 'scanning', label: 'Scanning' },
          ].map(({ key: s, label }, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : ['input'].indexOf(step) < i
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-green-500 text-white'
                  )}
                >
                  {['input', 'analyzing'].indexOf(step) < i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  step === s ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mb-5',
                    ['input', 'analyzing', 'recommendations'].indexOf(step) > i
                      ? 'bg-green-500'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* GitHub Connection Status */}
              {!loadingConnection && (
                <div className={cn(
                  'p-4 rounded-lg border',
                  githubConnection?.connected
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-muted/50 border-border'
                )}>
                  {githubConnection?.connected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>
                          Connected as <strong>@{githubConnection.connection?.githubUsername}</strong>
                        </span>
                      </div>
                      <Badge variant="secondary">Private repos enabled</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Github className="w-5 h-5" />
                        <span className="text-muted-foreground">
                          Connect GitHub to scan private repositories
                        </span>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleConnectGitHub}>
                        Connect GitHub
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="github.com/username/repo or username/repo"
                    className="pl-10 h-14 text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && sourceType === 'github' && handleAnalyze()}
                  />
                </div>

                {/* Branch input toggle */}
                {sourceType === 'github' && (
                  <button
                    onClick={() => setShowBranchInput(!showBranchInput)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {showBranchInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showBranchInput ? 'Hide branch' : 'Change branch'}
                  </button>
                )}

                {showBranchInput && (
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="max-w-[200px]"
                  />
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Analyze button */}
              <Button
                onClick={handleAnalyze}
                disabled={!inputValue.trim() || sourceType !== 'github'}
                className="w-full h-12 text-lg"
              >
                Analyze Repository
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {/* Or upload */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <label className="block">
                <input type="file" accept=".zip" className="hidden" />
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload ZIP file
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Analyzing Repository</h3>
              <p className="text-muted-foreground">
                Detecting tech stack and recommending security modules...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Recommendations */}
        {step === 'recommendations' && repoAnalysis && (
          <div className="space-y-6">
            {/* Repo info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Github className="w-5 h-5" />
                      {repoAnalysis.name}
                    </CardTitle>
                    <CardDescription>
                      {repoAnalysis.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{repoAnalysis.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {repoAnalysis.techStack.map((tech) => (
                    <Badge key={tech} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Credit check */}
            {creditEstimate && (
              <Card className={cn(
                creditEstimate.sufficient
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              )}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className={cn(
                        'w-5 h-5',
                        creditEstimate.sufficient ? 'text-green-600' : 'text-red-600'
                      )} />
                      <div>
                        <p className="font-medium">
                          {creditEstimate.sufficient ? 'Ready to scan' : 'Insufficient credits'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Estimated: {creditEstimate.estimatedTotal} credits
                          {' '}|{' '}
                          Balance: {creditEstimate.currentBalance} credits
                        </p>
                      </div>
                    </div>
                    {!creditEstimate.sufficient && (
                      <Link href="/settings/subscription">
                        <Button size="sm">
                          Add {creditEstimate.shortfall} Credits
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Module recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Recommended Modules
                </CardTitle>
                <CardDescription>
                  Based on your tech stack, we recommend these security checks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Loading recommendations...
                  </p>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => toggleModule(rec.id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        selectedModules.has(rec.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center mt-0.5',
                            selectedModules.has(rec.id)
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          )}>
                            {selectedModules.has(rec.id) && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="font-medium">{rec.name}</p>
                            <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-4 text-center text-sm text-muted-foreground">
                  {selectedModules.size} of {recommendations.length} modules selected
                </div>
              </CardContent>
            </Card>

            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input');
                  setError(null);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartScan}
                disabled={selectedModules.size === 0 || scanning || (creditEstimate !== null && !creditEstimate.sufficient)}
                className="flex-1"
              >
                {scanning ? (
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
        )}

        {/* Step 4: Scanning */}
        {step === 'scanning' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Starting Scan</h3>
              <p className="text-muted-foreground">
                Initializing {selectedModules.size} security modules...
              </p>
            </CardContent>
          </Card>
        )}

        {/* What gets checked */}
        {step === 'input' && (
          <div className="mt-8">
            <h3 className="text-center text-sm font-medium text-muted-foreground mb-4">
              WHAT WE CHECK
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Shield, label: 'Security Vulnerabilities', color: 'text-red-500' },
                { icon: Bug, label: 'Code Quality Issues', color: 'text-orange-500' },
                { icon: Eye, label: 'Accessibility', color: 'text-purple-500' },
                { icon: Zap, label: 'Performance', color: 'text-blue-500' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="text-center p-4 rounded-lg bg-muted/30">
                  <Icon className={cn('w-6 h-6 mx-auto mb-2', color)} />
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}

// Wrapper with Suspense boundary for useSearchParams
export default function NewScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewScanPageInner />
    </Suspense>
  );
}
