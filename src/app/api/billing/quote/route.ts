/**
 * POST /api/billing/quote
 *
 * Get a cost quote before running a scan.
 * Designed for external apps to show users their options and costs.
 *
 * This endpoint returns:
 * - Available tool categories with costs
 * - Available AI features with costs
 * - Current balance and limits
 * - Calculated estimate for requested config
 * - Whether the scan can proceed
 *
 * Example request:
 * {
 *   "projectId": "proj_123",
 *   "estimatedLines": 50000,
 *   "config": {
 *     "categories": ["linting", "security", "dependencies"],
 *     "aiFeatures": ["summary", "issue_explanations"]
 *   }
 * }
 *
 * The response includes all options so the UI can dynamically
 * adjust as the user toggles features on/off.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateCredits,
  CREDIT_COSTS,
  SUBSCRIPTION_TIERS,
  ScanConfig,
  SubscriptionTier,
  AIFeature,
} from '@/lib/billing/credits';
import { TOOL_REGISTRY, CATEGORY_LABELS, ToolCategory } from '@/lib/tools/registry';
import { authenticateRequest, ApiKeyContext } from '@/lib/api/auth';
import { ApiException } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { getBillingAccount } from '@/lib/billing/scan-billing';

// Map tier names to SubscriptionTier
function mapTierToSubscriptionTier(tier: string): SubscriptionTier {
  const tierMap: Record<string, SubscriptionTier> = {
    free: 'free',
    starter: 'starter',
    pro: 'pro',
    business: 'business',
    enterprise: 'enterprise',
  };
  return tierMap[tier] || 'free';
}

// Get user from authenticated request
async function getUserFromRequest(req: NextRequest): Promise<{
  userId: string;
  tier: SubscriptionTier;
  context: ApiKeyContext;
} | null> {
  try {
    const context = await authenticateRequest(req);
    return {
      userId: context.apiKey.ownerId,
      tier: mapTierToSubscriptionTier(context.tier),
      context,
    };
  } catch (error) {
    if (error instanceof ApiException) {
      return null;
    }
    throw error;
  }
}

// Get user's billing info from Firestore
async function getUserBilling(userId: string, tier: SubscriptionTier) {
  const account = await getBillingAccount(userId);
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (!account) {
    // Return defaults for free tier if no account found
    return {
      credits: {
        remaining: tierConfig.credits,
        included: tierConfig.credits,
        used: 0,
      },
      limits: {
        maxRepoSize: tierConfig.features.maxRepoSize,
        availableAIFeatures: [...tierConfig.features.aiFeatures] as AIFeature[],
      },
      overageRate: tierConfig.overageRate,
    };
  }

  return {
    credits: {
      remaining: account.credits.remaining,
      included: account.credits.included,
      used: account.credits.used,
    },
    limits: {
      maxRepoSize: tierConfig.features.maxRepoSize,
      availableAIFeatures: [...tierConfig.features.aiFeatures] as AIFeature[],
    },
    overageRate: tierConfig.overageRate,
  };
}

interface QuoteRequest {
  projectId?: string;
  repoUrl?: string;
  estimatedLines?: number;
  estimatedIssues?: number;
  config?: Partial<ScanConfig>;
}

interface ToolCategoryOption {
  id: ToolCategory;
  name: string;
  description: string;
  tools: string[];
  creditCost: number;
  included: boolean;
}

interface AIFeatureOption {
  id: AIFeature;
  name: string;
  description: string;
  creditCost: number;
  perIssue: boolean;
  available: boolean;
  requiresTier: string;
}

interface QuoteResponse {
  // Available options for UI
  options: {
    categories: ToolCategoryOption[];
    aiFeatures: AIFeatureOption[];
    linesCostPer10K: number;
    baseScanCost: number;
  };

  // User's current balance
  balance: {
    remaining: number;
    included: number;
    used: number;
    percentUsed: number;
  };

  // If config provided, calculated estimate
  estimate?: {
    breakdown: {
      base: number;
      lines: number;
      tools: Record<string, number>;
      ai: Record<string, number>;
    };
    total: number;
    warnings: string[];
  };

  // Affordability check
  canAfford: boolean;
  overage?: {
    credits: number;
    cost: number;
    rate: number;
  };

  // Quick action hints
  hints: {
    suggestedCategories: ToolCategory[];
    maxAffordableCredits: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid API key or authorization header required',
          docs: 'https://bugrit.com/docs/authentication',
        },
        { status: 401 }
      );
    }

    const body: QuoteRequest = await req.json().catch(() => ({}));
    const billing = await getUserBilling(user.userId, user.tier);

    // Build category options
    const categoryOptions: ToolCategoryOption[] = (
      Object.keys(CATEGORY_LABELS) as ToolCategory[]
    ).map((category) => ({
      id: category,
      name: CATEGORY_LABELS[category],
      description: getCategoryDescription(category),
      tools: TOOL_REGISTRY.filter((t) => t.category === category).map((t) => t.name),
      creditCost: CREDIT_COSTS.TOOLS[category],
      included: CREDIT_COSTS.TOOLS[category] === 0,
    }));

    // Build AI feature options
    const aiFeatureOptions: AIFeatureOption[] = [
      {
        id: 'summary',
        name: 'Scan Summary',
        description: 'AI-generated overview of all findings',
        creditCost: CREDIT_COSTS.AI.summary,
        perIssue: false,
        available: billing.limits.availableAIFeatures.includes('summary'),
        requiresTier: 'starter',
      },
      {
        id: 'issue_explanations',
        name: 'Issue Explanations',
        description: 'Detailed AI explanation for each issue found',
        creditCost: CREDIT_COSTS.AI.issue_explanations,
        perIssue: true,
        available: billing.limits.availableAIFeatures.includes('issue_explanations'),
        requiresTier: 'pro',
      },
      {
        id: 'fix_suggestions',
        name: 'Fix Suggestions',
        description: 'AI-generated code fixes you can apply',
        creditCost: CREDIT_COSTS.AI.fix_suggestions,
        perIssue: true,
        available: billing.limits.availableAIFeatures.includes('fix_suggestions'),
        requiresTier: 'business',
      },
      {
        id: 'priority_scoring',
        name: 'Priority Scoring',
        description: 'AI-ranked importance for each issue',
        creditCost: CREDIT_COSTS.AI.priority_scoring,
        perIssue: false,
        available: billing.limits.availableAIFeatures.includes('priority_scoring'),
        requiresTier: 'pro',
      },
    ];

    // Build response
    const response: QuoteResponse = {
      options: {
        categories: categoryOptions,
        aiFeatures: aiFeatureOptions,
        linesCostPer10K: CREDIT_COSTS.PER_10K_LINES,
        baseScanCost: CREDIT_COSTS.BASE_SCAN,
      },
      balance: {
        remaining: billing.credits.remaining,
        included: billing.credits.included,
        used: billing.credits.used,
        percentUsed:
          billing.credits.included > 0
            ? Math.round((billing.credits.used / billing.credits.included) * 100)
            : 0,
      },
      canAfford: true,
      hints: {
        suggestedCategories: ['linting', 'security', 'dependencies', 'quality'],
        maxAffordableCredits: billing.credits.remaining,
      },
    };

    // If config provided, calculate estimate
    if (body.config && body.config.categories && body.config.categories.length > 0) {
      const fullConfig: ScanConfig = {
        categories: body.config.categories,
        aiFeatures: body.config.aiFeatures || [],
        estimatedLines: body.estimatedLines,
        estimatedIssues: body.estimatedIssues,
      };

      const estimate = calculateCredits(fullConfig);

      response.estimate = {
        breakdown: {
          base: estimate.breakdown.base,
          lines: estimate.breakdown.lines,
          tools: estimate.breakdown.tools as Record<string, number>,
          ai: estimate.breakdown.ai as Record<string, number>,
        },
        total: estimate.total,
        warnings: estimate.warnings,
      };

      // Check affordability
      response.canAfford =
        billing.credits.remaining >= estimate.total || billing.overageRate !== null;

      // Calculate overage if needed
      if (estimate.total > billing.credits.remaining && billing.overageRate) {
        const overageCredits = estimate.total - billing.credits.remaining;
        response.overage = {
          credits: overageCredits,
          cost: overageCredits * billing.overageRate,
          rate: billing.overageRate,
        };
      }

      // Update hints based on estimate
      response.hints.maxAffordableCredits = billing.overageRate
        ? Infinity
        : billing.credits.remaining;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Quote error', {
      path: '/api/billing/quote',
      method: 'POST',
      error,
    });
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}

function getCategoryDescription(category: ToolCategory): string {
  const descriptions: Record<ToolCategory, string> = {
    linting: 'Code style, formatting, and best practices',
    security: 'Vulnerabilities, secrets, and security issues',
    dependencies: 'Package vulnerabilities, licenses, unused deps',
    accessibility: 'WCAG compliance and a11y issues',
    quality: 'Type errors, dead code, duplication',
    documentation: 'Markdown linting, docs quality',
    git: 'Commit message conventions',
    performance: 'Lighthouse audits, bundle size',
    mobile: 'Mobile app security and quality checks',
    'api-security': 'API endpoint security testing',
    'cloud-native': 'Cloud configuration and container security',
  };
  return descriptions[category];
}

// Also support GET for simple balance check
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const billing = await getUserBilling(user.userId, user.tier);

    return NextResponse.json({
      balance: {
        remaining: billing.credits.remaining,
        included: billing.credits.included,
        used: billing.credits.used,
      },
      tier: user.tier,
      overageEnabled: billing.overageRate !== null,
    });
  } catch (error) {
    logger.error('Error fetching billing balance', { error });
    return NextResponse.json({ error: 'Failed to fetch billing balance' }, { status: 500 });
  }
}
