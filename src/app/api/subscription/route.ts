import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase/admin';

/**
 * GET /api/subscription
 * Get current user's subscription status
 */
export async function GET() {
  try {
    // Get user from session (you'd replace this with your auth method)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { subscription: { tier: 'starter', status: 'none', scansUsedThisMonth: 0, projectCount: 0 } },
        { status: 200 }
      );
    }

    // Verify session and get user ID (implement based on your auth)
    // const userId = await verifySession(sessionCookie);

    // For now, return mock data - replace with actual Firestore query
    const userId = 'mock-user-id';

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
