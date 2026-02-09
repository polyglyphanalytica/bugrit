/**
 * Dunning Service
 *
 * Handles payment failure grace periods and subscription recovery.
 *
 * Key Features:
 * - 14-day grace period after payment failure
 * - Invoice deduplication to prevent webhook retry inflation
 * - Escalating reminder notifications
 * - Transaction-protected grace period expiry
 * - Plan change blocking during dunning
 *
 * Flow:
 * 1. Payment fails → createDunningState()
 * 2. Reminders sent → sendScheduledReminders() (cron job)
 * 3. Payment succeeds → resolvePaymentSuccess()
 * 4. Grace expires → processExpiredGracePeriods() with transaction protection
 */

import { db, FieldValue } from '@/lib/firebase/admin';
import {
  DunningState,
  GRACE_PERIOD_DAYS,
  DUNNING_REMINDER_SCHEDULE,
  DunningReminderConfig,
} from './types';
import { logger } from '@/lib/logger';
import { getStripeSecretKey } from '@/lib/admin/service';

const DUNNING_COLLECTION = 'dunning_states';

/**
 * Create or update dunning state when payment fails
 *
 * Uses invoice deduplication to prevent webhook retry inflation
 */
export async function handlePaymentFailure(
  userId: string,
  subscriptionId: string,
  invoiceId: string
): Promise<DunningState | null> {
  const now = new Date();

  // Check for existing dunning state
  const existingSnapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    const doc = existingSnapshot.docs[0];
    const existing = doc.data() as DunningState;

    // Check if this invoice was already processed (deduplication)
    if (existing.processedInvoiceIds?.includes(invoiceId)) {
      logger.info('Invoice already processed in dunning state', {
        userId,
        invoiceId,
        dunningId: doc.id,
      });
      return existing;
    }

    // Update existing dunning state with new failure
    await doc.ref.update({
      failureCount: FieldValue.increment(1),
      lastFailedAt: now,
      processedInvoiceIds: FieldValue.arrayUnion(invoiceId),
      updatedAt: now,
    });

    logger.info('Updated dunning state with new failure', {
      userId,
      invoiceId,
      newFailureCount: existing.failureCount + 1,
    });

    return {
      ...existing,
      failureCount: existing.failureCount + 1,
      lastFailedAt: now,
      processedInvoiceIds: [...(existing.processedInvoiceIds || []), invoiceId],
    };
  }

  // Create new dunning state
  const expiresAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const dunningState: Omit<DunningState, 'userId'> & { userId: string; createdAt: Date; updatedAt: Date } = {
    userId,
    subscriptionId,
    invoiceId,
    startedAt: now,
    expiresAt,
    failureCount: 1,
    lastFailedAt: now,
    processedInvoiceIds: [invoiceId],
    remindersSent: 0,
    reminderLevel: 'active',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(DUNNING_COLLECTION).add(dunningState);

  logger.info('Created new dunning state', {
    userId,
    invoiceId,
    dunningId: docRef.id,
    expiresAt: expiresAt.toISOString(),
  });

  // Send initial notification
  await sendDunningNotification(userId, DUNNING_REMINDER_SCHEDULE[0], subscriptionId);

  return dunningState as DunningState;
}

/**
 * Resolve dunning state when payment succeeds
 *
 * Uses transaction to prevent race condition with expiry processing
 */
export async function resolvePaymentSuccess(
  userId: string,
  invoiceId: string
): Promise<boolean> {
  const now = new Date();

  // Find active dunning state
  const snapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.info('No active dunning state to resolve', { userId, invoiceId });
    return false;
  }

  const doc = snapshot.docs[0];

  // Use transaction to ensure atomicity
  await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(doc.ref);
    const freshData = freshDoc.data() as DunningState;

    // Already resolved (possibly by another process)
    if (freshData.status !== 'active') {
      logger.info('Dunning state already resolved', {
        userId,
        status: freshData.status,
      });
      return;
    }

    transaction.update(doc.ref, {
      status: 'resolved',
      resolvedAt: now,
      resolution: 'payment_success',
      updatedAt: now,
    });
  });

  logger.info('Resolved dunning state on payment success', {
    userId,
    invoiceId,
    dunningId: doc.id,
  });

  // Clear failure tracking on subscription
  await clearSubscriptionFailureState(userId);

  // Send success notification
  await db.collection('notifications').add({
    userId,
    type: 'payment_recovered',
    title: 'Payment Successful',
    message: 'Your payment has been processed successfully. Your subscription is now active.',
    read: false,
    createdAt: now,
  });

  return true;
}

/**
 * Process expired grace periods
 *
 * Called by cron job. Uses transaction to prevent race conditions
 * where payment could arrive between query and cancellation.
 */
export async function processExpiredGracePeriods(): Promise<number> {
  const now = new Date();
  let processedCount = 0;

  // Find all expired dunning states
  const snapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('status', '==', 'active')
    .where('expiresAt', '<=', now)
    .get();

  for (const doc of snapshot.docs) {
    try {
      let cancelledUserId: string | undefined;
      let cancelledSubscriptionId: string | undefined;

      // Use transaction to re-check status before canceling in Firestore
      await db.runTransaction(async (transaction) => {
        const freshDoc = await transaction.get(doc.ref);
        const freshData = freshDoc.data() as DunningState;

        // Skip if already resolved (payment came in during processing)
        if (freshData.status !== 'active') {
          logger.info('Skipping dunning state - already resolved', {
            userId: freshData.userId,
            status: freshData.status,
          });
          return;
        }

        // Double-check expiry
        if (new Date(freshData.expiresAt) > now) {
          logger.info('Skipping dunning state - not yet expired', {
            userId: freshData.userId,
            expiresAt: freshData.expiresAt,
          });
          return;
        }

        // Mark as expired
        transaction.update(doc.ref, {
          status: 'expired',
          resolvedAt: now,
          resolution: 'subscription_canceled',
          updatedAt: now,
        });

        // Cancel the subscription in Firestore (within transaction)
        await cancelSubscriptionForNonPayment(
          transaction,
          freshData.userId,
          freshData.subscriptionId
        );

        // Track for Stripe API cancellation after transaction commits
        cancelledUserId = freshData.userId;
        cancelledSubscriptionId = freshData.subscriptionId;
      });

      // Cancel the subscription in Stripe API AFTER Firestore transaction commits.
      // This is done outside the transaction because Stripe is an external service
      // that can't participate in Firestore transactions.
      if (cancelledSubscriptionId) {
        try {
          await cancelSubscriptionInStripe(cancelledSubscriptionId);
        } catch (stripeError) {
          // Log but don't fail — Firestore state is already correct.
          // Stripe will eventually stop retrying on its own, or the subscription
          // will be in an inconsistent state that can be resolved manually.
          logger.error('Failed to cancel subscription in Stripe after dunning expiry', {
            userId: cancelledUserId,
            subscriptionId: cancelledSubscriptionId,
            error: stripeError,
          });
        }
      }

      processedCount++;
      logger.info('Processed expired grace period', {
        dunningId: doc.id,
        userId: doc.data().userId,
      });
    } catch (error) {
      logger.error('Failed to process expired grace period', {
        dunningId: doc.id,
        error,
      });
    }
  }

  return processedCount;
}

/**
 * Cancel subscription due to non-payment
 *
 * Called within a transaction to ensure atomicity
 */
async function cancelSubscriptionForNonPayment(
  transaction: FirebaseFirestore.Transaction,
  userId: string,
  subscriptionId: string
): Promise<void> {
  const now = new Date();

  // Update subscriptions collection
  const subscriptionRef = db.collection('subscriptions').doc(userId);
  transaction.update(subscriptionRef, {
    tier: 'free',
    status: 'canceled',
    canceledAt: now,
    cancelReason: 'payment_failure',
    updatedAt: now,
  });

  // Update users collection
  const userRef = db.collection('users').doc(userId);
  transaction.update(userRef, {
    tier: 'free',
    updatedAt: now,
  });

  // Update billing_accounts collection
  const billingRef = db.collection('billing_accounts').doc(userId);
  transaction.set(
    billingRef,
    {
      subscription: {
        tier: 'free',
        status: 'canceled',
        canceledAt: now,
        cancelReason: 'payment_failure',
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // Create notification (outside transaction since it's not critical)
  db.collection('notifications').add({
    userId,
    type: 'subscription_canceled_nonpayment',
    title: 'Subscription Canceled',
    message:
      'Your subscription has been canceled due to non-payment. Please resubscribe to regain access to premium features.',
    actionUrl: '/settings/subscription',
    actionLabel: 'Resubscribe',
    read: false,
    createdAt: now,
  });

  logger.warn('Subscription canceled for non-payment', {
    userId,
    subscriptionId,
  });
}

/**
 * Send scheduled dunning reminders
 *
 * Called by cron job to send escalating reminders
 */
export async function sendScheduledReminders(): Promise<number> {
  const now = new Date();
  let sentCount = 0;

  // Find all active dunning states
  const snapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('status', '==', 'active')
    .get();

  for (const doc of snapshot.docs) {
    const dunning = doc.data() as DunningState;
    const daysSinceStart = Math.floor(
      (now.getTime() - new Date(dunning.startedAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    // Find the appropriate reminder level
    const reminder = DUNNING_REMINDER_SCHEDULE.find(
      (r) => r.daysSinceStart <= daysSinceStart && r.level !== dunning.reminderLevel
    );

    // Check if we should send this reminder
    if (reminder && shouldSendReminder(dunning, reminder, daysSinceStart)) {
      try {
        await sendDunningNotification(dunning.userId, reminder, dunning.subscriptionId);

        await doc.ref.update({
          reminderLevel: reminder.level,
          remindersSent: dunning.remindersSent + 1,
          lastReminderAt: now,
          updatedAt: now,
        });

        sentCount++;
        logger.info('Sent dunning reminder', {
          userId: dunning.userId,
          level: reminder.level,
          daysSinceStart,
        });
      } catch (error) {
        logger.error('Failed to send dunning reminder', {
          userId: dunning.userId,
          error,
        });
      }
    }
  }

  return sentCount;
}

/**
 * Check if a reminder should be sent based on current state
 */
function shouldSendReminder(
  dunning: DunningState,
  reminder: DunningReminderConfig,
  daysSinceStart: number
): boolean {
  // Don't send more than 4 total reminders
  if (dunning.remindersSent >= 4) return false;

  // Check if this level was already sent
  const levelOrder = ['active', 'warning', 'final'];
  const currentLevelIndex = levelOrder.indexOf(dunning.reminderLevel);
  const newLevelIndex = levelOrder.indexOf(reminder.level);

  // Only send if it's a higher level than current
  if (newLevelIndex <= currentLevelIndex) return false;

  // Check minimum days threshold
  return daysSinceStart >= reminder.daysSinceStart;
}

/**
 * Send a dunning notification to the user
 */
async function sendDunningNotification(
  userId: string,
  reminder: DunningReminderConfig,
  subscriptionId: string
): Promise<void> {
  const now = new Date();

  await db.collection('notifications').add({
    userId,
    type: `dunning_${reminder.level}`,
    title: reminder.title,
    message: reminder.message,
    severity: reminder.severity,
    actionUrl: '/settings/subscription?updatePayment=true',
    actionLabel: 'Update Payment Method',
    read: false,
    createdAt: now,
    metadata: {
      subscriptionId,
      reminderLevel: reminder.level,
    },
  });
}

/**
 * Clear subscription failure state after successful payment
 */
async function clearSubscriptionFailureState(userId: string): Promise<void> {
  const now = new Date();
  const batch = db.batch();

  // Clear failure tracking on subscriptions
  batch.update(db.collection('subscriptions').doc(userId), {
    status: 'active',
    paymentFailureCount: 0,
    lastPaymentFailedAt: null,
    updatedAt: now,
  });

  // Clear failure tracking on billing_accounts
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'active',
        paymentFailureCount: 0,
        lastPaymentFailedAt: null,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Check if user is in dunning state (for blocking plan changes)
 */
export async function isUserInDunningState(userId: string): Promise<boolean> {
  const snapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Check if subscription status allows plan changes
 */
export async function canChangeSubscriptionPlan(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check if user is in dunning state
  const inDunning = await isUserInDunningState(userId);
  if (inDunning) {
    return {
      allowed: false,
      reason: 'Cannot change plan while payment is past due. Please update your payment method first.',
    };
  }

  // Check subscription status
  const subDoc = await db.collection('subscriptions').doc(userId).get();
  if (!subDoc.exists) {
    return { allowed: true };
  }

  const subData = subDoc.data();
  const status = subData?.status;

  if (status === 'past_due' || status === 'unpaid') {
    return {
      allowed: false,
      reason: 'Cannot change plan while payment is past due. Please update your payment method first.',
    };
  }

  return { allowed: true };
}

/**
 * Get current dunning state for a user
 */
export async function getDunningState(userId: string): Promise<DunningState | null> {
  const snapshot = await db
    .collection(DUNNING_COLLECTION)
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return snapshot.docs[0].data() as DunningState;
}

/**
 * Get grace period info for UI display
 */
export async function getGracePeriodInfo(userId: string): Promise<{
  inGracePeriod: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  reminderLevel: 'active' | 'warning' | 'final' | null;
} | null> {
  const dunning = await getDunningState(userId);

  if (!dunning) {
    return {
      inGracePeriod: false,
      daysRemaining: 0,
      expiresAt: null,
      reminderLevel: null,
    };
  }

  const now = new Date();
  const expiresAt = new Date(dunning.expiresAt);
  const daysRemaining = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  return {
    inGracePeriod: true,
    daysRemaining: Math.max(0, daysRemaining),
    expiresAt,
    reminderLevel: dunning.reminderLevel,
  };
}

/**
 * Cancel a subscription in Stripe API.
 * Called after Firestore dunning expiry to ensure Stripe stops billing.
 */
async function cancelSubscriptionInStripe(subscriptionId: string): Promise<void> {
  const stripeSecretKey = await getStripeSecretKey();
  if (!stripeSecretKey) {
    logger.error('Cannot cancel subscription in Stripe: no secret key configured', { subscriptionId });
    return;
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
  });

  await stripe.subscriptions.cancel(subscriptionId);
  logger.info('Canceled subscription in Stripe', { subscriptionId });
}
