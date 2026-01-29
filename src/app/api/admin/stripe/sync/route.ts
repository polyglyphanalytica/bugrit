import { NextRequest, NextResponse } from 'next/server';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { syncPricingToStripe, importFromStripe } from '@/lib/admin/stripe-sync';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/stripe/sync
 * Sync pricing to Stripe or import from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperadmin(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { direction } = body;

    if (direction === 'toStripe') {
      // Push local pricing to Stripe
      const result = await syncPricingToStripe(auth.context.userId);
      return NextResponse.json(result);
    } else if (direction === 'fromStripe') {
      // Import from Stripe
      const result = await importFromStripe(auth.context.userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: 'Invalid direction. Must be "toStripe" or "fromStripe"' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Stripe sync failed', { error });
    return NextResponse.json({ error: 'Stripe sync failed' }, { status: 500 });
  }
}
