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
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Get user's Stripe customer ID - check both subscriptions and users collections
    // (webhook stores in subscriptions, some flows may store in users)
    let stripeCustomerId: string | undefined;

    // First check subscriptions collection (where webhook stores it)
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
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
      apiVersion: '2025-12-15.clover',
    });

    // Create portal session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return errorResponse('NEXT_PUBLIC_APP_URL environment variable is required in production', 500);
      }
      return errorResponse('Missing origin header and NEXT_PUBLIC_APP_URL environment variable', 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings/subscription`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    logger.error('Billing portal error', {
      path: '/api/billing/portal',
      method: 'POST',
      error,
    });
    return errorResponse('Failed to open billing portal', 500);
  }
}
