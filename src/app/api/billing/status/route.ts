/**
 * GET /api/billing/status
 *
 * Returns current billing status for authenticated user.
 * Designed to be called by external apps to check balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/billing/credits';
import { BillingStatus } from '@/lib/billing/types';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { getDb, toDate } from '@/lib/firestore';
import { devConsole } from '@/lib/console';

interface BillingAccountData {
  tier: SubscriptionTier;
  credits: {
    included: number;
    used: number;
    remaining: number;
    reserved: number;
    rollover: number;
  };
  subscription: {
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
}

async function getBillingAccount(userId: string): Promise<BillingAccountData> {
  const db = getDb();

  if (!db) {
    // Fallback for demo/development mode - return starter tier defaults
    return {
      tier: 'starter',
      credits: {
        included: 50,
        used: 0,
        remaining: 50,
        reserved: 0,
        rollover: 0,
      },
      subscription: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    };
  }

  try {
    // First try to find user's default organization billing
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (userDoc.exists) {
      const defaultOrgId = userData?.defaultOrganizationId;

      if (defaultOrgId) {
        // Get organization billing data
        const orgDoc = await db.collection('organizations').doc(defaultOrgId).get();

        if (orgDoc.exists) {
          const orgData = orgDoc.data();
          const subscription = orgData?.subscription || {};
          const billing = orgData?.billing || {};

          return {
            tier: (subscription.tier as SubscriptionTier) || 'starter',
            credits: {
              included: billing.creditsIncluded || SUBSCRIPTION_TIERS[(subscription.tier || 'starter') as SubscriptionTier]?.credits || 50,
              used: billing.creditsUsed || 0,
              remaining: billing.creditsRemaining ?? (billing.creditsIncluded || 50) - (billing.creditsUsed || 0),
              reserved: billing.creditsReserved || 0,
              rollover: billing.creditsRollover || 0,
            },
            subscription: {
              status: subscription.status || 'active',
              currentPeriodEnd: subscription.currentPeriodEnd
                ? toDate(subscription.currentPeriodEnd)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
            },
          };
        }
      }
    }

    // Check billing_accounts collection (where webhooks write data)
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();

    if (billingDoc.exists) {
      const data = billingDoc.data()!;
      // Get tier from users collection (authoritative source) or billing data
      const tier = (userData?.tier as SubscriptionTier) || (data.subscription?.tier as SubscriptionTier) || 'free';
      const tierCredits = SUBSCRIPTION_TIERS[tier]?.credits || 10;
      return {
        tier,
        credits: {
          included: data.credits?.included || tierCredits,
          used: data.credits?.used || 0,
          remaining: data.credits?.remaining ?? tierCredits,
          reserved: data.credits?.reserved || 0,
          rollover: data.credits?.rollover || 0,
        },
        subscription: {
          status: data.subscription?.status || 'active',
          currentPeriodEnd: data.subscription?.currentPeriodEnd
            ? toDate(data.subscription.currentPeriodEnd)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: data.subscription?.cancelAtPeriodEnd || false,
        },
      };
    }

    // Legacy fallback: Check billingAccounts (camelCase) collection
    const legacyBillingDoc = await db.collection('billingAccounts').doc(userId).get();

    if (legacyBillingDoc.exists) {
      const data = legacyBillingDoc.data()!;
      return {
        tier: (data.tier as SubscriptionTier) || 'starter',
        credits: {
          included: data.credits?.included || 50,
          used: data.credits?.used || 0,
          remaining: data.credits?.remaining ?? 50,
          reserved: data.credits?.reserved || 0,
          rollover: data.credits?.rollover || 0,
        },
        subscription: {
          status: data.subscription?.status || 'active',
          currentPeriodEnd: data.subscription?.currentPeriodEnd
            ? toDate(data.subscription.currentPeriodEnd)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: data.subscription?.cancelAtPeriodEnd || false,
        },
      };
    }

    // No billing account found - return free tier defaults
    return {
      tier: 'free',
      credits: {
        included: SUBSCRIPTION_TIERS.free.credits,
        used: 0,
        remaining: SUBSCRIPTION_TIERS.free.credits,
        reserved: 0,
        rollover: 0,
      },
      subscription: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    };
  } catch (error) {
    devConsole.error('Error fetching billing account:', error);
    // Return free tier on error
    return {
      tier: 'free',
      credits: {
        included: SUBSCRIPTION_TIERS.free.credits,
        used: 0,
        remaining: SUBSCRIPTION_TIERS.free.credits,
        reserved: 0,
        rollover: 0,
      },
      subscription: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    };
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

    const account = await getBillingAccount(userId);
    const tierConfig = SUBSCRIPTION_TIERS[account.tier];

    const status: BillingStatus = {
      tier: account.tier,
      tierName: tierConfig.name,

      credits: {
        remaining: account.credits.remaining,
        included: account.credits.included,
        used: account.credits.used,
        reserved: account.credits.reserved,
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
        aiFeatures: [...tierConfig.features.aiFeatures],
      },

      canScan: account.credits.remaining > 0 || tierConfig.overageRate !== null,
      needsUpgrade: account.credits.remaining < 10 && tierConfig.overageRate === null,
      overageEnabled: tierConfig.overageRate !== null,
    };

    return NextResponse.json(status);
  } catch (error) {
    devConsole.error('Billing status error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to fetch billing status' },
      { status: 500 }
    );
  }
}
