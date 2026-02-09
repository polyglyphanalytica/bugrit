/**
 * POST /api/billing/purchase-credits
 *
 * Initiates a credit package purchase via Stripe Checkout.
 * Returns a checkout URL for the user to complete payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { getCreditPackage } from '@/lib/admin/service';
import { getStripeSecretKey } from '@/lib/admin/service';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Parse request body
    const body = await req.json();
    const { packageId } = body;

    if (!packageId) {
      return errorResponse('packageId is required', 400);
    }

    // Get the credit package
    const creditPackage = await getCreditPackage(packageId);
    if (!creditPackage) {
      return errorResponse('Credit package not found', 404);
    }

    if (!creditPackage.isActive) {
      return errorResponse('This credit package is no longer available', 400);
    }

    // Get Stripe secret key
    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      return errorResponse('Payment processing not configured', 503);
    }

    // Dynamically import Stripe to avoid issues during build
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Get or create Stripe price ID for this package
    let priceId = creditPackage.stripePriceId;

    if (!priceId) {
      // Create product and price in Stripe if not exists
      const product = await stripe.products.create({
        name: creditPackage.name,
        description: creditPackage.description,
        metadata: {
          packageId: creditPackage.id,
          credits: creditPackage.credits.toString(),
          type: 'credit_package',
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(creditPackage.price * 100), // Convert to cents
        currency: creditPackage.currency,
        metadata: {
          packageId: creditPackage.id,
          credits: creditPackage.credits.toString(),
        },
      });

      priceId = price.id;

      // TODO: Save the priceId back to the credit package in Firestore
    }

    // Create Stripe Checkout session
    // Get origin from headers or environment variable (do NOT fall back to hardcoded URLs)
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    if (!origin) {
      return errorResponse(
        'Application URL not configured. Set NEXT_PUBLIC_APP_URL environment variable.',
        503
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        type: 'credit_purchase',
      },
      success_url: `${origin}/settings/subscription?purchase=success&credits=${creditPackage.credits}`,
      cancel_url: `${origin}/settings/subscription?purchase=canceled`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Purchase credits error:', error);
    return errorResponse('Failed to initiate purchase', 500);
  }
}
