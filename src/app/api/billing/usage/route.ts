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
import { getDb, COLLECTIONS, toDate } from '@/lib/firestore';

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

// Get usage summary from Firestore
async function getUsageSummary(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageSummary> {
  const db = getDb();

  // Initialize empty summary
  const summary: UsageSummary = {
    periodStart,
    periodEnd,
    totalScans: 0,
    totalCreditsUsed: 0,
    totalLinesScanned: 0,
    totalIssuesFound: 0,
    byCategory: {
      linting: { scans: 0, credits: 0, issues: 0 },
      security: { scans: 0, credits: 0, issues: 0 },
      dependencies: { scans: 0, credits: 0, issues: 0 },
      accessibility: { scans: 0, credits: 0, issues: 0 },
      quality: { scans: 0, credits: 0, issues: 0 },
      documentation: { scans: 0, credits: 0, issues: 0 },
      git: { scans: 0, credits: 0, issues: 0 },
      performance: { scans: 0, credits: 0, issues: 0 },
      mobile: { scans: 0, credits: 0, issues: 0 },
      'api-security': { scans: 0, credits: 0, issues: 0 },
      'cloud-native': { scans: 0, credits: 0, issues: 0 },
    },
    byAIFeature: {
      summary: { uses: 0, credits: 0 },
      issue_explanations: { uses: 0, credits: 0 },
      fix_suggestions: { uses: 0, credits: 0 },
      priority_scoring: { uses: 0, credits: 0 },
    },
    topProjects: [],
  };

  if (!db) return summary;

  try {
    // Fetch scan billing records for the period
    const billingSnapshot = await db
      .collection('scan_billing')
      .where('userId', '==', userId)
      .where('timestamp', '>=', periodStart)
      .where('timestamp', '<=', periodEnd)
      .orderBy('timestamp', 'desc')
      .get();

    const projectCredits: Record<string, { credits: number; scans: number; name: string }> = {};

    for (const doc of billingSnapshot.docs) {
      const data = doc.data();
      summary.totalScans++;
      summary.totalCreditsUsed += data.creditsCharged || 0;
      summary.totalLinesScanned += data.metrics?.linesOfCode || 0;
      summary.totalIssuesFound += data.metrics?.issuesFound || 0;

      // Aggregate by category from breakdown
      const breakdown = data.breakdown;
      if (breakdown?.tools) {
        for (const [category, credits] of Object.entries(breakdown.tools)) {
          if (summary.byCategory[category as ToolCategory]) {
            summary.byCategory[category as ToolCategory].scans++;
            summary.byCategory[category as ToolCategory].credits += credits as number;
          }
        }
      }

      // Aggregate by AI feature
      if (breakdown?.ai) {
        type AIFeatureKey = 'summary' | 'issue_explanations' | 'fix_suggestions' | 'priority_scoring';
        const validFeatures: AIFeatureKey[] = ['summary', 'issue_explanations', 'fix_suggestions', 'priority_scoring'];

        for (const [feature, credits] of Object.entries(breakdown.ai)) {
          if (validFeatures.includes(feature as AIFeatureKey)) {
            const featureKey = feature as AIFeatureKey;
            summary.byAIFeature[featureKey].uses++;
            summary.byAIFeature[featureKey].credits += credits as number;
          }
        }
      }

      // Track project usage
      const projectId = data.metrics?.projectId || 'unknown';
      if (!projectCredits[projectId]) {
        projectCredits[projectId] = { credits: 0, scans: 0, name: projectId };
      }
      projectCredits[projectId].credits += data.creditsCharged || 0;
      projectCredits[projectId].scans++;
    }

    // Get top projects
    summary.topProjects = Object.entries(projectCredits)
      .map(([projectId, data]) => ({
        projectId,
        projectName: data.name,
        scans: data.scans,
        credits: data.credits,
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 5);
  } catch (error) {
    logger.warn('Failed to aggregate usage summary', { userId, error });
  }

  return summary;
}

// Get transactions from Firestore
async function getTransactions(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<CreditTransaction[]> {
  const db = getDb();
  if (!db) return [];

  try {
    // Fetch credit transactions
    const transactionsSnapshot = await db
      .collection('credit_transactions')
      .where('userId', '==', userId)
      .where('timestamp', '>=', periodStart)
      .where('timestamp', '<=', periodEnd)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const transactions: CreditTransaction[] = [];

    for (const doc of transactionsSnapshot.docs) {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        accountId: userId,
        timestamp: toDate(data.timestamp) || new Date(),
        type: data.type || 'scan',
        amount: data.amount || 0,
        balanceAfter: data.balanceAfter || 0,
        details: data.details,
      });
    }

    // If no transactions found in credit_transactions, try scan_billing
    if (transactions.length === 0) {
      const billingSnapshot = await db
        .collection('scan_billing')
        .where('userId', '==', userId)
        .where('timestamp', '>=', periodStart)
        .where('timestamp', '<=', periodEnd)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      for (const doc of billingSnapshot.docs) {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          accountId: userId,
          timestamp: toDate(data.timestamp) || new Date(),
          type: 'scan',
          amount: -(data.creditsCharged || 0),
          balanceAfter: data.balanceAfter || 0,
          details: {
            scanId: data.scanId,
            breakdown: data.breakdown,
          },
        });
      }
    }

    return transactions;
  } catch (error) {
    logger.warn('Failed to fetch transactions', { userId, error });
    return [];
  }
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
