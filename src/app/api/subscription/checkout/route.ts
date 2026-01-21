import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/subscriptions/stripe';
import { TierName } from '@/lib/subscriptions/tiers';
import { verifySession } from '@/lib/auth/session';

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

    // Validate tier
    if (!['pro', 'business'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
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

    // Create checkout session
    const { url } = await createCheckoutSession({
      userId: user.uid,
      userEmail: user.email || '',
      tier,
      interval,
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
