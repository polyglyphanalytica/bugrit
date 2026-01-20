import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/subscriptions/stripe';
import { TierName } from '@/lib/subscriptions/tiers';

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

    // Get user from session (replace with your auth method)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user details (replace with your auth method)
    // const user = await verifySession(sessionCookie);
    const user = {
      id: 'mock-user-id',
      email: 'user@example.com',
    };

    // Create checkout session
    const { url } = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
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
