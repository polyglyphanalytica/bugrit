/**
 * Enterprise Tier Gate
 *
 * Autofix is available only on the Enterprise subscription tier.
 * Returns a 403 response if the user isn't on Enterprise.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export async function requireEnterpriseTier(userId: string): Promise<NextResponse | null> {
  try {
    const billingDoc = await db.collection('billing').doc(userId).get();

    if (!billingDoc.exists) {
      return NextResponse.json(
        { error: 'Autofix requires an Enterprise subscription', upgradeUrl: '/pricing' },
        { status: 403 }
      );
    }

    const billing = billingDoc.data()!;
    const tier = billing.tier || billing.plan || 'free';

    if (tier !== 'enterprise') {
      return NextResponse.json(
        {
          error: 'Autofix requires an Enterprise subscription',
          currentTier: tier,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    return null; // Allowed
  } catch (error) {
    logger.error('Enterprise tier check failed', { userId, error });
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    );
  }
}
