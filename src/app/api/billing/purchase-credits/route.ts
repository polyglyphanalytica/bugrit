/**
 * POST /api/billing/purchase-credits
 *
 * Initiates a credit package purchase via Stripe Checkout.
 * Returns a checkout URL for the user to complete payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { getCreditPackage, updateCreditPackage } from '@/lib/admin/service';
import { getStripeSecretKey } from '@/lib/admin/service';
import { db } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

// Validate and get safe return URL to prevent open redirect attacks
function getSafeReturnUrl(origin: string | null): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  // If no origin provided, use configured app URL
  if (!origin) return appUrl;

  try {
    const originUrl = new URL(origin);
    const appUrlParsed = new URL(appUrl);

    // Only allow the exact configured domain or localhost for development
    const allowedHosts = [
      appUrlParsed.host,
      'localhost:3000',
      '127.0.0.1:3000',
    ];

    if (allowedHosts.includes(originUrl.host)) {
      return origin;
    }

    // Origin not in whitelist, use configured app URL
    return appUrl;
  } catch {
    // Invalid URL, use configured app URL
    return appUrl;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Check if user already has a Stripe customer ID
    let existingCustomerId: string | undefined;
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      existingCustomerId = userDoc.data()?.stripeCustomerId;
    }
    // Also check subscriptions collection
    if (!existingCustomerId) {
      const subDoc = await db.collection('subscriptions').doc(userId).get();
      if (subDoc.exists) {
        existingCustomerId = subDoc.data()?.stripeCustomerId;
      }
    }

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
      apiVersion: '2025-12-15.clover',
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

      // Save the priceId back to the credit package in Firestore
      try {
        await updateCreditPackage(creditPackage.id, { stripePriceId: priceId }, 'system');
      } catch (saveError) {
        logger.warn('Failed to save stripePriceId to credit package', {
          packageId: creditPackage.id,
          priceId,
          error: saveError,
        });
        // Continue anyway - the price was created in Stripe
      }
    }

    // Create Stripe Checkout session with validated return URLs
    const safeOrigin = getSafeReturnUrl(req.headers.get('origin'));

    if (!safeOrigin) {
      return errorResponse('NEXT_PUBLIC_APP_URL environment variable is required', 500);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Card + Link for faster checkout (Stripe's one-click payment)
      payment_method_types: ['card', 'link'],
      // Reuse existing customer for consolidated billing history
      ...(existingCustomerId && { customer: existingCustomerId }),
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
      success_url: `${safeOrigin}/settings/subscription?purchase=success&credits=${creditPackage.credits}`,
      cancel_url: `${safeOrigin}/settings/subscription?purchase=canceled`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error('Purchase credits error', {
      path: '/api/billing/purchase-credits',
      method: 'POST',
      error,
    });
    return errorResponse('Failed to initiate purchase', 500);
  }
}
