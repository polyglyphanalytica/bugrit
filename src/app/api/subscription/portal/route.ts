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

    // Get Stripe customer ID from Firestore
    const subscriptionDoc = await db
      .collection('subscriptions')
      .doc(userId)
      .get();

    const stripeCustomerId = subscriptionDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Create billing portal session
    const { url } = await createBillingPortalSession(
      stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
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
