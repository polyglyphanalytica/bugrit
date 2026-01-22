/**
 * Admin API for Stripe Promo Codes
 *
 * GET: List all promotion codes
 * POST: Create a new promotion code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      return NextResponse.json({ promoCodes: [], error: 'Stripe not configured' });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // List all promotion codes
    const promotionCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.coupon'],
    });

    const promoCodes = promotionCodes.data.map((promo) => ({
      id: promo.id,
      code: promo.code,
      active: promo.active,
      couponId: promo.coupon.id,
      percentOff: promo.coupon.percent_off,
      amountOff: promo.coupon.amount_off ? promo.coupon.amount_off / 100 : 0, // Convert from cents
      duration: promo.coupon.duration,
      durationInMonths: promo.coupon.duration_in_months,
      maxRedemptions: promo.max_redemptions,
      timesRedeemed: promo.times_redeemed,
      expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
      createdAt: new Date(promo.created * 1000).toISOString(),
    }));

    return NextResponse.json({ promoCodes });
  } catch (error) {
    logger.error('Failed to list promo codes', { error });
    return NextResponse.json({ promoCodes: [], error: 'Failed to fetch promo codes' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, percentOff, amountOff, duration, durationInMonths, maxRedemptions, expiresAt } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!percentOff && !amountOff) {
      return NextResponse.json({ error: 'Either percentOff or amountOff is required' }, { status: 400 });
    }

    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // First, create the coupon
    const couponParams: Stripe.CouponCreateParams = {
      duration: duration || 'once',
      name: `${code} Discount`,
    };

    if (percentOff && percentOff > 0) {
      couponParams.percent_off = percentOff;
    } else if (amountOff && amountOff > 0) {
      couponParams.amount_off = Math.round(amountOff * 100); // Convert to cents
      couponParams.currency = 'usd';
    }

    if (duration === 'repeating' && durationInMonths) {
      couponParams.duration_in_months = durationInMonths;
    }

    const coupon = await stripe.coupons.create(couponParams);

    // Then, create the promotion code
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: coupon.id,
      code: code.toUpperCase(),
    };

    if (maxRedemptions && maxRedemptions > 0) {
      promoParams.max_redemptions = maxRedemptions;
    }

    if (expiresAt) {
      promoParams.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const promotionCode = await stripe.promotionCodes.create(promoParams);

    logger.info('Promo code created', { code: promotionCode.code, couponId: coupon.id });

    return NextResponse.json({
      success: true,
      promoCode: {
        id: promotionCode.id,
        code: promotionCode.code,
        couponId: coupon.id,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create promo code', { error });

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}
