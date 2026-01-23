'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/ui/glass-card';
import { getAllTiers, formatPrice, formatCredits, formatRepoSize, TierName } from '@/lib/subscriptions/tiers';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

// Handle checkout canceled URL param
function CheckoutParamsHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const subscription = searchParams.get('subscription');
    if (subscription === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No charges were made. You can try again anytime.',
        variant: 'default',
      });
      router.replace('/pricing', { scroll: false });
    }
  }, [searchParams, toast, router]);

  return null;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<TierName | null>(null);
  const tiers = getAllTiers();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubscribe = async (tier: TierName) => {
    if (tier === 'free') return;

    // If user is not logged in, redirect to signup with plan params
    if (!user) {
      window.location.href = `/signup?plan=${tier}&interval=${annual ? 'year' : 'month'}`;
      return;
    }

    // User is logged in - call checkout API directly
    setLoading(tier);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          interval: annual ? 'year' : 'month',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } else {
        const error = await res.json();
        toast({
          title: 'Unable to start checkout',
          description: error.error || 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Suspense fallback={null}>
        <CheckoutParamsHandler />
      </Suspense>
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Pay For What You Use</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Credit-based pricing that scales with your codebase. See costs before every scan.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={!annual ? 'font-medium' : 'text-muted-foreground'}>
              Monthly
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={annual ? 'font-medium' : 'text-muted-foreground'}>
              Annual
              <Badge variant="secondary" className="ml-2">
                2 months free
              </Badge>
            </span>
          </div>
        </div>

        {/* How Credits Work */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">How Credits Work</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold mb-1">1</div>
              <div className="text-sm text-muted-foreground">credit base cost</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold mb-1">+1</div>
              <div className="text-sm text-muted-foreground">per 10K lines</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold mb-1">+1-5</div>
              <div className="text-sm text-muted-foreground">for premium tools</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold mb-1">per issue</div>
              <div className="text-sm text-muted-foreground">for AI features</div>
            </GlassCard>
          </div>
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Example: 50K line repo with security + AI summary = ~8 credits. <Link href="/docs/pricing" className="text-primary hover:underline">See full pricing details →</Link>
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const price = annual ? Math.round(tier.priceYearly / 12) : tier.priceMonthly;

            return (
              <Card
                key={tier.name}
                className={`relative ${
                  tier.highlighted
                    ? 'border-2 border-primary shadow-lg'
                    : 'border'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {tier.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {formatPrice(price)}
                      {tier.priceMonthly > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      )}
                    </div>
                    {annual && tier.priceMonthly > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ${tier.priceYearly} billed annually
                      </p>
                    )}
                  </div>

                  {/* Credits badge */}
                  <div className="text-center">
                    <Badge variant="outline" className="text-sm">
                      {formatCredits(tier.limits.credits)}/mo
                    </Badge>
                  </div>

                  {/* CTA */}
                  {tier.name === 'free' ? (
                    <Link href="/login" className="block">
                      <Button className="w-full" variant="outline" size="sm">
                        Get Started
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tier.highlighted ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSubscribe(tier.name)}
                      disabled={loading !== null}
                    >
                      {loading === tier.name ? 'Loading...' : (user ? 'Subscribe' : 'Start Free Trial')}
                    </Button>
                  )}

                  {/* Features */}
                  <div className="space-y-1 pt-4 border-t text-xs">
                    {/* Limits */}
                    <FeatureItem included={true} text={`Up to ${formatRepoSize(tier.limits.maxRepoSize)}`} />
                    <FeatureItem included={true} text={tier.limits.projects === -1 ? 'Unlimited projects' : `${tier.limits.projects} projects`} />
                    <FeatureItem included={true} text={`${tier.limits.teamMembers} team member${tier.limits.teamMembers > 1 ? 's' : ''}`} />
                    <FeatureItem included={true} text={`${tier.limits.historyDays}-day history`} />
                    {tier.limits.creditsRollover > 0 && (
                      <FeatureItem included={true} text={`Rollover ${tier.limits.creditsRollover} credits`} />
                    )}

                    {/* Vibe Score */}
                    <div className="pt-1.5 mt-1.5 border-t border-dashed">
                      <FeatureItem included={tier.limits.features.vibeScore} text="Vibe Score (0-100)" />
                      <FeatureItem included={tier.limits.features.vibeScoreBadge} text="Embeddable badge" />
                      <FeatureItem included={tier.limits.features.repoHealthProfile} text="Health profile page" />
                    </div>

                    {/* AI Features */}
                    <div className="pt-1.5 mt-1.5 border-t border-dashed">
                      <FeatureItem included={tier.limits.features.aiSummary} text="AI summaries" />
                      <FeatureItem included={tier.limits.features.aiExplanations} text="AI explanations" />
                      <FeatureItem included={tier.limits.features.aiFixSuggestions} text="AI fix suggestions" />
                      <FeatureItem included={tier.limits.features.oneClickFixes} text="One-Click Fixes" />
                      <FeatureItem included={tier.limits.features.aiReviewMerge} text="AI Review & Merge" />
                      <FeatureItem included={tier.limits.features.explainCodebase} text="Explain Codebase" />
                    </div>

                    {/* Scanning */}
                    <div className="pt-1.5 mt-1.5 border-t border-dashed">
                      <FeatureItem included={tier.limits.features.shipItMode} text="Ship It Mode" />
                      <FeatureItem included={tier.limits.features.learningMode} text="Learning Mode" />
                    </div>

                    {/* Integrations */}
                    <div className="pt-1.5 mt-1.5 border-t border-dashed">
                      <FeatureItem included={tier.limits.features.githubIntegration} text="GitHub integration" />
                      <FeatureItem included={tier.limits.features.githubAction} text="GitHub Action" />
                      <FeatureItem included={tier.limits.features.slackIntegration} text="Slack notifications" />
                      <FeatureItem included={tier.limits.features.webhooks} text="Webhooks" />
                      <FeatureItem included={tier.limits.features.apiAccess} text="API access" />
                    </div>

                    {/* Business */}
                    <div className="pt-1.5 mt-1.5 border-t border-dashed">
                      <FeatureItem included={tier.limits.features.trustBadge} text="Trust Badge (verified)" />
                      <FeatureItem included={tier.limits.features.teamDashboard} text="Team Dashboard" />
                      <FeatureItem included={tier.limits.features.prioritySupport} text="Priority support" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Credit Costs Reference */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Credit Costs (115 Tools)</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-4">Tool Categories</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>📝 Linting & Formatting</span>
                  <span className="text-green-500">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>📦 Dependencies</span>
                  <span>0-1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>✨ Code Quality</span>
                  <span>0-3 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>📚 Documentation</span>
                  <span className="text-green-500">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>🔒 Security (15 tools)</span>
                  <span>1-5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>♿ Accessibility</span>
                  <span>+4 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Performance</span>
                  <span>1-5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>📱 Mobile Security</span>
                  <span>1-5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>🔌 API Security</span>
                  <span>1-3 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>☁️ Cloud Native</span>
                  <span>1-3 credits</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-semibold mb-4">AI Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Scan Summary</span>
                  <span>+1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Issue Explanations</span>
                  <span>+0.1 per issue</span>
                </div>
                <div className="flex justify-between">
                  <span>Fix Suggestions</span>
                  <span>+0.15 per issue</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority Scoring</span>
                  <span>+1 credit</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-2">Example Scan</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Base</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>50K lines</span>
                    <span>5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security tools</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI summary</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground pt-2 border-t">
                    <span>Total</span>
                    <span>8 credits</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            <Link href="/docs/pricing" className="text-primary hover:underline">Read the complete pricing documentation →</Link>
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What happens if I run out of credits?</h3>
              <p className="text-muted-foreground text-sm">
                Paid plans have overage pricing so you can keep scanning. You&apos;ll see the cost before
                every scan and can set spending limits in your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do unused credits roll over?</h3>
              <p className="text-muted-foreground text-sm">
                Scale and Business plans include credit rollover (up to 100 and 250 respectively).
                Rolled-over credits are used after your monthly allocation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I see costs before scanning?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! Before every scan, you&apos;ll see exactly how many credits it will cost based on
                your repo size and selected tools. You can toggle features to adjust the cost.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I integrate with my app?</h3>
              <p className="text-muted-foreground text-sm">
                Use our <Link href="/docs/api-reference/billing" className="text-primary hover:underline">Billing API</Link> to
                get quotes and check balances programmatically. Perfect for embedding in your own dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {included ? (
        <span className="text-green-500">✓</span>
      ) : (
        <span className="text-muted-foreground">–</span>
      )}
      <span className={included ? '' : 'text-muted-foreground'}>{text}</span>
    </div>
  );
}
