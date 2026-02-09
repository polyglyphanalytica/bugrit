/**
 * POST /api/billing/purchase-credits
 *
 * Initiates a credit package purchase via Stripe Checkout.
 * Returns a checkout URL for the user to complete payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { getCreditPackage, getStripeSecretKey, updateCreditPackage } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuthenticatedUser(req);
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
      apiVersion: '2026-01-28.clover',
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

      // Persist the Stripe price ID so we don't recreate it on every purchase
      try {
        await updateCreditPackage(creditPackage.id, { stripePriceId: priceId }, 'system');
      } catch (e) {
        logger.warn('Failed to persist stripePriceId for credit package', { packageId: creditPackage.id, error: e });
      }
    }

    // Validate origin to prevent open redirect — only allow configured app URL or localhost
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const rawOrigin = req.headers.get('origin');
    let safeOrigin = appUrl;

    if (rawOrigin && appUrl) {
      try {
        const originUrl = new URL(rawOrigin);
        const appUrlParsed = new URL(appUrl);
        const allowedHosts = [appUrlParsed.host, 'localhost:3000', '127.0.0.1:3000'];
        if (allowedHosts.includes(originUrl.host)) {
          safeOrigin = rawOrigin;
        }
      } catch {
        // Invalid origin URL, use configured app URL
      }
    }

    if (!safeOrigin) {
      return errorResponse(
        'Application URL not configured. Set NEXT_PUBLIC_APP_URL environment variable.',
        503
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: userId,
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
    logger.error('Purchase credits error', { error });
    return errorResponse('Failed to initiate purchase', 500);
  }
}
