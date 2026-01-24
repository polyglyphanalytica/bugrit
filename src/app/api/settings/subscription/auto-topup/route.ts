/**
 * POST /api/settings/subscription/auto-topup
 *
 * Configure automatic credit purchases when balance falls below a threshold.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, errorResponse } from '@/lib/api-auth';
import { db } from '@/lib/firebase/admin';
import { getCreditPackage } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    // Parse request body
    const body = await req.json();
    const { enabled, triggerThreshold, packageId, maxPerMonth } = body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return errorResponse('enabled must be a boolean', 400);
    }

    if (enabled) {
      if (typeof triggerThreshold !== 'number' || triggerThreshold < 1) {
        return errorResponse('triggerThreshold must be a positive number', 400);
      }

      if (!packageId || typeof packageId !== 'string') {
        return errorResponse('packageId is required when enabling auto-topup', 400);
      }

      if (typeof maxPerMonth !== 'number' || maxPerMonth < 1 || maxPerMonth > 10) {
        return errorResponse('maxPerMonth must be between 1 and 10', 400);
      }

      // Verify the package exists and is active
      const creditPackage = await getCreditPackage(packageId);
      if (!creditPackage) {
        return errorResponse('Credit package not found', 404);
      }

      if (!creditPackage.isActive) {
        return errorResponse('Credit package is not active', 400);
      }

      // Check if user has a payment method on file (via Stripe customer)
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      if (!userData?.stripeCustomerId) {
        return errorResponse(
          'Auto top-up requires a payment method. Please add a payment method first.',
          400
        );
      }
    }

    // Get current auto-topup settings to preserve purchasesThisMonth
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();
    const currentAutoTopup = billingDoc.exists ? billingDoc.data()?.autoTopup : null;

    // Update auto-topup settings
    const autoTopupSettings = {
      enabled,
      triggerThreshold: enabled ? triggerThreshold : 10,
      packageId: enabled ? packageId : '',
      maxPerMonth: enabled ? maxPerMonth : 3,
      purchasesThisMonth: currentAutoTopup?.purchasesThisMonth || 0,
      updatedAt: new Date(),
    };

    await db.collection('billing_accounts').doc(userId).set(
      { autoTopup: autoTopupSettings },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      autoTopup: {
        enabled: autoTopupSettings.enabled,
        triggerThreshold: autoTopupSettings.triggerThreshold,
        packageId: autoTopupSettings.packageId,
        maxPerMonth: autoTopupSettings.maxPerMonth,
      },
    });
  } catch (error) {
    logger.error('Auto-topup settings error', { error });
    return errorResponse('Failed to update auto-topup settings', 500);
  }
}
