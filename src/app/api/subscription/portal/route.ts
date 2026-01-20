import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createBillingPortalSession } from '@/lib/subscriptions/stripe';
import { db } from '@/lib/firebase/admin';

/**
 * POST /api/subscription/portal
 * Create a Stripe billing portal session
 */
export async function POST() {
  try {
    // Get user from session (replace with your auth method)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user ID (replace with your auth method)
    // const userId = await verifySession(sessionCookie);
    const userId = 'mock-user-id';

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
