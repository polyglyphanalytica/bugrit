/**
 * POST /api/billing/portal
 *
 * Returns a URL to the Stripe Customer Portal where users can manage
 * their subscription, payment methods, and billing history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { db } from '@/lib/firebase/admin';
import { getStripeSecretKey } from '@/lib/admin/service';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Get user's Stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      return errorResponse(
        'No billing account found. Subscribe to a plan first.',
        400
      );
    }

    // Get Stripe secret key
    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      return errorResponse('Payment processing not configured', 503);
    }

    // Dynamically import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Create portal session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings/subscription`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Billing portal error:', error);
    return errorResponse('Failed to open billing portal', 500);
  }
}
