import { NextRequest, NextResponse } from 'next/server';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { getStripeConfig, updateStripeConfig } from '@/lib/admin/service';
import { testStripeConnection, syncPricingToStripe, importFromStripe } from '@/lib/admin/stripe-sync';

/**
 * GET /api/admin/stripe
 * Get Stripe configuration status
 */
export async function GET(request: NextRequest) {
  const auth = await verifySuperadmin(request);
  if (!auth.success) return auth.response;

  try {
    const config = await getStripeConfig();
    const connectionTest = config?.isConfigured ? await testStripeConnection() : null;

    return NextResponse.json({
      config: config || { isConfigured: false },
      connection: connectionTest,
    });
  } catch (error) {
    console.error('Failed to get Stripe config:', error);
    return NextResponse.json({ error: 'Failed to get Stripe config' }, { status: 500 });
  }
}

/**
 * POST /api/admin/stripe
 * Update Stripe configuration
 */
export async function POST(request: NextRequest) {
  const auth = await verifySuperadmin(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { secretKey, publishableKey, webhookSecret, mode } = body;

    // Validate mode if provided
    if (mode && !['test', 'live'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be "test" or "live"' }, { status: 400 });
    }

    // Validate key format if provided
    if (secretKey) {
      if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
        return NextResponse.json(
          { error: 'Invalid secret key format. Must start with sk_test_ or sk_live_' },
          { status: 400 }
        );
      }
    }

    if (publishableKey) {
      if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
        return NextResponse.json(
          { error: 'Invalid publishable key format. Must start with pk_test_ or pk_live_' },
          { status: 400 }
        );
      }
    }

    await updateStripeConfig(
      { secretKey, publishableKey, webhookSecret, mode },
      auth.context.userId
    );

    // Test connection after update
    const connectionTest = await testStripeConnection();

    return NextResponse.json({
      success: true,
      connection: connectionTest,
    });
  } catch (error) {
    console.error('Failed to update Stripe config:', error);
    return NextResponse.json({ error: 'Failed to update Stripe config' }, { status: 500 });
  }
}
