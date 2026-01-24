import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/subscriptions/stripe';
import { db } from '@/lib/firebase/admin';
import { TierName } from '@/lib/subscriptions/tiers';
import Stripe from 'stripe';
import {
  handlePaymentFailure as createDunningState,
  resolvePaymentSuccess,
} from '@/lib/billing/dunning';
import { logger } from '@/lib/logger';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * This handler processes:
 * - Subscription checkouts (mode: subscription)
 * - Credit purchases (mode: payment with type: credit_purchase)
 * - Subscription lifecycle events
 * - Invoice events for recurring billing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = constructWebhookEvent(body, signature);

    // Check idempotency - prevent duplicate processing
    const eventProcessed = await checkEventProcessed(event.id);
    if (eventProcessed) {
      logger.info('Event already processed, skipping', { eventId: event.id });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        // invoice.paid is the canonical event for successful payment (per Stripe docs)
        // It fires after payment_succeeded and confirms the invoice is fully paid
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        // Keep for backwards compatibility, but invoice.paid is preferred
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_action_required':
        // 3D Secure or SCA authentication required
        await handlePaymentActionRequired(event.data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        // Handle refund notifications
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        // Handle chargeback/dispute notifications
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        // Handle dispute resolution
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      default:
        logger.debug('Unhandled event type', { eventType: event.type });
    }

    // Mark event as processed for idempotency
    await markEventProcessed(event.id, event.type);

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error });
    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Check if a webhook event has already been processed (idempotency)
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  const doc = await db.collection('stripeEvents').doc(eventId).get();
  return doc.exists;
}

/**
 * Mark a webhook event as processed (idempotency)
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await db.collection('stripeEvents').doc(eventId).set({
    eventType,
    processedAt: new Date(),
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Determine the type of checkout
  const checkoutType = session.metadata?.type;

  if (checkoutType === 'credit_purchase') {
    await handleCreditPurchase(session);
  } else {
    // Default: subscription checkout
    await handleSubscriptionCheckout(session);
  }
}

/**
 * Handle subscription checkout completion
 */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const tier = session.metadata?.tier as TierName;
  const stripeCustomerId = session.customer as string;

  if (!userId) {
    // Critical error - throw to trigger 500 response and Stripe retry
    throw new Error(`No user ID in checkout session ${session.id}. Cannot fulfill subscription.`);
  }

  if (!tier) {
    throw new Error(`No tier in checkout session ${session.id}. Cannot fulfill subscription.`);
  }

  // Use batch write to update all collections atomically
  const batch = db.batch();

  // Update subscriptions collection (primary subscription data)
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier,
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId: session.subscription as string,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection (for quick tier lookups and auto-topup)
  batch.set(
    db.collection('users').doc(userId),
    {
      tier,
      stripeCustomerId,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update billing_accounts collection (for settings page)
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier,
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId: session.subscription as string,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await batch.commit();

  logger.info('Subscription created', { userId, tier });
}

/**
 * Handle credit package purchase completion
 */
async function handleCreditPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const credits = parseInt(session.metadata?.credits || '0', 10);
  const packageId = session.metadata?.packageId;
  const stripeCustomerId = session.customer as string;

  if (!userId) {
    throw new Error(`No user ID in credit purchase session ${session.id}. Cannot fulfill credits.`);
  }

  if (!credits || credits <= 0) {
    throw new Error(`Invalid credits amount in session ${session.id}: ${credits}`);
  }

  // Use batch write to update credits AND save customer ID for billing portal access
  const batch = db.batch();

  // Get current billing data for credit calculation
  const billingRef = db.collection('billing_accounts').doc(userId);
  const billingDoc = await billingRef.get();
  const billingData = billingDoc.exists ? billingDoc.data() : {};
  const currentPurchased = billingData?.credits?.purchased || 0;
  const currentRemaining = billingData?.credits?.remaining || 0;

  // Update billing_accounts collection
  batch.set(
    billingRef,
    {
      credits: {
        purchased: currentPurchased + credits,
        remaining: currentRemaining + credits,
        lastPurchaseAt: new Date(),
        lastPurchaseAmount: credits,
        lastPurchasePackageId: packageId,
      },
      stripeCustomerId,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection with stripeCustomerId for billing portal access
  if (stripeCustomerId) {
    batch.set(
      db.collection('users').doc(userId),
      {
        stripeCustomerId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  await batch.commit();

  // Record the purchase for audit
  await db.collection('creditPurchases').add({
    userId,
    packageId,
    credits,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    stripeCustomerId,
    amount: session.amount_total,
    currency: session.currency,
    purchasedAt: new Date(),
  });

  logger.info('Credit purchase completed', { userId, credits });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  // Default to 'starter' (lowest paid tier) if metadata missing - safer than 'free' which would downgrade paid users
  const tier = (subscription.metadata.tier as TierName) || 'starter';
  if (!subscription.metadata.tier) {
    logger.warn('Subscription missing tier metadata in update, defaulting to starter', { subscriptionId: subscription.id });
  }

  if (!userId) {
    // Log but don't throw - subscription may have been created outside our app
    logger.warn('No user ID in subscription metadata, skipping update', { subscriptionId: subscription.id });
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'incomplete', // 3D Secure pending
    incomplete_expired: 'canceled', // 3D Secure timed out
  };

  const status = statusMap[subscription.status] || 'active';
  // In Stripe v20, period info is on the subscription items, not the subscription itself
  const firstItem = subscription.items?.data?.[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000)
    : new Date();
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date();

  // Use batch write to update all collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier,
      status,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection
  batch.set(
    db.collection('users').doc(userId),
    {
      tier,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await batch.commit();

  logger.info('Subscription updated', { userId, tier, status: subscription.status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    logger.warn('No user ID in deleted subscription metadata, skipping', { subscriptionId: subscription.id });
    return;
  }

  const now = new Date();

  // Use batch write to update all collections
  const batch = db.batch();

  // Update subscriptions collection - clear all subscription-related fields
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier: 'free',
      status: 'canceled',
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
      canceledAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // Update users collection
  batch.set(
    db.collection('users').doc(userId),
    {
      tier: 'free',
      updatedAt: now,
    },
    { merge: true }
  );

  // Update billing_accounts collection - clear all subscription-related fields
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier: 'free',
        status: 'canceled',
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: null,
        canceledAt: now,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  logger.info('Subscription canceled', { userId });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionId = (invoice.parent?.subscription_details?.subscription as string) || null;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const userId = doc.id;
  const now = new Date();

  // Use batch to update both collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.update(doc.ref, {
    scansUsedThisMonth: 0,
    lastPaymentAt: now,
    status: 'active',
    updatedAt: now,
  });

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'active',
        lastPaymentAt: now,
      },
      credits: {
        used: 0, // Reset usage on new billing period
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  logger.info('Payment succeeded', { subscriptionId });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionId = (invoice.parent?.subscription_details?.subscription as string) || null;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const userId = doc.id;
  const now = new Date();

  // Create or update dunning state with 14-day grace period
  // The dunning service handles:
  // - Invoice deduplication (prevents webhook retry inflation)
  // - Grace period tracking
  // - Escalating notifications
  const dunningState = await createDunningState(userId, subscriptionId, invoice.id);

  // Update subscription status to past_due
  const batch = db.batch();

  batch.update(doc.ref, {
    status: 'past_due',
    lastPaymentFailedAt: now,
    paymentFailureCount: dunningState?.failureCount || 1,
    // Track grace period expiry for UI display
    gracePeriodExpiresAt: dunningState?.expiresAt,
    updatedAt: now,
  });

  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'past_due',
        lastPaymentFailedAt: now,
        paymentFailureCount: dunningState?.failureCount || 1,
        gracePeriodExpiresAt: dunningState?.expiresAt,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  // Log the event for monitoring
  await db.collection('payment_events').add({
    userId,
    type: 'payment_failed',
    subscriptionId,
    invoiceId: invoice.id,
    failureCount: dunningState?.failureCount || 1,
    gracePeriodExpiresAt: dunningState?.expiresAt,
    createdAt: now,
  });

  logger.warn('Payment failed', { subscriptionId, attempt: dunningState?.failureCount || 1 });
}

/**
 * Handle invoice.paid event - the canonical payment confirmation event.
 * This is more reliable than payment_succeeded as it confirms the invoice is fully paid.
 *
 * Also resolves any active dunning state (grace period) for this user.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In Stripe v20, subscription is accessed via parent.subscription_details
  const subscriptionId = (invoice.parent?.subscription_details?.subscription as string) || null;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const userId = doc.id;
  const now = new Date();

  // Resolve any active dunning state (14-day grace period)
  // This uses a transaction to prevent race conditions with expiry processing
  const wasInDunning = await resolvePaymentSuccess(userId, invoice.id);

  // Use batch to update both collections
  const batch = db.batch();

  // Update subscriptions collection - clear failure tracking, confirm active status
  batch.update(doc.ref, {
    status: 'active',
    lastPaymentAt: now,
    lastPaymentFailedAt: null,
    paymentFailureCount: 0,
    gracePeriodExpiresAt: null, // Clear grace period
    updatedAt: now,
  });

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'active',
        lastPaymentAt: now,
        lastPaymentFailedAt: null,
        paymentFailureCount: 0,
        gracePeriodExpiresAt: null,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  logger.info('Invoice paid', { subscriptionId, recoveredFromDunning: wasInDunning });
}

/**
 * Handle invoice.payment_action_required event
 * This fires when 3D Secure or SCA authentication is required
 */
async function handlePaymentActionRequired(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice.parent?.subscription_details?.subscription as string) || null;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const userId = doc.id;
  const now = new Date();

  // Update status to reflect authentication needed
  const batch = db.batch();

  batch.update(doc.ref, {
    status: 'incomplete',
    paymentActionRequired: true,
    paymentActionRequiredAt: now,
    updatedAt: now,
  });

  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'incomplete',
        paymentActionRequired: true,
        paymentActionRequiredAt: now,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // Create notification for user
  await db.collection('notifications').add({
    userId,
    type: 'payment_action_required',
    title: 'Payment Authentication Required',
    message: 'Your payment requires additional authentication. Please complete the verification to continue your subscription.',
    actionUrl: '/settings/subscription',
    read: false,
    createdAt: now,
  });

  await batch.commit();

  logger.info('Payment action required', { subscriptionId, userId });
}

/**
 * Handle charge.refunded event
 * Tracks refunds for credits or subscription payments
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = charge.customer as string;
  const refundAmount = charge.amount_refunded;
  const now = new Date();

  if (!customerId) return;

  // Find user by customer ID
  const snapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.warn('No user found for customer in refund event', { customerId });
    return;
  }

  const userId = snapshot.docs[0].id;

  // Record the refund
  await db.collection('refunds').add({
    userId,
    stripeChargeId: charge.id,
    stripeCustomerId: customerId,
    amountRefunded: refundAmount,
    currency: charge.currency,
    reason: charge.refunds?.data?.[0]?.reason || 'unknown',
    status: charge.refunded ? 'full' : 'partial',
    createdAt: now,
  });

  // Create notification for user
  await db.collection('notifications').add({
    userId,
    type: 'refund_processed',
    title: 'Refund Processed',
    message: `A refund of $${(refundAmount / 100).toFixed(2)} has been processed to your payment method.`,
    read: false,
    createdAt: now,
  });

  logger.info('Refund processed', { userId, refundAmountCents: refundAmount });
}

/**
 * Handle charge.dispute.created event
 * Critical event - chargebacks can be costly and require attention
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = dispute.charge as string;
  const amount = dispute.amount;
  const reason = dispute.reason;
  const now = new Date();

  // Record the dispute
  const disputeRecord = await db.collection('disputes').add({
    stripeDisputeId: dispute.id,
    stripeChargeId: chargeId,
    amount,
    currency: dispute.currency,
    reason,
    status: dispute.status,
    evidenceDueBy: dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000)
      : null,
    createdAt: now,
  });

  // Create alert for admins
  await db.collection('admin_alerts').add({
    type: 'dispute_created',
    severity: 'critical',
    title: 'New Chargeback/Dispute',
    message: `A dispute of $${(amount / 100).toFixed(2)} has been filed. Reason: ${reason}`,
    disputeId: disputeRecord.id,
    stripeDisputeId: dispute.id,
    requiresAction: true,
    createdAt: now,
  });

  logger.error('CRITICAL: Dispute created', { disputeId: dispute.id, amountCents: amount, reason });
}

/**
 * Handle charge.dispute.closed event
 * Tracks dispute resolution
 */
async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const now = new Date();

  // Update the dispute record
  const disputeSnapshot = await db
    .collection('disputes')
    .where('stripeDisputeId', '==', dispute.id)
    .limit(1)
    .get();

  if (!disputeSnapshot.empty) {
    await disputeSnapshot.docs[0].ref.update({
      status: dispute.status,
      closedAt: now,
      won: dispute.status === 'won',
      updatedAt: now,
    });
  }

  // Update admin alert
  const alertSnapshot = await db
    .collection('admin_alerts')
    .where('stripeDisputeId', '==', dispute.id)
    .limit(1)
    .get();

  if (!alertSnapshot.empty) {
    await alertSnapshot.docs[0].ref.update({
      requiresAction: false,
      resolvedAt: now,
      resolution: dispute.status,
    });
  }

  logger.info('Dispute closed', { disputeId: dispute.id, status: dispute.status });
}
