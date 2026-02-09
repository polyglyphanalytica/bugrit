/**
 * Admin API for managing individual Stripe Promo Codes
 *
 * DELETE: Deactivate a promotion code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey } from '@/lib/admin/service';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { logger } from '@/lib/logger';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySuperadmin(req);
    if (!auth.success) return auth.response;

    const { id } = await params;

    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
    });

    // Deactivate the promotion code
    await stripe.promotionCodes.update(id, {
      active: false,
    });

    logger.info('Promo code deactivated', { id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to deactivate promo code', { error });

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to deactivate promo code' }, { status: 500 });
  }
}
