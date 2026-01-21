import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/auth/session';

/**
 * GET /api/subscription
 * Get current user's subscription status
 */
export async function GET() {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json(
        { subscription: { tier: 'starter', status: 'none', scansUsedThisMonth: 0, projectCount: 0 } },
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
          tier: 'starter',
          status: 'none',
          scansUsedThisMonth: 0,
          projectCount: 0,
        },
      });
    }

    const data = subscriptionDoc.data();

    return NextResponse.json({
      subscription: {
        tier: data?.tier || 'starter',
        status: data?.status || 'none',
        stripeSubscriptionId: data?.stripeSubscriptionId,
        stripeCustomerId: data?.stripeCustomerId,
        currentPeriodEnd: data?.currentPeriodEnd?.toDate(),
        cancelAtPeriodEnd: data?.cancelAtPeriodEnd,
        scansUsedThisMonth: data?.scansUsedThisMonth || 0,
        projectCount: data?.projectCount || 0,
      },
    });
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
