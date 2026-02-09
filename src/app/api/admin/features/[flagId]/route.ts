import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import { getFeatureFlag, updateFeatureFlag, deleteFeatureFlag } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ flagId: string }>;
}

/**
 * GET /api/admin/features/[flagId]
 * Get a specific feature flag
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageFeatures');
    if (!auth.success) return auth.response;

    const { flagId } = await params;
    const flag = await getFeatureFlag(flagId);

    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    return NextResponse.json({ flag });
  } catch (error) {
    logger.error('Failed to get feature flag', { error });
    return NextResponse.json({ error: 'Failed to get feature flag' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/features/[flagId]
 * Update a feature flag
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageFeatures');
    if (!auth.success) return auth.response;

    const { flagId } = await params;
    const body = await request.json();

    const existing = await getFeatureFlag(flagId);
    if (!existing) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    // Only allow known fields to prevent arbitrary field injection
    const allowedFields = ['name', 'description', 'enabled', 'percentage', 'userIds', 'tiers', 'startDate', 'endDate'];
    const sanitizedBody: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) sanitizedBody[key] = body[key];
    }

    await updateFeatureFlag(flagId, sanitizedBody, auth.context.userId);

    const updated = await getFeatureFlag(flagId);

    return NextResponse.json({ success: true, flag: updated });
  } catch (error) {
    logger.error('Failed to update feature flag', { error });
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/features/[flagId]
 * Delete a feature flag
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageFeatures');
    if (!auth.success) return auth.response;

    const { flagId } = await params;

    const existing = await getFeatureFlag(flagId);
    if (!existing) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    await deleteFeatureFlag(flagId, auth.context.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete feature flag', { error });
    return NextResponse.json({ error: 'Failed to delete feature flag' }, { status: 500 });
  }
}
