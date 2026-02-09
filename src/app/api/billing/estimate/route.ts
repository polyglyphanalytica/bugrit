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
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getDb } from '@/lib/firestore';

interface UserBillingContext {
  userId: string;
  tier: SubscriptionTier;
  credits: number;
}

// Get user's billing context (tier and remaining credits)
async function getUserBillingContext(userId: string): Promise<UserBillingContext> {
  const db = getDb();

  if (!db) {
    // Demo/development fallback
    return {
      userId,
      tier: 'starter',
      credits: 50,
    };
  }

  try {
    // Check user's default organization first
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const defaultOrgId = userData?.defaultOrganizationId;

      if (defaultOrgId) {
        const orgDoc = await db.collection('organizations').doc(defaultOrgId).get();

        if (orgDoc.exists) {
          const orgData = orgDoc.data();
          const subscription = orgData?.subscription || {};
          const billing = orgData?.billing || {};

          return {
            userId,
            tier: (subscription.tier as SubscriptionTier) || 'starter',
            credits: billing.creditsRemaining ?? 50,
          };
        }
      }
    }

    // Check billing_accounts collection (where webhooks write data)
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();

    if (billingDoc.exists) {
      const data = billingDoc.data()!;
      // Get tier from users collection (authoritative) or billing data
      const tier = (userDoc.exists ? userDoc.data()?.tier : null) as SubscriptionTier
        || (data.subscription?.tier as SubscriptionTier)
        || 'free';
      return {
        userId,
        tier,
        credits: data.credits?.remaining ?? SUBSCRIPTION_TIERS[tier]?.credits ?? 10,
      };
    }

    // Legacy fallback: Check billingAccounts (camelCase) collection
    const legacyBillingDoc = await db.collection('billingAccounts').doc(userId).get();

    if (legacyBillingDoc.exists) {
      const data = legacyBillingDoc.data()!;
      return {
        userId,
        tier: (data.tier as SubscriptionTier) || 'starter',
        credits: data.credits?.remaining ?? 50,
      };
    }

    // No billing account - return free tier defaults
    return {
      userId,
      tier: 'free',
      credits: SUBSCRIPTION_TIERS.free.credits,
    };
  } catch (error) {
    console.error('Error fetching user billing context:', error);
    return {
      userId,
      tier: 'free',
      credits: SUBSCRIPTION_TIERS.free.credits,
    };
  }
}

// Estimate repo size from previous scans
async function estimateRepoSize(repoUrl?: string, projectId?: string): Promise<number | null> {
  const db = getDb();

  if (!db || (!repoUrl && !projectId)) {
    return null;
  }

  try {
    // If we have a projectId, look up the most recent scan for that project
    if (projectId) {
      const scansSnapshot = await db
        .collection('scans')
        .where('projectId', '==', projectId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!scansSnapshot.empty) {
        const lastScan = scansSnapshot.docs[0].data();
        return lastScan.linesScanned || null;
      }
    }

    // If we have a repoUrl, look up scans for that repo
    if (repoUrl) {
      const scansSnapshot = await db
        .collection('scans')
        .where('repoUrl', '==', repoUrl)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!scansSnapshot.empty) {
        const lastScan = scansSnapshot.docs[0].data();
        return lastScan.linesScanned || null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error estimating repo size:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user via API key or session
    const authResult = await requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Get user's billing context (tier and credits)
    const userContext = await getUserBillingContext(userId);

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

    // Use credits from user context
    const currentBalance = userContext.credits;

    // Check affordability
    const affordCheck = canAffordScan(currentBalance, estimate, userContext.tier);

    // Calculate overage if applicable
    const tierConfig = SUBSCRIPTION_TIERS[userContext.tier];
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
