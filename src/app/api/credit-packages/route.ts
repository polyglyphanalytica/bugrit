import { NextResponse } from 'next/server';
import {
  getAllCreditPackages,
  initializeDefaultCreditPackages,
} from '@/lib/admin/service';

/**
 * GET /api/credit-packages
 * Get all active credit packages (public endpoint for users)
 */
export async function GET() {
  try {
    let packages = await getAllCreditPackages();

    // Initialize default packages if none exist
    if (packages.length === 0) {
      await initializeDefaultCreditPackages();
      packages = await getAllCreditPackages();
    }

    // Filter to only active packages and remove internal fields
    const publicPackages = packages
      .filter((pkg) => pkg.isActive)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        credits: pkg.credits,
        price: pkg.price,
        currency: pkg.currency,
        isFeatured: pkg.isFeatured,
      }));

    return NextResponse.json({ packages: publicPackages });
  } catch (error) {
    console.error('Failed to get credit packages:', error);
    return NextResponse.json({ error: 'Failed to get credit packages' }, { status: 500 });
  }
}
