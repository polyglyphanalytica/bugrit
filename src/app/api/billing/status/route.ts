/**
 * GET /api/billing/status
 *
 * Returns current billing status for authenticated user.
 * Designed to be called by external apps to check balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/billing/credits';
import { BillingStatus } from '@/lib/billing/types';
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

// Mock function - replace with Firestore lookup
async function getBillingAccount(userId: string) {
  // TODO: Fetch from Firestore
  return {
    tier: 'pro' as SubscriptionTier,
    credits: {
      included: 200,
      used: 47,
      remaining: 153,
      rollover: 0,
    },
    subscription: {
      status: 'active' as const,
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      cancelAtPeriodEnd: false,
    },
  };
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

    const account = await getBillingAccount(user.userId);
    const tierConfig = SUBSCRIPTION_TIERS[account.tier];

    const status: BillingStatus = {
      tier: account.tier,
      tierName: tierConfig.name,

      credits: {
        remaining: account.credits.remaining,
        included: account.credits.included,
        used: account.credits.used,
        rollover: account.credits.rollover,
        percentUsed: Math.round((account.credits.used / account.credits.included) * 100),
      },

      subscription: {
        status: account.subscription.status,
        renewsAt: account.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: account.subscription.cancelAtPeriodEnd,
      },

      limits: {
        maxProjects: tierConfig.features.maxProjects,
        maxRepoSize: tierConfig.features.maxRepoSize,
        aiFeatures: tierConfig.features.aiFeatures,
      },

      canScan: account.credits.remaining > 0 || tierConfig.overageRate !== null,
      needsUpgrade: account.credits.remaining < 10 && tierConfig.overageRate === null,
      overageEnabled: tierConfig.overageRate !== null,
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Billing status error', {
      path: '/api/billing/status',
      method: 'GET',
      error,
    });
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to fetch billing status' },
      { status: 500 }
    );
  }
}
