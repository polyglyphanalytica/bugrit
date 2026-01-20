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
import { Calculator, Check, ArrowRight } from 'lucide-react';

// Tier definitions for the calculator
const tiers = {
  free: {
    name: 'Free',
    price: 0,
    credits: 15,
    creditsRollover: 0,
    overageRate: null,
    maxRepoSize: 50000,
    projects: 1,
    teamMembers: 1,
    historyDays: 7,
  },
  starter: {
    name: 'Starter',
    price: 29,
    credits: 75,
    creditsRollover: 25,
    overageRate: 0.20,
    maxRepoSize: 100000,
    projects: 5,
    teamMembers: 2,
    historyDays: 30,
  },
  pro: {
    name: 'Pro',
    price: 99,
    credits: 200,
    creditsRollover: 50,
    overageRate: 0.15,
    maxRepoSize: 150000,
    projects: 10,
    teamMembers: 5,
    historyDays: 90,
  },
  business: {
    name: 'Business',
    price: 249,
    credits: 500,
    creditsRollover: 100,
    overageRate: 0.10,
    maxRepoSize: 500000,
    projects: -1, // unlimited
    teamMembers: -1, // unlimited
    historyDays: 365,
  },
};

// Credit costs
const creditCosts = {
  baseScan: 1,
  per10kLines: 1,
  security: 1,
  accessibility: 2,
  performance: 3,
  aiSummary: 1,
  aiExplanations: 2, // per 50 issues
  aiFixSuggestions: 3, // per 50 issues
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
    if (useAiExplanations) credits += Math.ceil(avgIssuesPerScan / 50) * creditCosts.aiExplanations;
    if (useAiFixSuggestions) credits += Math.ceil(avgIssuesPerScan / 50) * creditCosts.aiFixSuggestions;
    return credits;
  }, [avgLinesOfCode, avgIssuesPerScan, useSecurity, useAccessibility, usePerformance, useAiSummary, useAiExplanations, useAiFixSuggestions]);

  // Calculate total monthly credits needed
  const monthlyCreditsNeeded = creditsPerScan * scansPerMonth;

  // Find recommended tier
  const recommendedTier = useMemo(() => {
    // Check resource requirements first
    const meetsResourceReqs = (tier: typeof tiers.free) => {
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
      starter: calculateTotalCost('starter'),
      pro: calculateTotalCost('pro'),
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
          Understand how Bugrit pricing works, how credits are calculated, and find the best plan for your needs.
        </p>
      </div>

      {/* Why It Matters */}
      <section className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-xl font-bold mb-3">Why Understanding Pricing Matters</h2>
        <p className="text-muted-foreground mb-4">
          Credit-based pricing gives you control and predictability over your scanning costs:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li><strong>Pay for what you use</strong> - No surprise charges, full transparency on costs</li>
          <li><strong>Optimize your scans</strong> - Toggle expensive features only when you need them</li>
          <li><strong>Scale smoothly</strong> - Start free, upgrade as you grow, buy top-ups for burst usage</li>
          <li><strong>Budget accurately</strong> - Use the calculator below to estimate your real monthly costs</li>
        </ul>
      </section>

      {/* How Credits Work */}
      <section>
        <h2 className="text-2xl font-bold mb-4">How Credits Work</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit uses a credit-based system for scans. Every subscription tier includes a monthly credit
          allocation. Credits are consumed based on what you scan and which features you use.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Allocation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Each tier includes monthly credits that reset on your billing date.</p>
              <p>Unused credits can roll over (up to your tier&apos;s rollover limit).</p>
              <p>Paid tiers allow overage usage at per-credit rates.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit Top-ups</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Purchase credit packages anytime when you need more.</p>
              <p>Set up auto top-up to never run out mid-project.</p>
              <p>Purchased credits never expire.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Credit Calculation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Credit Calculation</h2>
        <p className="text-muted-foreground mb-6">
          Each scan costs credits based on the following formula:
        </p>

        <GlassCard className="p-6 mb-6">
          <div className="font-mono text-sm space-y-2">
            <div className="text-primary font-semibold mb-4">Total Credits = Base + Lines + Tools + AI Features</div>
            <div className="pl-4 space-y-1">
              <div><span className="text-muted-foreground">Base:</span> 1 credit per scan</div>
              <div><span className="text-muted-foreground">Lines:</span> 1 credit per 10,000 lines of code</div>
              <div><span className="text-muted-foreground">Tools:</span> 0-3 credits depending on tool category</div>
              <div><span className="text-muted-foreground">AI:</span> 1-3 credits depending on feature (some per-issue)</div>
            </div>
          </div>
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Base and Lines */}
          <div>
            <h3 className="font-semibold mb-3">Base Costs</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Base scan cost</td>
                  <td className="text-right font-mono">1 credit</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Per 10,000 lines of code</td>
                  <td className="text-right font-mono">1 credit</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tool Categories */}
          <div>
            <h3 className="font-semibold mb-3">Tool Categories</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Linting, Dependencies, Quality, Docs, Git</td>
                  <td className="text-right text-green-400 font-mono">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Security</td>
                  <td className="text-right font-mono">1 credit</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Accessibility</td>
                  <td className="text-right font-mono">2 credits</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Performance (Lighthouse)</td>
                  <td className="text-right font-mono">3 credits</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Features */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-3">AI Features</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-right py-2">Credits</th>
                  <th className="text-right py-2">Charged</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Scan Summary</td>
                  <td className="text-right font-mono">1</td>
                  <td className="text-right text-muted-foreground">Per scan</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Issue Explanations</td>
                  <td className="text-right font-mono">2</td>
                  <td className="text-right text-muted-foreground">Per 50 issues</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Fix Suggestions</td>
                  <td className="text-right font-mono">3</td>
                  <td className="text-right text-muted-foreground">Per 50 issues</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Priority Scoring</td>
                  <td className="text-right font-mono">1</td>
                  <td className="text-right text-muted-foreground">Per scan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Example Calculations */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Example Calculations</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Simple Linting Scan</CardTitle>
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
                <div className="flex justify-between border-t pt-1 mt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">3 credits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Security Audit</CardTitle>
              <CardDescription>50,000 lines, security + AI explanations</CardDescription>
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
                <div className="flex justify-between">
                  <span>AI Explanations (~100 issues)</span>
                  <span>4</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">12 credits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Subscription Tiers</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2"></th>
                <th className="text-center py-3 px-2">Free</th>
                <th className="text-center py-3 px-2">Starter</th>
                <th className="text-center py-3 px-2 bg-primary/5">Pro</th>
                <th className="text-center py-3 px-2">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Price</td>
                <td className="text-center py-3 px-2">$0</td>
                <td className="text-center py-3 px-2">$29/mo</td>
                <td className="text-center py-3 px-2 bg-primary/5">$99/mo</td>
                <td className="text-center py-3 px-2">$249/mo</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Monthly Credits</td>
                <td className="text-center py-3 px-2">15</td>
                <td className="text-center py-3 px-2">75</td>
                <td className="text-center py-3 px-2 bg-primary/5">200</td>
                <td className="text-center py-3 px-2">500</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Credit Rollover</td>
                <td className="text-center py-3 px-2">-</td>
                <td className="text-center py-3 px-2">25</td>
                <td className="text-center py-3 px-2 bg-primary/5">50</td>
                <td className="text-center py-3 px-2">100</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Overage Rate</td>
                <td className="text-center py-3 px-2 text-muted-foreground">N/A</td>
                <td className="text-center py-3 px-2">$0.20/credit</td>
                <td className="text-center py-3 px-2 bg-primary/5">$0.15/credit</td>
                <td className="text-center py-3 px-2">$0.10/credit</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Projects</td>
                <td className="text-center py-3 px-2">1</td>
                <td className="text-center py-3 px-2">5</td>
                <td className="text-center py-3 px-2 bg-primary/5">10</td>
                <td className="text-center py-3 px-2">Unlimited</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Team Members</td>
                <td className="text-center py-3 px-2">1</td>
                <td className="text-center py-3 px-2">2</td>
                <td className="text-center py-3 px-2 bg-primary/5">5</td>
                <td className="text-center py-3 px-2">Unlimited</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">Max Repo Size</td>
                <td className="text-center py-3 px-2">50K lines</td>
                <td className="text-center py-3 px-2">100K lines</td>
                <td className="text-center py-3 px-2 bg-primary/5">150K lines</td>
                <td className="text-center py-3 px-2">500K lines</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-2 font-medium">History Retention</td>
                <td className="text-center py-3 px-2">7 days</td>
                <td className="text-center py-3 px-2">30 days</td>
                <td className="text-center py-3 px-2 bg-primary/5">90 days</td>
                <td className="text-center py-3 px-2">365 days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscription Calculator */}
      <section id="calculator">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Subscription Calculator
        </h2>
        <p className="text-muted-foreground mb-6">
          Answer a few questions about your usage to find the best plan for your needs.
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
                <p className="text-xs text-muted-foreground">Used for AI feature cost estimates</p>
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
                      <span className="text-xs text-muted-foreground ml-2">(+2 credits)</span>
                    </div>
                    <Switch checked={useAccessibility} onCheckedChange={setUseAccessibility} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Performance (Lighthouse)</span>
                      <span className="text-xs text-muted-foreground ml-2">(+3 credits)</span>
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
                      <span className="text-xs text-muted-foreground ml-2">(+2 per 50 issues)</span>
                    </div>
                    <Switch checked={useAiExplanations} onCheckedChange={setUseAiExplanations} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">Fix Suggestions</span>
                      <span className="text-xs text-muted-foreground ml-2">(+3 per 50 issues)</span>
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
                      <span>2</span>
                    </div>
                  )}
                  {usePerformance && (
                    <div className="flex justify-between">
                      <span>Performance</span>
                      <span>3</span>
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
                      <span>AI Explanations</span>
                      <span>{Math.ceil(avgIssuesPerScan / 50) * 2}</span>
                    </div>
                  )}
                  {useAiFixSuggestions && (
                    <div className="flex justify-between">
                      <span>AI Fix Suggestions</span>
                      <span>{Math.ceil(avgIssuesPerScan / 50) * 3}</span>
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
                    ({scansPerMonth} scans x {creditsPerScan} credits)
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
        <h2 className="text-2xl font-bold mb-4">Credit Packages</h2>
        <p className="text-muted-foreground mb-6">
          Need more credits? Purchase packages anytime. Purchased credits never expire.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Starter Pack</div>
              <div className="text-3xl font-bold text-primary my-2">25</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$5</div>
              <div className="text-xs text-muted-foreground">$0.20/credit</div>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="pt-6 text-center relative">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Best Value</Badge>
              <div className="font-semibold">Pro Pack</div>
              <div className="text-3xl font-bold text-primary my-2">100</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$16</div>
              <div className="text-xs text-muted-foreground">$0.16/credit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Power Pack</div>
              <div className="text-3xl font-bold text-primary my-2">500</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$60</div>
              <div className="text-xs text-muted-foreground">$0.12/credit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="font-semibold">Enterprise Pack</div>
              <div className="text-3xl font-bold text-primary my-2">2000</div>
              <div className="text-sm text-muted-foreground mb-2">credits</div>
              <div className="text-xl font-semibold">$200</div>
              <div className="text-xs text-muted-foreground">$0.10/credit</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* AI Prompts for Vibe Coding */}
      <section>
        <h2 className="text-2xl font-bold mb-4">AI Prompts for Vibe Coding</h2>
        <p className="text-muted-foreground mb-6">
          Use these prompts to quickly build pricing and subscription features into your app.
        </p>

        <div className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Pricing Page with Tier Comparison</h4>
            <p className="text-sm text-muted-foreground mb-3">Create a marketing pricing page</p>
            <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
              <pre>{`Create a responsive pricing page with 4 tiers: Free, Starter ($29), Pro ($99), Business ($249).
Each card should show:
- Tier name and price (monthly/yearly toggle)
- Monthly credits included with rollover amount
- Max repo size and project limits
- Team member limit
- List of features with checkmarks
Highlight the Pro plan as "Most Popular".
Add a "Get Started" button for Free, "Subscribe" for paid tiers.
Include a FAQ section answering common pricing questions.`}</pre>
            </GlassCard>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Interactive Cost Calculator Widget</h4>
            <p className="text-sm text-muted-foreground mb-3">Embed a calculator on your landing page</p>
            <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
              <pre>{`Create a React cost calculator widget for Bugrit scanning.
Inputs:
- Slider: Scans per month (1-100)
- Slider: Average lines of code (5K-500K)
- Checkboxes: Security scan, Accessibility, Performance
- Checkboxes: AI Summary, AI Explanations, AI Fix Suggestions
Calculate credits per scan using:
- Base: 1 credit
- Lines: 1 credit per 10K lines
- Security: +1, Accessibility: +2, Performance: +3
- AI Summary: +1, Explanations: +2 per 50 issues, Fixes: +3 per 50 issues
Show monthly total and recommend the cheapest tier that covers it.
Display a cost breakdown chart using Recharts.`}</pre>
            </GlassCard>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Subscription Management Dashboard</h4>
            <p className="text-sm text-muted-foreground mb-3">Build a complete subscription settings page</p>
            <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
              <pre>{`Create a subscription management dashboard with these sections:

1. Current Plan Card
- Show tier name, status badge (active/canceled), renewal date
- Progress bar for credits used vs included
- Upgrade/Manage Billing buttons

2. Usage Overview
- Credits: used/limit with progress bar, show rollover
- Projects: used/limit
- Team Members: used/limit

3. Credit Purchase Section
- Grid of 4 credit packages with prices
- Click to open purchase modal
- Link to Stripe checkout on confirm

4. Auto Top-up Settings
- Toggle to enable/disable
- Threshold input (when to top up)
- Package selector dropdown
- Max per month input
- Save button

Fetch data from GET /api/settings/subscription.
Save auto-topup with POST /api/settings/subscription/auto-topup.`}</pre>
            </GlassCard>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Usage Tracking Hook</h4>
            <p className="text-sm text-muted-foreground mb-3">React hook for real-time credit tracking</p>
            <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
              <pre>{`Create a React custom hook called useBugritCredits that:
1. Fetches credit balance from GET /api/billing/status
2. Returns { credits, tier, loading, error, refetch }
3. Polls every 30 seconds when the tab is active
4. Pauses polling when tab is hidden (use visibilitychange)
5. Provides a refetch function to manually update
6. Caches the last value to prevent flash of loading state

Also create a CreditWarning component that uses this hook and shows:
- Nothing when credits > 20% remaining
- Yellow banner when credits < 20%
- Red banner with "Buy Credits" when credits < 10%

Export both from a useBugritCredits.ts file.`}</pre>
            </GlassCard>
          </div>
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
