/**
 * Auto Top-up Service
 *
 * Automatically purchases credits when a user's balance falls below
 * their configured threshold. Uses saved payment method via Stripe.
 */

import { db } from '@/lib/firebase/admin';
import { getCreditPackage, getStripeSecretKey } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

interface AutoTopupConfig {
  enabled: boolean;
  triggerThreshold: number;
  packageId: string;
  maxPerMonth: number;
  purchasesThisMonth: number;
  lastPurchaseAt?: Date;
  monthResetAt?: Date;
}

interface TopupResult {
  triggered: boolean;
  success?: boolean;
  creditsAdded?: number;
  error?: string;
  reason?: string;
}

/**
 * Check if auto top-up should trigger and execute if needed.
 * Call this after any operation that deducts credits.
 *
 * @param userId - The user's ID
 * @param currentCredits - The user's current credit balance after deduction
 * @returns Result of the auto top-up check/execution
 */
export async function checkAndTriggerAutoTopup(
  userId: string,
  currentCredits: number
): Promise<TopupResult> {
  try {
    // Get user's billing account with auto-topup config
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();

    if (!billingDoc.exists) {
      return { triggered: false, reason: 'No billing account' };
    }

    const billingData = billingDoc.data();
    const autoTopup = billingData?.autoTopup as AutoTopupConfig | undefined;

    // Check if auto-topup is enabled
    if (!autoTopup?.enabled) {
      return { triggered: false, reason: 'Auto top-up not enabled' };
    }

    // Check if credits are below threshold
    if (currentCredits >= autoTopup.triggerThreshold) {
      return { triggered: false, reason: 'Credits above threshold' };
    }

    // Check monthly limit
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reset monthly counter if new month
    let purchasesThisMonth = autoTopup.purchasesThisMonth || 0;
    if (autoTopup.monthResetAt && new Date(autoTopup.monthResetAt) < monthStart) {
      purchasesThisMonth = 0;
    }

    if (purchasesThisMonth >= autoTopup.maxPerMonth) {
      logger.warn('Auto top-up monthly limit reached', {
        userId,
        purchasesThisMonth,
        maxPerMonth: autoTopup.maxPerMonth,
      });
      return {
        triggered: false,
        reason: `Monthly limit reached (${purchasesThisMonth}/${autoTopup.maxPerMonth})`,
      };
    }

    // Get the credit package
    const creditPackage = await getCreditPackage(autoTopup.packageId);
    if (!creditPackage || !creditPackage.isActive) {
      logger.error('Auto top-up package not found or inactive', {
        userId,
        packageId: autoTopup.packageId,
      });
      return { triggered: true, success: false, error: 'Credit package not available' };
    }

    // Get Stripe secret key
    const stripeSecretKey = await getStripeSecretKey();
    if (!stripeSecretKey) {
      logger.error('Stripe not configured for auto top-up', { userId });
      return { triggered: true, success: false, error: 'Payment processing not configured' };
    }

    // Get user's Stripe customer ID and default payment method
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData?.stripeCustomerId) {
      logger.warn('No Stripe customer for auto top-up', { userId });
      return { triggered: true, success: false, error: 'No payment method on file' };
    }

    // Execute the charge
    const result = await executeAutoTopupCharge(
      userId,
      userData.stripeCustomerId,
      creditPackage,
      stripeSecretKey
    );

    if (result.success) {
      // Update billing account with new credits and increment purchase count
      await db.collection('billing_accounts').doc(userId).update({
        'credits.remaining': (billingData?.credits?.remaining || 0) + creditPackage.credits,
        'credits.purchased': (billingData?.credits?.purchased || 0) + creditPackage.credits,
        'autoTopup.purchasesThisMonth': purchasesThisMonth + 1,
        'autoTopup.lastPurchaseAt': now,
        'autoTopup.monthResetAt': monthStart,
      });

      logger.info('Auto top-up successful', {
        userId,
        creditsAdded: creditPackage.credits,
        packageId: creditPackage.id,
        purchasesThisMonth: purchasesThisMonth + 1,
      });

      return {
        triggered: true,
        success: true,
        creditsAdded: creditPackage.credits,
      };
    } else {
      logger.error('Auto top-up charge failed', {
        userId,
        error: result.error,
      });
      return {
        triggered: true,
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    logger.error('Auto top-up error', { userId, error });
    return {
      triggered: true,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute the actual Stripe charge for auto top-up
 */
async function executeAutoTopupCharge(
  userId: string,
  stripeCustomerId: string,
  creditPackage: { id: string; name: string; credits: number; price: number; currency: string },
  stripeSecretKey: string
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  try {
    // Dynamically import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if (customer.deleted) {
      return { success: false, error: 'Customer account deleted' };
    }

    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
      return { success: false, error: 'No default payment method' };
    }

    // Create and confirm payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(creditPackage.price * 100), // Convert to cents
      currency: creditPackage.currency,
      customer: stripeCustomerId,
      payment_method: defaultPaymentMethod as string,
      off_session: true,
      confirm: true,
      metadata: {
        userId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        type: 'auto_topup',
      },
      description: `Auto top-up: ${creditPackage.name} (${creditPackage.credits} credits)`,
    });

    if (paymentIntent.status === 'succeeded') {
      // Record the transaction
      await db.collection('credit_transactions').add({
        userId,
        type: 'auto_topup',
        amount: creditPackage.credits,
        packageId: creditPackage.id,
        packageName: creditPackage.name,
        price: creditPackage.price,
        currency: creditPackage.currency,
        stripePaymentIntentId: paymentIntent.id,
        timestamp: new Date(),
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    } else {
      return { success: false, error: `Payment status: ${paymentIntent.status}` };
    }
  } catch (error) {
    // Handle Stripe errors
    if (error instanceof Error && 'type' in error) {
      const stripeError = error as { type: string; message: string; code?: string };

      // Handle card errors (declined, insufficient funds, etc.)
      if (stripeError.type === 'StripeCardError') {
        return { success: false, error: `Card error: ${stripeError.message}` };
      }

      // Handle authentication required (SCA)
      if (stripeError.code === 'authentication_required') {
        return {
          success: false,
          error: 'Payment requires authentication. Please complete payment manually.',
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Deduct credits and check for auto top-up.
 * Use this function for all credit deductions to ensure auto top-up is triggered.
 *
 * @param userId - The user's ID
 * @param amount - The number of credits to deduct
 * @param reason - Description of why credits are being deducted
 * @param metadata - Additional metadata for the transaction (should include scanId for idempotency)
 * @returns The remaining credits after deduction and any auto top-up
 */
export async function deductCreditsWithAutoTopup(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<{
  success: boolean;
  remainingCredits: number;
  autoTopupTriggered: boolean;
  autoTopupResult?: TopupResult;
  error?: string;
  alreadyProcessed?: boolean;
}> {
  try {
    // IDEMPOTENCY CHECK: If scanId is provided, check if this scan was already billed
    const scanId = metadata?.scanId as string | undefined;
    if (scanId) {
      const existingBillingSnapshot = await db
        .collection('scan_billing')
        .where('scanId', '==', scanId)
        .limit(1)
        .get();

      if (!existingBillingSnapshot.empty) {
        // This scan was already billed - return the previous result
        const existingBilling = existingBillingSnapshot.docs[0].data();
        logger.info('Idempotent deduction: scan already billed', {
          userId,
          scanId,
          previousCreditsCharged: existingBilling.creditsCharged,
        });
        return {
          success: true,
          remainingCredits: existingBilling.balanceAfter || 0,
          autoTopupTriggered: existingBilling.autoTopupTriggered || false,
          alreadyProcessed: true,
        };
      }
    }

    // Get current billing account
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();

    if (!billingDoc.exists) {
      return {
        success: false,
        remainingCredits: 0,
        autoTopupTriggered: false,
        error: 'No billing account found',
      };
    }

    const billingData = billingDoc.data();
    const currentCredits = billingData?.credits?.remaining || 0;

    // Check if user has enough credits
    if (currentCredits < amount) {
      // Check for overage allowance
      const tierConfig = billingData?.tierConfig;
      if (!tierConfig?.overageRate) {
        return {
          success: false,
          remainingCredits: currentCredits,
          autoTopupTriggered: false,
          error: 'Insufficient credits',
        };
      }
      // Allow overage - will be billed at end of period
    }

    // Deduct credits
    const newBalance = currentCredits - amount;

    await db.collection('billing_accounts').doc(userId).update({
      'credits.remaining': newBalance,
      'credits.used': (billingData?.credits?.used || 0) + amount,
    });

    // Record transaction with idempotency key
    const transactionData = {
      userId,
      type: 'deduction',
      amount: -amount,
      balanceAfter: newBalance,
      reason,
      metadata,
      timestamp: new Date(),
      ...(scanId ? { idempotencyKey: `scan_${scanId}` } : {}),
    };

    await db.collection('credit_transactions').add(transactionData);

    // Check and trigger auto top-up if needed
    const autoTopupResult = await checkAndTriggerAutoTopup(userId, newBalance);

    // Get final balance (may have changed due to auto top-up)
    let finalBalance = newBalance;
    if (autoTopupResult.success && autoTopupResult.creditsAdded) {
      finalBalance = newBalance + autoTopupResult.creditsAdded;
    }

    return {
      success: true,
      remainingCredits: finalBalance,
      autoTopupTriggered: autoTopupResult.triggered,
      autoTopupResult,
    };
  } catch (error) {
    logger.error('Credit deduction error', { userId, amount, error });
    return {
      success: false,
      remainingCredits: 0,
      autoTopupTriggered: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
