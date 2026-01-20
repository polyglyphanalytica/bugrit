import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import {
  getAllPricingConfigs,
  createPricingTier,
  initializeDefaultPricing,
} from '@/lib/admin/service';
import { PricingConfig } from '@/lib/admin/types';

/**
 * GET /api/admin/pricing
 * Get all pricing tiers
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  try {
    let tiers = await getAllPricingConfigs();

    // Initialize default pricing if none exists
    if (tiers.length === 0) {
      await initializeDefaultPricing();
      tiers = await getAllPricingConfigs();
    }

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Failed to get pricing:', error);
    return NextResponse.json({ error: 'Failed to get pricing' }, { status: 500 });
  }
}

/**
 * POST /api/admin/pricing
 * Create a new pricing tier
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['tierName', 'displayName', 'priceMonthly'];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate tierName format
    if (!/^[a-z][a-z0-9_]*$/.test(body.tierName)) {
      return NextResponse.json(
        { error: 'Tier name must start with a letter and contain only lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    const tierConfig: PricingConfig = {
      tierName: body.tierName,
      displayName: body.displayName,
      description: body.description || '',
      isActive: body.isActive ?? true,
      priceMonthly: body.priceMonthly,
      priceYearly: body.priceYearly ?? body.priceMonthly * 10,
      currency: body.currency || 'usd',
      sortOrder: body.sortOrder ?? 99,
      limits: body.limits || {
        scansPerMonth: 10,
        projects: 3,
        teamMembers: 1,
        historyDays: 30,
        platforms: { web: true, mobile: false, desktop: false },
      },
      features: body.features || {
        aiReports: true,
        customRules: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabeling: false,
        ssoIntegration: false,
      },
    };

    await createPricingTier(tierConfig, auth.context.userId);

    return NextResponse.json({ success: true, tier: tierConfig }, { status: 201 });
  } catch (error) {
    console.error('Failed to create pricing tier:', error);
    return NextResponse.json({ error: 'Failed to create pricing tier' }, { status: 500 });
  }
}
