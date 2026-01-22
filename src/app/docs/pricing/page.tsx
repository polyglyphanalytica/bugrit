'use client';

import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calculator, Check, ArrowRight, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING CONFIGURATION - Updated for sustainable margins (Jan 2026)
// ═══════════════════════════════════════════════════════════════════════════════

const tiers = {
  free: {
    name: 'Free',
    price: 0,
    credits: 5,
    creditsRollover: 0,
    overageRate: null,
    maxRepoSize: 10_000,
    projects: 1,
    teamMembers: 1,
    historyDays: 7,
  },
  solo: {
    name: 'Solo',
    price: 19,
    credits: 50,
    creditsRollover: 0,
    overageRate: 0.40,
    maxRepoSize: 50_000,
    projects: 3,
    teamMembers: 1,
    historyDays: 14,
  },
  scale: {
    name: 'Scale',
    price: 49,
    credits: 200,
    creditsRollover: 100,
    overageRate: 0.30,
    maxRepoSize: 150_000,
    projects: 10,
    teamMembers: 3,
    historyDays: 30,
  },
  business: {
    name: 'Business',
    price: 99,
    credits: 500,
    creditsRollover: 250,
    overageRate: 0.20,
    maxRepoSize: 500_000,
    projects: -1, // unlimited
    teamMembers: 10,
    historyDays: 90,
  },
};

// Credit costs - matches src/lib/billing/credits.ts
const creditCosts = {
  baseScan: 1,
  per10kLines: 1,
  security: 1,
  accessibility: 4,  // Puppeteer-based, higher infrastructure cost
  performance: 5,    // Lighthouse + Puppeteer, highest infrastructure cost
  aiSummary: 1,
  aiExplanationsPerIssue: 0.1,  // Per-issue pricing
  aiFixSuggestionsPerIssue: 0.15,  // Per-issue pricing
  aiPriorityScoring: 1,
};

export default function PricingDocs() {
  // Calculator state
  const [scansPerMonth, setScansPerMonth] = useState(10);
  const [avgLinesOfCode, setAvgLinesOfCode] = useState(25000);
  const [avgIssuesPerScan, setAvgIssuesPerScan] = useState(50);
  const [useSecurity, setUseSecurity] = useState(true);
  const [useAccessibility, setUseAccessibility] = useState(false);
  const [usePerformance, setUsePerformance] = useState(false);
  const [useAiSummary, setUseAiSummary] = useState(true);
  const [useAiExplanations, setUseAiExplanations] = useState(false);
  const [useAiFixSuggestions, setUseAiFixSuggestions] = useState(false);
  const [projectCount, setProjectCount] = useState(3);
  const [teamSize, setTeamSize] = useState(2);

  // Calculate credits per scan
  const creditsPerScan = useMemo(() => {
    let credits = creditCosts.baseScan;
    credits += Math.ceil(avgLinesOfCode / 10000) * creditCosts.per10kLines;
    if (useSecurity) credits += creditCosts.security;
    if (useAccessibility) credits += creditCosts.accessibility;
    if (usePerformance) credits += creditCosts.performance;
    if (useAiSummary) credits += creditCosts.aiSummary;
    if (useAiExplanations) credits += Math.ceil(avgIssuesPerScan * creditCosts.aiExplanationsPerIssue);
    if (useAiFixSuggestions) credits += Math.ceil(avgIssuesPerScan * creditCosts.aiFixSuggestionsPerIssue);
    return Math.ceil(credits);
  }, [avgLinesOfCode, avgIssuesPerScan, useSecurity, useAccessibility, usePerformance, useAiSummary, useAiExplanations, useAiFixSuggestions]);

  // Calculate total monthly credits needed
  const monthlyCreditsNeeded = creditsPerScan * scansPerMonth;

  // Find recommended tier
  const recommendedTier = useMemo(() => {
    // Check resource requirements first
    const meetsResourceReqs = (tier: { projects: number; teamMembers: number }) => {
      if (tier.projects !== -1 && projectCount > tier.projects) return false;
      if (tier.teamMembers !== -1 && teamSize > tier.teamMembers) return false;
      return true;
    };

    // Calculate total cost for each tier
    const calculateTotalCost = (tierKey: keyof typeof tiers) => {
      const tier = tiers[tierKey];
      if (!meetsResourceReqs(tier)) return Infinity;

      const basePrice = tier.price;
      const creditsIncluded = tier.credits + tier.creditsRollover;
      const creditsNeeded = monthlyCreditsNeeded;

      if (creditsNeeded <= creditsIncluded) {
        return basePrice;
      }

      if (!tier.overageRate) {
        return Infinity; // Free tier can't handle overage
      }

      const overageCredits = creditsNeeded - creditsIncluded;
      return basePrice + (overageCredits * tier.overageRate);
    };

    const costs = {
      free: calculateTotalCost('free'),
      solo: calculateTotalCost('solo'),
      scale: calculateTotalCost('scale'),
      business: calculateTotalCost('business'),
    };

    // Find cheapest option
    let best: keyof typeof tiers = 'free';
    let bestCost = costs.free;

    for (const [key, cost] of Object.entries(costs)) {
      if (cost < bestCost) {
        bestCost = cost;
        best = key as keyof typeof tiers;
      }
    }

    return { tier: best, cost: bestCost, costs };
  }, [monthlyCreditsNeeded, projectCount, teamSize]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Pricing & Credit System</h1>
        <p className="text-lg text-muted-foreground">
          A comprehensive guide to Bugrit pricing: how credits work, what each tier includes, and how to estimate your costs accurately.
        </p>
      </div>

      {/* Why Credit-Based Pricing */}
      <section className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Why Credit-Based Pricing?
        </h2>
        <p className="text-muted-foreground mb-4">
          Credit-based pricing aligns what you pay with what you use. Unlike flat-rate plans that charge the same whether you scan once or 100 times, credits give you:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-background/50 rounded-lg">
            <h4 className="font-semibold mb-2">Transparency</h4>
            <p className="text-sm text-muted-foreground">See the exact cost before every scan. No surprise bills.</p>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <h4 className="font-semibold mb-2">Control</h4>
            <p className="text-sm text-muted-foreground">Toggle expensive features on/off based on your needs.</p>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <h4 className="font-semibold mb-2">Scalability</h4>
            <p className="text-sm text-muted-foreground">Start free, upgrade as you grow, buy top-ups for burst usage.</p>
          </div>
          <div className="p-4 bg-background/50 rounded-lg">
            <h4 className="font-semibold mb-2">Fairness</h4>
            <p className="text-sm text-muted-foreground">Small repos pay less than large monorepos. Makes sense.</p>
          </div>
        </div>
      </section>

      {/* Credit Calculation Formula */}
      <section>
        <h2 className="text-2xl font-bold mb-4">How Credits Are Calculated</h2>
        <p className="text-muted-foreground mb-6">
          Each scan consumes credits based on a simple formula. The cost depends on your codebase size, the tools you run, and AI features you enable.
        </p>

        <GlassCard className="p-6 mb-6">
          <div className="font-mono text-sm space-y-2">
            <div className="text-primary font-semibold text-lg mb-4">
              Total Credits = Base + Lines + Tool Categories + AI Features
            </div>
            <div className="pl-4 space-y-2 text-muted-foreground">
              <div><span className="text-foreground font-medium">Base:</span> 1 credit (every scan)</div>
              <div><span className="text-foreground font-medium">Lines:</span> 1 credit per 10,000 lines of code</div>
              <div><span className="text-foreground font-medium">Tools:</span> 0-5 credits depending on tool category</div>
              <div><span className="text-foreground font-medium">AI:</span> 1-2 credits flat + per-issue costs for detailed features</div>
            </div>
          </div>
        </GlassCard>

        {/* Base and Lines */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Base Costs</CardTitle>
              <CardDescription>Applied to every scan</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Base scan cost</td>
                    <td className="text-right font-mono font-semibold">1 credit</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Per 10,000 lines of code</td>
                    <td className="text-right font-mono font-semibold">1 credit</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-4">
                Example: A 45,000 line repo = 1 base + 5 lines = 6 credits minimum
              </p>
            </CardContent>
          </Card>

          {/* Why Lines Matter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why Lines of Code?</CardTitle>
              <CardDescription>Fair pricing for different project sizes</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                Larger codebases take longer to scan and consume more compute resources.
                Charging per 10K lines ensures:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Small side projects pay minimal amounts</li>
                <li>Large enterprise repos pay proportionally more</li>
                <li>You&apos;re not subsidizing someone else&apos;s monorepo</li>
              </ul>
              <p className="pt-2">
                <strong>Pro tip:</strong> Use <code>.bugritignore</code> to exclude <code>node_modules</code>,
                <code>dist</code>, and generated files from line counts.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tool Categories */}
        <h3 className="text-xl font-bold mb-4">Tool Category Costs</h3>
        <p className="text-muted-foreground mb-4">
          Different tool categories have different infrastructure costs. Linting runs quickly in memory,
          but Lighthouse needs a full headless browser, and Docker-based tools have container overhead.
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-left py-3 px-2">Tools Included</th>
                <th className="text-center py-3 px-2">Credits</th>
                <th className="text-left py-3 px-2">Why This Cost?</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">📝 Linting & Formatting</td>
                <td className="py-3 px-2 text-muted-foreground">ESLint, Biome, Stylelint, Prettier</td>
                <td className="text-center py-3 px-2 text-green-400 font-mono">Free</td>
                <td className="py-3 px-2 text-muted-foreground">Fast, low memory, runs in Node.js</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">📦 Dependencies</td>
                <td className="py-3 px-2 text-muted-foreground">depcheck, madge (+ OSV, pip-audit, cargo-audit)</td>
                <td className="text-center py-3 px-2 font-mono">0-1 credit</td>
                <td className="py-3 px-2 text-muted-foreground">Some tools use Docker for multi-language support</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">✨ Code Quality</td>
                <td className="py-3 px-2 text-muted-foreground">TypeScript, knip, jscpd, cspell, PHPStan, RuboCop</td>
                <td className="text-center py-3 px-2 font-mono">0-3 credits</td>
                <td className="py-3 px-2 text-muted-foreground">JS tools free; Docker-based tools cost more</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">📚 Documentation</td>
                <td className="py-3 px-2 text-muted-foreground">markdownlint, remark-lint, alex</td>
                <td className="text-center py-3 px-2 text-green-400 font-mono">Free</td>
                <td className="py-3 px-2 text-muted-foreground">Text analysis, very fast</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">🔀 Git</td>
                <td className="py-3 px-2 text-muted-foreground">commitlint</td>
                <td className="text-center py-3 px-2 text-green-400 font-mono">Free</td>
                <td className="py-3 px-2 text-muted-foreground">Checks git history only</td>
              </tr>
              <tr className="border-b border-border/50 bg-yellow-500/5">
                <td className="py-3 px-2 font-medium">🔒 Security</td>
                <td className="py-3 px-2 text-muted-foreground">Semgrep, Trivy, Nuclei, Bandit, Gosec, Gitleaks, etc.</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">1-5 credits</td>
                <td className="py-3 px-2 text-muted-foreground">DAST tools (OWASP ZAP) cost more than SAST</td>
              </tr>
              <tr className="border-b border-border/50 bg-orange-500/5">
                <td className="py-3 px-2 font-medium">♿ Accessibility</td>
                <td className="py-3 px-2 text-muted-foreground">axe-core, Pa11y</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">4 credits</td>
                <td className="py-3 px-2 text-muted-foreground">Requires Puppeteer headless browser</td>
              </tr>
              <tr className="border-b border-border/50 bg-red-500/5">
                <td className="py-3 px-2 font-medium">⚡ Performance</td>
                <td className="py-3 px-2 text-muted-foreground">Lighthouse, size-limit</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">1-5 credits</td>
                <td className="py-3 px-2 text-muted-foreground">Full browser render, network simulation</td>
              </tr>
              <tr className="border-b border-border/50 bg-purple-500/5">
                <td className="py-3 px-2 font-medium">📱 Mobile Security</td>
                <td className="py-3 px-2 text-muted-foreground">MobSF, APKLeaks, Androguard, SwiftLint</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">1-5 credits</td>
                <td className="py-3 px-2 text-muted-foreground">APK/IPA analysis requires specialized containers</td>
              </tr>
              <tr className="border-b border-border/50 bg-blue-500/5">
                <td className="py-3 px-2 font-medium">🔌 API Security</td>
                <td className="py-3 px-2 text-muted-foreground">Spectral, Dredd, GraphQL Cop, Schemathesis</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">1-3 credits</td>
                <td className="py-3 px-2 text-muted-foreground">API contract validation and security testing</td>
              </tr>
              <tr className="border-b border-border/50 bg-cyan-500/5">
                <td className="py-3 px-2 font-medium">☁️ Cloud Native</td>
                <td className="py-3 px-2 text-muted-foreground">Kubesec, Kube-bench, Polaris, Terrascan, Kube-hunter</td>
                <td className="text-center py-3 px-2 font-mono font-semibold">1-3 credits</td>
                <td className="py-3 px-2 text-muted-foreground">Kubernetes and IaC security scanning</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI Features */}
        <h3 className="text-xl font-bold mb-4">AI Feature Costs</h3>
        <p className="text-muted-foreground mb-4">
          AI features use large language models which have per-token costs. Some features are flat-rate,
          while others scale with the number of issues found.
        </p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2">Feature</th>
                <th className="text-center py-3 px-2">Credits</th>
                <th className="text-center py-3 px-2">Pricing Model</th>
                <th className="text-left py-3 px-2">What It Does</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Scan Summary</td>
                <td className="text-center py-3 px-2 font-mono">1</td>
                <td className="text-center py-3 px-2 text-muted-foreground">Per scan</td>
                <td className="py-3 px-2 text-muted-foreground">Executive summary of all findings</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Priority Scoring</td>
                <td className="text-center py-3 px-2 font-mono">1</td>
                <td className="text-center py-3 px-2 text-muted-foreground">Per scan</td>
                <td className="py-3 px-2 text-muted-foreground">AI-ranked issues by severity and impact</td>
              </tr>
              <tr className="border-b border-border/50 bg-yellow-500/5">
                <td className="py-3 px-2 font-medium">Issue Explanations</td>
                <td className="text-center py-3 px-2 font-mono">0.1</td>
                <td className="text-center py-3 px-2 text-muted-foreground">Per issue</td>
                <td className="py-3 px-2 text-muted-foreground">Plain-English explanation of each issue</td>
              </tr>
              <tr className="border-b border-border/50 bg-orange-500/5">
                <td className="py-3 px-2 font-medium">Fix Suggestions</td>
                <td className="text-center py-3 px-2 font-mono">0.15</td>
                <td className="text-center py-3 px-2 text-muted-foreground">Per issue</td>
                <td className="py-3 px-2 text-muted-foreground">AI-generated code fix for each issue</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-200 mb-1">Per-Issue Pricing Note</h4>
              <p className="text-sm text-muted-foreground">
                Issue Explanations and Fix Suggestions are charged per issue found. If your scan finds 100 issues
                and you enable Fix Suggestions, that&apos;s 100 × 0.15 = 15 credits for that feature alone.
                Consider running a basic scan first to see how many issues you have before enabling these features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Calculations */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Example Calculations</h2>
        <p className="text-muted-foreground mb-6">
          Here are real-world examples to help you estimate your costs.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Lint Check</CardTitle>
              <CardDescription>20,000 lines, linting only</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Base</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between">
                  <span>Lines (20k)</span>
                  <span>2</span>
                </div>
                <div className="flex justify-between">
                  <span>Linting</span>
                  <span className="text-green-400">0</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">3 credits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Audit + AI</CardTitle>
              <CardDescription>50,000 lines, security + AI summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Base</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between">
                  <span>Lines (50k)</span>
                  <span>5</span>
                </div>
                <div className="flex justify-between">
                  <span>Security</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Summary</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">8 credits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Audit with AI Fixes</CardTitle>
              <CardDescription>50,000 lines, all tools, 100 issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Base + Lines</span>
                  <span>6</span>
                </div>
                <div className="flex justify-between">
                  <span>Security</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between">
                  <span>Accessibility</span>
                  <span>4</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance</span>
                  <span>5</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Summary + Priority</span>
                  <span>2</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Fixes (100 issues)</span>
                  <span>15</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">33 credits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Subscription Tiers</h2>
        <p className="text-muted-foreground mb-6">
          Choose the tier that fits your usage. All paid tiers include overage pricing so you never get blocked.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2"></th>
                <th className="text-center py-3 px-2">Free</th>
                <th className="text-center py-3 px-2">Solo</th>
                <th className="text-center py-3 px-2 bg-primary/5">Scale</th>
                <th className="text-center py-3 px-2">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Monthly Price</td>
                <td className="text-center py-3 px-2">$0</td>
                <td className="text-center py-3 px-2">$19</td>
                <td className="text-center py-3 px-2 bg-primary/5 font-semibold">$49</td>
                <td className="text-center py-3 px-2">$99</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Annual Price</td>
                <td className="text-center py-3 px-2">$0</td>
                <td className="text-center py-3 px-2">$190 <span className="text-green-400 text-xs">(2 mo free)</span></td>
                <td className="text-center py-3 px-2 bg-primary/5">$490 <span className="text-green-400 text-xs">(2 mo free)</span></td>
                <td className="text-center py-3 px-2">$990 <span className="text-green-400 text-xs">(2 mo free)</span></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Monthly Credits</td>
                <td className="text-center py-3 px-2">5</td>
                <td className="text-center py-3 px-2">50</td>
                <td className="text-center py-3 px-2 bg-primary/5 font-semibold">200</td>
                <td className="text-center py-3 px-2">500</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Credit Rollover</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5">Up to 100</td>
                <td className="text-center py-3 px-2">Up to 250</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Overage Rate</td>
                <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                <td className="text-center py-3 px-2">$0.40/credit</td>
                <td className="text-center py-3 px-2 bg-primary/5">$0.30/credit</td>
                <td className="text-center py-3 px-2">$0.20/credit</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Effective $/Credit</td>
                <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                <td className="text-center py-3 px-2">$0.38</td>
                <td className="text-center py-3 px-2 bg-primary/5 font-semibold">$0.245</td>
                <td className="text-center py-3 px-2">$0.198</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Projects</td>
                <td className="text-center py-3 px-2">1</td>
                <td className="text-center py-3 px-2">3</td>
                <td className="text-center py-3 px-2 bg-primary/5">10</td>
                <td className="text-center py-3 px-2">Unlimited</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Team Members</td>
                <td className="text-center py-3 px-2">1</td>
                <td className="text-center py-3 px-2">1</td>
                <td className="text-center py-3 px-2 bg-primary/5">3</td>
                <td className="text-center py-3 px-2">10</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Max Repo Size</td>
                <td className="text-center py-3 px-2">10K lines</td>
                <td className="text-center py-3 px-2">50K lines</td>
                <td className="text-center py-3 px-2 bg-primary/5">150K lines</td>
                <td className="text-center py-3 px-2">500K lines</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">History Retention</td>
                <td className="text-center py-3 px-2">7 days</td>
                <td className="text-center py-3 px-2">14 days</td>
                <td className="text-center py-3 px-2 bg-primary/5">30 days</td>
                <td className="text-center py-3 px-2">90 days</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">AI Summary</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
                <td className="text-center py-3 px-2 bg-primary/5"><Check className="inline h-4 w-4 text-green-400" /></td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">AI Issue Explanations</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5"><Check className="inline h-4 w-4 text-green-400" /></td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">AI Fix Suggestions</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">GitHub Integration</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5"><Check className="inline h-4 w-4 text-green-400" /></td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Slack + Webhooks</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">API Access</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2 bg-primary/5 text-muted-foreground">-</td>
                <td className="text-center py-3 px-2"><Check className="inline h-4 w-4 text-green-400" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscription Calculator */}
      <section id="calculator">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Cost Calculator
        </h2>
        <p className="text-muted-foreground mb-6">
          Enter your expected usage to find the best plan and estimate your monthly costs.
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Your Usage</CardTitle>
              <CardDescription>Configure your expected monthly usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scans per month */}
              <div className="space-y-2">
                <Label htmlFor="scans">Scans per month</Label>
                <Input
                  id="scans"
                  type="number"
                  value={scansPerMonth}
                  onChange={(e) => setScansPerMonth(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>

              {/* Average lines of code */}
              <div className="space-y-2">
                <Label htmlFor="lines">Average lines of code per scan</Label>
                <Input
                  id="lines"
                  type="number"
                  value={avgLinesOfCode}
                  onChange={(e) => setAvgLinesOfCode(parseInt(e.target.value) || 0)}
                  min={0}
                  step={1000}
                />
              </div>

              {/* Average issues */}
              <div className="space-y-2">
                <Label htmlFor="issues">Average issues found per scan</Label>
                <Input
                  id="issues"
                  type="number"
                  value={avgIssuesPerScan}
                  onChange={(e) => setAvgIssuesPerScan(parseInt(e.target.value) || 0)}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">Used for per-issue AI feature costs</p>
              </div>

              {/* Projects and team */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projects">Projects needed</Label>
                  <Input
                    id="projects"
                    type="number"
                    value={projectCount}
                    onChange={(e) => setProjectCount(parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team size</Label>
                  <Input
                    id="team"
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
              </div>

              {/* Tool toggles */}
              <div className="space-y-4">
                <Label>Premium Tools</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Security scanning</span>
                      <span className="text-xs text-muted-foreground ml-2">(+1 credit)</span>
                    </div>
                    <Switch checked={useSecurity} onCheckedChange={setUseSecurity} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Accessibility</span>
                      <span className="text-xs text-muted-foreground ml-2">(+4 credits)</span>
                    </div>
                    <Switch checked={useAccessibility} onCheckedChange={setUseAccessibility} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Performance (Lighthouse)</span>
                      <span className="text-xs text-muted-foreground ml-2">(+5 credits)</span>
                    </div>
                    <Switch checked={usePerformance} onCheckedChange={setUsePerformance} />
                  </div>
                </div>
              </div>

              {/* AI Features */}
              <div className="space-y-4">
                <Label>AI Features</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">AI Summary</span>
                      <span className="text-xs text-muted-foreground ml-2">(+1 credit)</span>
                    </div>
                    <Switch checked={useAiSummary} onCheckedChange={setUseAiSummary} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Issue Explanations</span>
                      <span className="text-xs text-muted-foreground ml-2">(+0.1 per issue)</span>
                    </div>
                    <Switch checked={useAiExplanations} onCheckedChange={setUseAiExplanations} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Fix Suggestions</span>
                      <span className="text-xs text-muted-foreground ml-2">(+0.15 per issue)</span>
                    </div>
                    <Switch checked={useAiFixSuggestions} onCheckedChange={setUseAiFixSuggestions} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {/* Per-scan breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Per-Scan Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lines ({(avgLinesOfCode / 1000).toFixed(0)}k)</span>
                    <span>{Math.ceil(avgLinesOfCode / 10000)}</span>
                  </div>
                  {useSecurity && (
                    <div className="flex justify-between">
                      <span>Security</span>
                      <span>1</span>
                    </div>
                  )}
                  {useAccessibility && (
                    <div className="flex justify-between">
                      <span>Accessibility</span>
                      <span>4</span>
                    </div>
                  )}
                  {usePerformance && (
                    <div className="flex justify-between">
                      <span>Performance</span>
                      <span>5</span>
                    </div>
                  )}
                  {useAiSummary && (
                    <div className="flex justify-between">
                      <span>AI Summary</span>
                      <span>1</span>
                    </div>
                  )}
                  {useAiExplanations && (
                    <div className="flex justify-between">
                      <span>AI Explanations ({avgIssuesPerScan} issues)</span>
                      <span>{Math.ceil(avgIssuesPerScan * 0.1)}</span>
                    </div>
                  )}
                  {useAiFixSuggestions && (
                    <div className="flex justify-between">
                      <span>AI Fix Suggestions ({avgIssuesPerScan} issues)</span>
                      <span>{Math.ceil(avgIssuesPerScan * 0.15)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 mt-2 font-semibold text-lg">
                    <span>Total per scan</span>
                    <span className="text-primary">{creditsPerScan} credits</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary">{monthlyCreditsNeeded}</div>
                  <div className="text-muted-foreground">credits per month</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ({scansPerMonth} scans × {creditsPerScan} credits)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Recommended Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Badge className="text-lg px-4 py-1 mb-2">{tiers[recommendedTier.tier].name}</Badge>
                  <div className="text-3xl font-bold">
                    {recommendedTier.cost === Infinity ? 'N/A' : `$${recommendedTier.cost.toFixed(2)}`}
                    <span className="text-lg text-muted-foreground font-normal">/mo</span>
                  </div>
                  {recommendedTier.cost !== Infinity && recommendedTier.tier !== 'free' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {tiers[recommendedTier.tier].credits} credits included
                      {monthlyCreditsNeeded > tiers[recommendedTier.tier].credits + tiers[recommendedTier.tier].creditsRollover && (
                        <span className="block">
                          + ${((monthlyCreditsNeeded - tiers[recommendedTier.tier].credits - tiers[recommendedTier.tier].creditsRollover) * (tiers[recommendedTier.tier].overageRate || 0)).toFixed(2)} overage
                        </span>
                      )}
                    </p>
                  )}
                  <Button asChild className="mt-4">
                    <Link href="/pricing">
                      View All Plans <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {/* Cost comparison */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Cost comparison:</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {(Object.entries(recommendedTier.costs) as [keyof typeof tiers, number][]).map(([tier, cost]) => (
                      <div
                        key={tier}
                        className={`text-center p-2 rounded ${tier === recommendedTier.tier ? 'bg-primary/20' : 'bg-muted/50'}`}
                      >
                        <div className="font-medium">{tiers[tier].name}</div>
                        <div className={cost === Infinity ? 'text-muted-foreground' : ''}>
                          {cost === Infinity ? 'N/A' : `$${cost.toFixed(0)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Credit Packages */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Credit Top-Up Packages</h2>
        <p className="text-muted-foreground mb-6">
          Need more credits? Purchase packages anytime. Purchased credits never expire.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Starter Pack</div>
              <div className="text-3xl font-bold text-primary my-2">25</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$10</div>
              <div className="text-xs text-muted-foreground">$0.40/credit</div>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="pt-6 text-center relative">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Best Value</Badge>
              <div className="font-semibold">Pro Pack</div>
              <div className="text-3xl font-bold text-primary my-2">100</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$30</div>
              <div className="text-xs text-muted-foreground">$0.30/credit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Power Pack</div>
              <div className="text-3xl font-bold text-primary my-2">500</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$100</div>
              <div className="text-xs text-muted-foreground">$0.20/credit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Enterprise Pack</div>
              <div className="text-3xl font-bold text-primary my-2">2000</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$300</div>
              <div className="text-xs text-muted-foreground">$0.15/credit</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens if I run out of credits?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Paid plans (Solo, Scale, Business) have overage pricing, so you can always keep scanning.
                You&apos;ll see the overage cost before confirming each scan. Free tier users need to wait
                for their next monthly allocation or upgrade to a paid plan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Do unused credits roll over?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Scale and Business plans include credit rollover. Scale can roll over up to 100 credits,
                Business up to 250. Free and Solo plans don&apos;t have rollover - use them or lose them!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do purchased credit packages work?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Purchased credits are added to your account immediately and <strong>never expire</strong>.
                They&apos;re used after your monthly allocation is exhausted, before any overage charges apply.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I set up automatic top-ups?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Yes! In your account settings, you can enable auto top-up to automatically purchase a credit
                package when your balance falls below a threshold. Set a monthly limit to control spending.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How are lines of code counted?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We count logical lines of code (excluding empty lines and comments) in supported file types.
                Files in <code>node_modules</code>, <code>dist</code>, <code>.git</code>, and common build
                directories are automatically excluded. You can add custom exclusions in <code>.bugritignore</code>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why are accessibility and performance tools more expensive?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                These tools require spinning up headless browsers (Puppeteer/Chromium) which consume
                significantly more CPU, memory, and time than static analysis tools. The credit cost
                reflects our actual infrastructure costs to run these tools reliably.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Related Links */}
      <section className="pt-8 border-t">
        <h3 className="font-semibold mb-4">Related Documentation</h3>
        <div className="flex flex-wrap gap-4">
          <Link href="/docs/api-reference/billing" className="text-primary hover:underline">
            Billing API Reference
          </Link>
          <Link href="/pricing" className="text-primary hover:underline">
            View Pricing Page
          </Link>
          <Link href="/settings/subscription" className="text-primary hover:underline">
            Manage Subscription
          </Link>
        </div>
      </section>
    </div>
  );
}
