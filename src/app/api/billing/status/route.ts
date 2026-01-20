/**
 * GET /api/billing/status
 *
 * Returns current billing status for authenticated user.
 * Designed to be called by external apps to check balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/billing/credits';
import { BillingStatus } from '@/lib/billing/types';

// Mock function - replace with actual auth
function getUserFromRequest(req: NextRequest): { userId: string; tier: SubscriptionTier } | null {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');

  if (!apiKey && !authHeader) {
    return null;
  }

  // TODO: Validate API key or JWT and get user
  // For now, return mock data
  return {
    userId: 'user_123',
    tier: 'pro',
  };
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
    const user = getUserFromRequest(req);

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
    console.error('Billing status error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to fetch billing status' },
      { status: 500 }
    );
  }
}
