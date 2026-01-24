import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/auth/session';
import { getGracePeriodInfo } from '@/lib/billing/dunning';
import { logger } from '@/lib/logger';

/**
 * GET /api/subscription
 * Get current user's subscription status
 */
export async function GET() {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json(
        { subscription: { tier: 'free', status: 'none', scansUsedThisMonth: 0, projectCount: 0 } },
        { status: 200 }
      );
    }

    const userId = user.uid;

    // Get subscription from Firestore
    const subscriptionDoc = await db
      .collection('subscriptions')
      .doc(userId)
      .get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json({
        subscription: {
          tier: 'free',
          status: 'none',
          scansUsedThisMonth: 0,
          projectCount: 0,
        },
      });
    }

    const data = subscriptionDoc.data();

    // Get grace period info if user is in dunning state
    const gracePeriod = await getGracePeriodInfo(userId);

    return NextResponse.json({
      subscription: {
        tier: data?.tier || 'free',
        status: data?.status || 'none',
        stripeSubscriptionId: data?.stripeSubscriptionId,
        stripeCustomerId: data?.stripeCustomerId,
        currentPeriodEnd: data?.currentPeriodEnd?.toDate(),
        cancelAtPeriodEnd: data?.cancelAtPeriodEnd,
        scansUsedThisMonth: data?.scansUsedThisMonth || 0,
        projectCount: data?.projectCount || 0,
        // Grace period info for payment failure recovery
        gracePeriod: gracePeriod?.inGracePeriod ? {
          inGracePeriod: true,
          daysRemaining: gracePeriod.daysRemaining,
          expiresAt: gracePeriod.expiresAt,
          reminderLevel: gracePeriod.reminderLevel,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Failed to get subscription', { error });
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
