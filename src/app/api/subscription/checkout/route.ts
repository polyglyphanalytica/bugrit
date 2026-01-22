import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/subscriptions/stripe';
import { TierName, TIERS } from '@/lib/subscriptions/tiers';
import { verifySession } from '@/lib/auth/session';
import { db } from '@/lib/firebase/admin';
import { canChangeSubscriptionPlan } from '@/lib/billing/dunning';

// Get valid paid tiers from TIERS constant
const PAID_TIER_NAMES = (Object.keys(TIERS) as TierName[]).filter(
  (name) => TIERS[name].priceMonthly > 0
);

/**
 * POST /api/subscription/checkout
 * Create a Stripe checkout session for subscription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, interval } = body as {
      tier: TierName;
      interval: 'month' | 'year';
    };

    // Validate tier - only allow paid tiers
    if (!PAID_TIER_NAMES.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${PAID_TIER_NAMES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate interval
    if (!['month', 'year'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval' },
        { status: 400 }
      );
    }

    const user = await verifySession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is in dunning state (payment past due)
    // Block plan changes until payment is resolved to avoid billing complications
    const planChangeCheck = await canChangeSubscriptionPlan(user.uid);
    if (!planChangeCheck.allowed) {
      return NextResponse.json(
        { error: planChangeCheck.reason },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await db
      .collection('subscriptions')
      .doc(user.uid)
      .get();

    const subData = existingSubscription.data();
    if (subData?.status === 'active' && subData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Please use the billing portal to change plans.' },
        { status: 400 }
      );
    }

    // Check for existing Stripe customer ID (from previous credit purchases or canceled subscription)
    let existingCustomerId: string | undefined = subData?.stripeCustomerId;
    if (!existingCustomerId) {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        existingCustomerId = userDoc.data()?.stripeCustomerId;
      }
    }

    // Create checkout session
    const { url } = await createCheckoutSession({
      userId: user.uid,
      userEmail: user.email || '',
      tier,
      interval,
      customerId: existingCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?subscription=canceled`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
