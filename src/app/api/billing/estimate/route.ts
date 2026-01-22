/**
 * POST /api/billing/estimate
 *
 * Estimate credit cost for a scan before running it.
 * Returns breakdown and whether user can afford it.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateCredits,
  canAffordScan,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
} from '@/lib/billing/credits';
import { ScanEstimateRequest, ScanEstimateResponse } from '@/lib/billing/types';
import { authenticateRequest, ApiKeyContext } from '@/lib/api/auth';
import { ApiException } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { getBillingAccount } from '@/lib/billing/scan-billing';
import { getDb, COLLECTIONS } from '@/lib/firestore';

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

// Get user's remaining credits from Firestore
async function getUserCredits(userId: string): Promise<number> {
  const account = await getBillingAccount(userId);
  return account?.credits.remaining ?? 0;
}

// Estimate repo size from URL or project based on historical scans
async function estimateRepoSize(repoUrl?: string, projectId?: string): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  try {
    // If we have a projectId, look up recent scans to get actual lines of code
    if (projectId) {
      const scansSnapshot = await db
        .collection(COLLECTIONS.SCANS)
        .where('projectId', '==', projectId)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!scansSnapshot.empty) {
        const scanData = scansSnapshot.docs[0].data();
        // Check if we stored linesOfCode in metadata
        const linesOfCode = scanData?.metadata?.billing?.linesOfCode ||
                           scanData?.metadata?.linesOfCode;
        if (typeof linesOfCode === 'number' && linesOfCode > 0) {
          return linesOfCode;
        }
      }
    }

    // If we have a repoUrl, try to find a project with this URL and its scan history
    if (repoUrl) {
      const projectsSnapshot = await db
        .collection(COLLECTIONS.PROJECTS)
        .where('repositoryUrl', '==', repoUrl)
        .limit(1)
        .get();

      if (!projectsSnapshot.empty) {
        const projectData = projectsSnapshot.docs[0];
        const scansSnapshot = await db
          .collection(COLLECTIONS.SCANS)
          .where('projectId', '==', projectData.id)
          .where('status', '==', 'completed')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (!scansSnapshot.empty) {
          const scanData = scansSnapshot.docs[0].data();
          const linesOfCode = scanData?.metadata?.billing?.linesOfCode ||
                             scanData?.metadata?.linesOfCode;
          if (typeof linesOfCode === 'number' && linesOfCode > 0) {
            return linesOfCode;
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to estimate repo size', { repoUrl, projectId, error });
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid API key or auth token required' },
        { status: 401 }
      );
    }

    const body: ScanEstimateRequest = await req.json();

    // Validate config
    if (!body.config || !body.config.categories || body.config.categories.length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Scan config with at least one category is required' },
        { status: 400 }
      );
    }

    // Try to estimate lines if not provided
    let estimatedLines = body.estimatedLines || body.config.estimatedLines;
    if (!estimatedLines && (body.repoUrl || body.projectId)) {
      const knownSize = await estimateRepoSize(body.repoUrl, body.projectId);
      if (knownSize) {
        estimatedLines = knownSize;
      }
    }

    // Update config with estimated lines
    const configWithEstimates = {
      ...body.config,
      estimatedLines,
    };

    // Calculate credits
    const estimate = calculateCredits(configWithEstimates);

    // Get user's balance
    const currentBalance = await getUserCredits(user.userId);

    // Check affordability
    const affordCheck = canAffordScan(currentBalance, estimate, user.tier);

    // Calculate overage if applicable
    const tierConfig = SUBSCRIPTION_TIERS[user.tier];
    let overageAmount: number | undefined;
    let overageCost: number | undefined;

    if (estimate.total > currentBalance && tierConfig.overageRate) {
      overageAmount = estimate.total - currentBalance;
      overageCost = overageAmount * tierConfig.overageRate;
    }

    const warnings = [...estimate.warnings];
    if (!estimatedLines) {
      warnings.push('Repo size unknown. Estimate assumes small repo (~10K lines). Actual cost may be higher.');
    }
    if (affordCheck.reason) {
      warnings.push(affordCheck.reason);
    }

    const response: ScanEstimateResponse = {
      estimate,
      canAfford: affordCheck.allowed,
      currentBalance,
      overageAmount,
      overageCost,
      warnings,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Estimate error', {
      path: '/api/billing/estimate',
      method: 'POST',
      error,
    });
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to calculate estimate' },
      { status: 500 }
    );
  }
}
