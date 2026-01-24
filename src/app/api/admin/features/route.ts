import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import { getAllFeatureFlags, createFeatureFlag } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/features
 * Get all feature flags
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canManageFeatures');
  if (!auth.success) return auth.response;

  try {
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    logger.error('Failed to get feature flags', { error });
    return NextResponse.json({ error: 'Failed to get feature flags' }, { status: 500 });
  }
}

/**
 * POST /api/admin/features
 * Create a new feature flag
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canManageFeatures');
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
    }

    const flag = await createFeatureFlag(
      {
        name: body.name,
        description: body.description || '',
        isEnabled: body.isEnabled ?? false,
        enabledForTiers: body.enabledForTiers || [],
      },
      auth.context.userId
    );

    return NextResponse.json({ success: true, flag }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create feature flag', { error });
    return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 });
  }
}
