import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import {
  getAllCreditPackages,
  createCreditPackage,
  initializeDefaultCreditPackages,
} from '@/lib/admin/service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/credit-packages
 * Get all credit packages
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminPermission(request, 'canManagePricing');
    if (!auth.success) return auth.response;

    let packages = await getAllCreditPackages();

    // Initialize default packages if none exist
    if (packages.length === 0) {
      await initializeDefaultCreditPackages();
      packages = await getAllCreditPackages();
    }

    return NextResponse.json({ packages });
  } catch (error) {
    logger.error('Failed to get credit packages', { error });
    return NextResponse.json({ error: 'Failed to get credit packages' }, { status: 500 });
  }
}

/**
 * POST /api/admin/credit-packages
 * Create a new credit package
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminPermission(request, 'canManagePricing');
    if (!auth.success) return auth.response;

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'credits', 'price'];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const packageData = {
      name: body.name,
      description: body.description || '',
      credits: body.credits,
      price: body.price,
      currency: body.currency || 'usd',
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured ?? false,
      sortOrder: body.sortOrder ?? 99,
    };

    const newPackage = await createCreditPackage(packageData, auth.context.userId);

    return NextResponse.json({ success: true, package: newPackage }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create credit package', { error });
    return NextResponse.json({ error: 'Failed to create credit package' }, { status: 500 });
  }
}
