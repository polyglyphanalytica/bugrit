import { NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/subscriptions/stripe';
import { db } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/auth/session';

/**
 * POST /api/subscription/portal
 * Create a Stripe billing portal session
 */
export async function POST() {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.uid;

    // Get Stripe customer ID - check both subscriptions and users collections
    let stripeCustomerId: string | undefined;

    // First check subscriptions collection (where webhook stores it)
    const subscriptionDoc = await db
      .collection('subscriptions')
      .doc(userId)
      .get();

    if (subscriptionDoc.exists) {
      stripeCustomerId = subscriptionDoc.data()?.stripeCustomerId;
    }

    // Fallback to users collection
    if (!stripeCustomerId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found. Subscribe to a plan first.' },
        { status: 404 }
      );
    }

    // Create billing portal session
    const { url } = await createBillingPortalSession(
      stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to create billing portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
