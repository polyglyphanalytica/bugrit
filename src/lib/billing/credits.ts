/**
 * Credit-based billing system
 *
 * Credits are consumed based on:
 * - Base scan cost
 * - Lines of code scanned
 * - Tools selected
 * - AI features used
 */

import { ToolCategory } from '../tools/registry';

// Credit costs for each component
export const CREDIT_COSTS = {
  // Base cost for any scan
  BASE_SCAN: 1,

  // Per 10K lines of code
  PER_10K_LINES: 1,

  // Tool category costs
  TOOLS: {
    linting: 0,        // Free - fast, low resource
    security: 1,       // Moderate resource usage
    dependencies: 0,   // Free - fast analysis
    accessibility: 2,  // Requires browser automation
    quality: 0,        // Free - fast analysis
    documentation: 0,  // Free - fast analysis
    git: 0,            // Free - fast analysis
    performance: 3,    // Heavy - Lighthouse needs browser
  } as Record<ToolCategory, number>,

  // AI features
  AI: {
    summary: 1,              // Basic scan summary
    issue_explanations: 2,   // Per-issue AI explanations
    fix_suggestions: 3,      // AI-generated fix code
    priority_scoring: 1,     // AI prioritization of issues
  },

  // Per 50 issues for AI explanations
  AI_ISSUES_BATCH: 50,
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    credits: 10,
    overageRate: null, // No overage allowed
    features: {
      maxProjects: 1,
      maxRepoSize: 10_000, // 10K lines
      historyDays: 7,
      aiFeatures: [],
      teamMembers: 1,
    },
  },
  starter: {
    name: 'Starter',
    price: 15,
    credits: 50,
    overageRate: 0.35,
    features: {
      maxProjects: 3,
      maxRepoSize: 50_000, // 50K lines
      historyDays: 14,
      aiFeatures: ['summary'],
      teamMembers: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 39,
    credits: 200,
    overageRate: 0.25,
    rolloverCredits: 100,
    features: {
      maxProjects: 10,
      maxRepoSize: 150_000, // 150K lines
      historyDays: 30,
      aiFeatures: ['summary', 'issue_explanations', 'priority_scoring'],
      teamMembers: 3,
      githubIntegration: true,
    },
  },
  business: {
    name: 'Business',
    price: 79,
    credits: 600,
    overageRate: 0.15,
    rolloverCredits: 300,
    features: {
      maxProjects: -1, // Unlimited
      maxRepoSize: 500_000, // 500K lines
      historyDays: 90,
      aiFeatures: ['summary', 'issue_explanations', 'fix_suggestions', 'priority_scoring'],
      teamMembers: 10,
      githubIntegration: true,
      slackIntegration: true,
      apiAccess: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom
    credits: -1, // Unlimited
    overageRate: null,
    features: {
      maxProjects: -1,
      maxRepoSize: -1, // Unlimited
      historyDays: 365,
      aiFeatures: ['summary', 'issue_explanations', 'fix_suggestions', 'priority_scoring'],
      teamMembers: -1,
      githubIntegration: true,
      slackIntegration: true,
      apiAccess: true,
      sso: true,
      sla: true,
      dedicatedSupport: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type AIFeature = keyof typeof CREDIT_COSTS.AI;

// Scan configuration that user can customize
export interface ScanConfig {
  // Tool categories to run
  categories: ToolCategory[];

  // Specific tools to exclude (optional)
  excludeTools?: string[];

  // AI features to enable
  aiFeatures: AIFeature[];

  // Estimated lines of code (for pre-scan estimate)
  estimatedLines?: number;

  // Estimated issues (for AI cost estimate, usually unknown pre-scan)
  estimatedIssues?: number;
}

// Credit calculation result
export interface CreditEstimate {
  breakdown: {
    base: number;
    lines: number;
    tools: Record<ToolCategory, number>;
    ai: Record<AIFeature, number>;
  };
  total: number;
  warnings: string[];
}

/**
 * Calculate credit cost for a scan configuration
 */
export function calculateCredits(config: ScanConfig): CreditEstimate {
  const breakdown = {
    base: CREDIT_COSTS.BASE_SCAN,
    lines: 0,
    tools: {} as Record<ToolCategory, number>,
    ai: {} as Record<AIFeature, number>,
  };
  const warnings: string[] = [];

  // Lines of code cost
  if (config.estimatedLines) {
    breakdown.lines = Math.ceil(config.estimatedLines / 10_000) * CREDIT_COSTS.PER_10K_LINES;
  }

  // Tool category costs
  for (const category of config.categories) {
    breakdown.tools[category] = CREDIT_COSTS.TOOLS[category];
  }

  // AI feature costs
  for (const feature of config.aiFeatures) {
    if (feature === 'issue_explanations' || feature === 'fix_suggestions') {
      // These scale with number of issues
      const issueCount = config.estimatedIssues || 50; // Default estimate
      const batches = Math.ceil(issueCount / CREDIT_COSTS.AI_ISSUES_BATCH);
      breakdown.ai[feature] = CREDIT_COSTS.AI[feature] * batches;

      if (!config.estimatedIssues) {
        warnings.push(`AI ${feature} cost estimated for ~50 issues. Actual cost may vary.`);
      }
    } else {
      breakdown.ai[feature] = CREDIT_COSTS.AI[feature];
    }
  }

  // Calculate total
  const total =
    breakdown.base +
    breakdown.lines +
    Object.values(breakdown.tools).reduce((a, b) => a + b, 0) +
    Object.values(breakdown.ai).reduce((a, b) => a + b, 0);

  return { breakdown, total, warnings };
}

/**
 * Get default scan config for a tier
 */
export function getDefaultScanConfig(tier: SubscriptionTier): ScanConfig {
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // All categories except performance for lower tiers
  const categories: ToolCategory[] = tier === 'free'
    ? ['linting', 'dependencies', 'quality', 'documentation', 'git']
    : ['linting', 'security', 'dependencies', 'accessibility', 'quality', 'documentation', 'git', 'performance'];

  return {
    categories,
    aiFeatures: tierConfig.features.aiFeatures as AIFeature[],
  };
}

/**
 * Check if user can afford a scan
 */
export function canAffordScan(
  credits: number,
  estimate: CreditEstimate,
  tier: SubscriptionTier
): { allowed: boolean; reason?: string } {
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (tierConfig.credits === -1) {
    // Unlimited tier
    return { allowed: true };
  }

  if (credits >= estimate.total) {
    return { allowed: true };
  }

  if (tierConfig.overageRate) {
    // Overage allowed
    return {
      allowed: true,
      reason: `This scan will use ${estimate.total - credits} overage credits at $${tierConfig.overageRate}/credit`
    };
  }

  return {
    allowed: false,
    reason: `Insufficient credits. Need ${estimate.total}, have ${credits}. Upgrade to add more credits.`
  };
}
