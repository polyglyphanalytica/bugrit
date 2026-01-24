import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import {
  getPricingConfig,
  updatePricingConfig,
  deletePricingTier,
} from '@/lib/admin/service';
import { archiveStripeProduct, getStripeProductUrl } from '@/lib/admin/stripe-sync';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ tierName: string }>;
}

/**
 * GET /api/admin/pricing/[tierName]
 * Get a specific pricing tier
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  try {
    const { tierName } = await params;
    const tier = await getPricingConfig(tierName);

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Get Stripe dashboard URL if linked
    const stripeUrl = await getStripeProductUrl(tierName);

    return NextResponse.json({ tier, stripeUrl });
  } catch (error) {
    logger.error('Failed to get tier', { error });
    return NextResponse.json({ error: 'Failed to get tier' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/pricing/[tierName]
 * Update a pricing tier
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  try {
    const { tierName } = await params;
    const body = await request.json();

    // Check tier exists
    const existing = await getPricingConfig(tierName);
    if (!existing) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Prevent changing tierName (immutable identifier)
    if (body.tierName && body.tierName !== tierName) {
      return NextResponse.json(
        { error: 'Cannot change tier name. Create a new tier instead.' },
        { status: 400 }
      );
    }

    // Prevent setting free tier price > 0
    if (tierName === 'starter' && body.priceMonthly > 0) {
      return NextResponse.json(
        { error: 'Free tier must have a price of 0' },
        { status: 400 }
      );
    }

    await updatePricingConfig(tierName, body, auth.context.userId);

    const updated = await getPricingConfig(tierName);

    return NextResponse.json({ success: true, tier: updated });
  } catch (error) {
    logger.error('Failed to update tier', { error });
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/pricing/[tierName]
 * Delete a pricing tier
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  try {
    const { tierName } = await params;

    // Check tier exists
    const existing = await getPricingConfig(tierName);
    if (!existing) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Prevent deleting free tier
    if (tierName === 'starter') {
      return NextResponse.json(
        { error: 'Cannot delete the free tier' },
        { status: 400 }
      );
    }

    // Archive in Stripe if linked
    if (existing.stripeProductId) {
      const archiveResult = await archiveStripeProduct(tierName, auth.context.userId);
      if (!archiveResult.success) {
        logger.warn('Failed to archive Stripe product', { error: archiveResult.error });
        // Continue with local deletion even if Stripe archive fails
      }
    }

    await deletePricingTier(tierName, auth.context.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete tier', { error });
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
  }
}
