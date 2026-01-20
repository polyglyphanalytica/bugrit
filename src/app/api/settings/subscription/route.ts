/**
 * GET /api/settings/subscription
 *
 * Returns the authenticated user's subscription status, usage limits, and auto-topup settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { db } from '@/lib/firebase/admin';
import { getPricingConfig } from '@/lib/admin/service';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const tier = userData?.tier || 'free';

    // Get billing account data
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();
    const billingData = billingDoc.exists ? billingDoc.data() : {};

    // Get tier limits from pricing config
    const pricingConfig = await getPricingConfig(tier);
    const limits = pricingConfig?.limits || {
      credits: 10,
      creditsRollover: 0,
      projects: 1,
      teamMembers: 1,
    };

    // Build response
    const response = {
      subscription: {
        tier,
        status: billingData?.subscription?.status || 'none',
        currentPeriodEnd: billingData?.subscription?.currentPeriodEnd?.toDate?.()?.toISOString() || null,
        cancelAtPeriodEnd: billingData?.subscription?.cancelAtPeriodEnd || false,
      },
      usage: {
        credits: {
          used: billingData?.credits?.used || 0,
          limit: limits.credits,
          rollover: billingData?.credits?.rollover || 0,
          purchased: billingData?.credits?.purchased || 0,
        },
        projects: {
          used: billingData?.usage?.projects || 0,
          limit: limits.projects,
        },
        teamMembers: {
          used: billingData?.usage?.teamMembers || 1,
          limit: limits.teamMembers,
        },
      },
      autoTopup: billingData?.autoTopup || {
        enabled: false,
        triggerThreshold: 10,
        packageId: '',
        maxPerMonth: 3,
        purchasesThisMonth: 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Subscription status error:', error);
    return errorResponse('Failed to fetch subscription status', 500);
  }
}
