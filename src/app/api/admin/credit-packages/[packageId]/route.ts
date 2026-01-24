import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import {
  getCreditPackage,
  updateCreditPackage,
  deleteCreditPackage,
} from '@/lib/admin/service';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ packageId: string }>;
}

/**
 * GET /api/admin/credit-packages/[packageId]
 * Get a specific credit package
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  const { packageId } = await context.params;

  try {
    const pkg = await getCreditPackage(packageId);

    if (!pkg) {
      return NextResponse.json({ error: 'Credit package not found' }, { status: 404 });
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    logger.error('Failed to get credit package', { error });
    return NextResponse.json({ error: 'Failed to get credit package' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/credit-packages/[packageId]
 * Update a credit package
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  const { packageId } = await context.params;

  try {
    const body = await request.json();

    // Check if package exists
    const existing = await getCreditPackage(packageId);
    if (!existing) {
      return NextResponse.json({ error: 'Credit package not found' }, { status: 404 });
    }

    await updateCreditPackage(packageId, body, auth.context.userId);

    const updated = await getCreditPackage(packageId);
    return NextResponse.json({ success: true, package: updated });
  } catch (error) {
    logger.error('Failed to update credit package', { error });
    return NextResponse.json({ error: 'Failed to update credit package' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/credit-packages/[packageId]
 * Delete a credit package
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminPermission(request, 'canManagePricing');
  if (!auth.success) return auth.response;

  const { packageId } = await context.params;

  try {
    // Check if package exists
    const existing = await getCreditPackage(packageId);
    if (!existing) {
      return NextResponse.json({ error: 'Credit package not found' }, { status: 404 });
    }

    await deleteCreditPackage(packageId, auth.context.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete credit package', { error });
    return NextResponse.json({ error: 'Failed to delete credit package' }, { status: 500 });
  }
}
