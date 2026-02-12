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
import { UsageSummary, CreditTransaction } from '@/lib/billing/types';
import { ToolCategory } from '@/lib/tools/registry';
import { AIFeature } from '@/lib/billing/credits';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getDb, toDate } from '@/lib/firestore';
import { devConsole } from '@/lib/console';

// Get usage summary from Firestore
async function getUsageSummary(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageSummary> {
  const db = getDb();

  // Default empty summary
  const emptySummary: UsageSummary = {
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
      container: { scans: 0, credits: 0, issues: 0 },
      sbom: { scans: 0, credits: 0, issues: 0 },
    } as Record<ToolCategory, { scans: number; credits: number; issues: number }>,
    byAIFeature: {
      summary: { uses: 0, credits: 0 },
      issue_explanations: { uses: 0, credits: 0 },
      fix_suggestions: { uses: 0, credits: 0 },
      priority_scoring: { uses: 0, credits: 0 },
    } as Record<AIFeature, { uses: number; credits: number }>,
    topProjects: [],
  };

  if (!db) {
    return emptySummary;
  }

  try {
    // Query scans for this user within the period
    const scansSnapshot = await db
      .collection('scans')
      .where('userId', '==', userId)
      .where('createdAt', '>=', periodStart)
      .where('createdAt', '<=', periodEnd)
      .orderBy('createdAt', 'desc')
      .get();

    if (scansSnapshot.empty) {
      return emptySummary;
    }

    const summary = { ...emptySummary };
    const projectStats = new Map<string, { name: string; scans: number; credits: number }>();

    for (const doc of scansSnapshot.docs) {
      const scan = doc.data();

      summary.totalScans++;
      summary.totalCreditsUsed += scan.creditsUsed || 0;
      summary.totalLinesScanned += scan.linesScanned || 0;
      summary.totalIssuesFound += scan.issuesFound || 0;

      // Aggregate by category
      if (scan.categoryStats) {
        for (const [category, stats] of Object.entries(scan.categoryStats)) {
          const catKey = category as ToolCategory;
          if (summary.byCategory[catKey]) {
            const catStats = stats as { credits?: number; issues?: number };
            summary.byCategory[catKey].scans++;
            summary.byCategory[catKey].credits += catStats.credits || 0;
            summary.byCategory[catKey].issues += catStats.issues || 0;
          }
        }
      }

      // Aggregate by AI feature
      if (scan.aiFeatureStats) {
        for (const [feature, stats] of Object.entries(scan.aiFeatureStats)) {
          const featureKey = feature as AIFeature;
          if (summary.byAIFeature[featureKey]) {
            const aiStats = stats as { credits?: number };
            summary.byAIFeature[featureKey].uses++;
            summary.byAIFeature[featureKey].credits += aiStats.credits || 0;
          }
        }
      }

      // Track project stats
      const projectId = scan.projectId;
      if (projectId) {
        const existing = projectStats.get(projectId) || {
          name: scan.projectName || projectId,
          scans: 0,
          credits: 0,
        };
        existing.scans++;
        existing.credits += scan.creditsUsed || 0;
        projectStats.set(projectId, existing);
      }
    }

    // Convert project stats to top projects array (sorted by credits)
    summary.topProjects = Array.from(projectStats.entries())
      .map(([projectId, stats]) => ({
        projectId,
        projectName: stats.name,
        scans: stats.scans,
        credits: stats.credits,
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 10);

    return summary;
  } catch (error) {
    devConsole.error('Error fetching usage summary:', error);
    return emptySummary;
  }
}

// Get credit transactions from Firestore
async function getTransactions(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<CreditTransaction[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  try {
    const snapshot = await db
      .collection('creditTransactions')
      .where('accountId', '==', userId)
      .where('timestamp', '>=', periodStart)
      .where('timestamp', '<=', periodEnd)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        accountId: data.accountId,
        timestamp: toDate(data.timestamp),
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        details: data.details || {},
      } as CreditTransaction;
    });
  } catch (error) {
    devConsole.error('Error fetching transactions:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user via API key or session
    const authResult = await requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

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
      response.summary = await getUsageSummary(userId, periodStart, periodEnd);
    }

    if (include === 'transactions' || include === 'both') {
      response.transactions = await getTransactions(userId, periodStart, periodEnd, limit);
    }

    return NextResponse.json(response);
  } catch (error) {
    devConsole.error('Usage error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
