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

// Mock auth - replace with actual implementation
function getUserFromRequest(req: NextRequest): { userId: string; tier: SubscriptionTier } | null {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');

  if (!apiKey && !authHeader) {
    return null;
  }

  return {
    userId: 'user_123',
    tier: 'pro',
  };
}

// Mock - get user's remaining credits
async function getUserCredits(userId: string): Promise<number> {
  // TODO: Fetch from Firestore
  return 153;
}

// Mock - estimate repo size from URL or project
async function estimateRepoSize(repoUrl?: string, projectId?: string): Promise<number | null> {
  // TODO: If we've scanned this repo before, return known size
  // TODO: Could also do a quick GitHub API call to estimate
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);

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
    console.error('Estimate error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to calculate estimate' },
      { status: 500 }
    );
  }
}
