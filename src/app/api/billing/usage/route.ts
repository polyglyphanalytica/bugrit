/**
 * GET /api/billing/usage
 *
 * Returns usage summary and transaction history.
 * Query params:
 *   - period: 'current' | 'previous' | ISO date (default: current)
 *   - include: 'summary' | 'transactions' | 'both' (default: both)
 *   - limit: number of transactions (default: 50, max: 200)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionTier } from '@/lib/billing/credits';
import { UsageSummary, CreditTransaction } from '@/lib/billing/types';
import { ToolCategory } from '@/lib/tools/registry';
import { authenticateRequest, ApiKeyContext } from '@/lib/api/auth';
import { ApiException } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

// Map tier names to SubscriptionTier
function mapTierToSubscriptionTier(tier: string): SubscriptionTier {
  const tierMap: Record<string, SubscriptionTier> = {
    starter: 'starter',
    pro: 'pro',
    business: 'business',
    enterprise: 'enterprise',
  };
  return tierMap[tier] || 'starter';
}

// Get user from authenticated request
async function getUserFromRequest(req: NextRequest): Promise<{ userId: string; tier: SubscriptionTier; context: ApiKeyContext } | null> {
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

// Mock - get usage summary
async function getUsageSummary(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageSummary> {
  // TODO: Aggregate from Firestore
  return {
    periodStart,
    periodEnd,
    totalScans: 12,
    totalCreditsUsed: 47,
    totalLinesScanned: 185_000,
    totalIssuesFound: 234,

    byCategory: {
      linting: { scans: 12, credits: 0, issues: 89 },
      security: { scans: 10, credits: 10, issues: 23 },
      dependencies: { scans: 12, credits: 0, issues: 45 },
      accessibility: { scans: 8, credits: 16, issues: 34 },
      quality: { scans: 12, credits: 0, issues: 28 },
      documentation: { scans: 12, credits: 0, issues: 12 },
      git: { scans: 12, credits: 0, issues: 3 },
      performance: { scans: 5, credits: 15, issues: 0 },
    } as Record<ToolCategory, { scans: number; credits: number; issues: number }>,

    byAIFeature: {
      summary: { uses: 12, credits: 12 },
      issue_explanations: { uses: 8, credits: 16 },
      fix_suggestions: { uses: 0, credits: 0 },
      priority_scoring: { uses: 10, credits: 10 },
    },

    topProjects: [
      { projectId: 'proj_1', projectName: 'my-saas-app', scans: 8, credits: 32 },
      { projectId: 'proj_2', projectName: 'marketing-site', scans: 3, credits: 10 },
      { projectId: 'proj_3', projectName: 'api-server', scans: 1, credits: 5 },
    ],
  };
}

// Mock - get transactions
async function getTransactions(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<CreditTransaction[]> {
  // TODO: Fetch from Firestore
  return [
    {
      id: 'txn_1',
      accountId: userId,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'scan',
      amount: -5,
      balanceAfter: 153,
      details: {
        scanId: 'scan_abc123',
        breakdown: {
          base: 1,
          lines: 2,
          tools: { security: 1, accessibility: 2 } as Record<ToolCategory, number>,
          ai: { summary: 1 },
        },
      },
    },
    {
      id: 'txn_2',
      accountId: userId,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'scan',
      amount: -3,
      balanceAfter: 158,
      details: {
        scanId: 'scan_def456',
        breakdown: {
          base: 1,
          lines: 1,
          tools: { security: 1 } as Record<ToolCategory, number>,
          ai: {},
        },
      },
    },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid API key or auth token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'current';
    const include = searchParams.get('include') || 'both';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Calculate period dates
    let periodStart: Date;
    let periodEnd: Date;

    if (period === 'current') {
      // Current billing period (assume monthly, starting on signup day)
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'previous') {
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // ISO date string
      periodStart = new Date(period);
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
    }

    const response: {
      period: { start: Date; end: Date };
      summary?: UsageSummary;
      transactions?: CreditTransaction[];
    } = {
      period: { start: periodStart, end: periodEnd },
    };

    if (include === 'summary' || include === 'both') {
      response.summary = await getUsageSummary(user.userId, periodStart, periodEnd);
    }

    if (include === 'transactions' || include === 'both') {
      response.transactions = await getTransactions(user.userId, periodStart, periodEnd, limit);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Usage error', {
      path: '/api/billing/usage',
      method: 'GET',
      error,
    });
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
