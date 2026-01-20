/**
 * Subscription Tiers Configuration
 *
 * Credit-based pricing that scales with usage:
 * - Free: 10 credits - Try it out
 * - Starter: $15/mo, 50 credits - For side projects
 * - Pro: $39/mo, 200 credits - For serious builders
 * - Business: $79/mo, 600 credits - For teams
 */

export type TierName = 'free' | 'starter' | 'pro' | 'business';

export interface TierLimits {
  credits: number;              // Monthly credits included
  creditsRollover: number;      // Max credits that can roll over
  overageRate: number | null;   // Cost per overage credit (null = no overage)
  maxRepoSize: number;          // Max lines of code per scan
  projects: number;             // Max projects (-1 = unlimited)
  teamMembers: number;          // Max team members
  historyDays: number;          // Scan history retention
  apiRequestsPerMinute: number; // Rate limiting
  platforms: {
    web: boolean;
    mobile: boolean;
    desktop: boolean;
  };
  features: {
    aiSummary: boolean;
    aiExplanations: boolean;
    aiFixSuggestions: boolean;
    aiPrioritization: boolean;
    githubIntegration: boolean;
    slackIntegration: boolean;
    webhooks: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

export interface TierDefinition {
  name: TierName;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  limits: TierLimits;
  highlighted?: boolean;
}

export const TIERS: Record<TierName, TierDefinition> = {
  free: {
    name: 'free',
    displayName: 'Free',
    description: 'Try it out',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      credits: 10,
      creditsRollover: 0,
      overageRate: null,
      maxRepoSize: 10_000,
      projects: 1,
      teamMembers: 1,
      historyDays: 7,
      apiRequestsPerMinute: 5,
      platforms: {
        web: true,
        mobile: false,
        desktop: false,
      },
      features: {
        aiSummary: false,
        aiExplanations: false,
        aiFixSuggestions: false,
        aiPrioritization: false,
        githubIntegration: false,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
  },

  starter: {
    name: 'starter',
    displayName: 'Starter',
    description: 'For side projects and indie hackers',
    priceMonthly: 15,
    priceYearly: 150,
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    limits: {
      credits: 50,
      creditsRollover: 0,
      overageRate: 0.35,
      maxRepoSize: 50_000,
      projects: 3,
      teamMembers: 1,
      historyDays: 14,
      apiRequestsPerMinute: 10,
      platforms: {
        web: true,
        mobile: false,
        desktop: false,
      },
      features: {
        aiSummary: true,
        aiExplanations: false,
        aiFixSuggestions: false,
        aiPrioritization: false,
        githubIntegration: false,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
  },

  pro: {
    name: 'pro',
    displayName: 'Pro',
    description: 'For serious builders shipping often',
    priceMonthly: 39,
    priceYearly: 390,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    highlighted: true,
    limits: {
      credits: 200,
      creditsRollover: 100,
      overageRate: 0.25,
      maxRepoSize: 150_000,
      projects: 10,
      teamMembers: 3,
      historyDays: 30,
      apiRequestsPerMinute: 60,
      platforms: {
        web: true,
        mobile: true,
        desktop: false,
      },
      features: {
        aiSummary: true,
        aiExplanations: true,
        aiFixSuggestions: false,
        aiPrioritization: true,
        githubIntegration: true,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
  },

  business: {
    name: 'business',
    displayName: 'Business',
    description: 'For teams that can\'t afford to ship bugs',
    priceMonthly: 79,
    priceYearly: 790,
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    limits: {
      credits: 600,
      creditsRollover: 300,
      overageRate: 0.15,
      maxRepoSize: 500_000,
      projects: -1,
      teamMembers: 10,
      historyDays: 90,
      apiRequestsPerMinute: 300,
      platforms: {
        web: true,
        mobile: true,
        desktop: true,
      },
      features: {
        aiSummary: true,
        aiExplanations: true,
        aiFixSuggestions: true,
        aiPrioritization: true,
        githubIntegration: true,
        slackIntegration: true,
        webhooks: true,
        apiAccess: true,
        prioritySupport: true,
      },
    },
  },
};

// Helper functions - These use hardcoded values by default
// For dynamic values from database, use the async functions below

export function getTier(name: TierName): TierDefinition {
  return TIERS[name];
}

export function getAllTiers(): TierDefinition[] {
  return [TIERS.free, TIERS.starter, TIERS.pro, TIERS.business];
}

export function getPaidTiers(): TierDefinition[] {
  return [TIERS.starter, TIERS.pro, TIERS.business];
}

// Server-only tier functions (loadTiersFromDatabase, getTierFromDatabase, invalidateTierCache)
// are available in '@/lib/subscriptions/tiers-server' for use in API routes and server components

export function canAccessPlatform(
  tier: TierName,
  platform: 'web' | 'mobile' | 'desktop'
): boolean {
  return TIERS[tier].limits.platforms[platform];
}

export function canAccessFeature(
  tier: TierName,
  feature: keyof TierLimits['features']
): boolean {
  return TIERS[tier].limits.features[feature];
}

export function getCreditsLimit(tier: TierName): number {
  return TIERS[tier].limits.credits;
}

export function getOverageRate(tier: TierName): number | null {
  return TIERS[tier].limits.overageRate;
}

export function getRateLimit(tier: TierName): number {
  return TIERS[tier].limits.apiRequestsPerMinute;
}

export function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `$${price}`;
}

export function getUpgradeTier(currentTier: TierName): TierName | null {
  if (currentTier === 'free') return 'starter';
  if (currentTier === 'starter') return 'pro';
  if (currentTier === 'pro') return 'business';
  return null;
}

export function formatCredits(credits: number): string {
  if (credits === -1) return 'Unlimited';
  return `${credits} credits`;
}

export function formatRepoSize(lines: number): string {
  if (lines === -1) return 'Unlimited';
  if (lines >= 1_000_000) return `${(lines / 1_000_000).toFixed(0)}M lines`;
  if (lines >= 1_000) return `${(lines / 1_000).toFixed(0)}K lines`;
  return `${lines} lines`;
}
